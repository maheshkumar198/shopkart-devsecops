const crypto = require("crypto");
const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const client = require("prom-client");

const app = express();
const SERVICE_NAME = "catalog-service";
const APP_VERSION = process.env.APP_VERSION || process.env.GIT_SHA || "unknown";
const ENVIRONMENT = process.env.NODE_ENV || "production";

const logger = pino({
  base: { service: SERVICE_NAME, environment: ENVIRONMENT, version: APP_VERSION },
  redact: ["req.headers.authorization", "req.headers.cookie"]
});

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: "shopkart_" });

const requests = new client.Counter({
  name: "shopkart_http_requests_total",
  help: "Total HTTP requests processed by the service",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

const duration = new client.Histogram({
  name: "shopkart_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const inFlight = new client.Gauge({
  name: "shopkart_http_requests_in_flight",
  help: "Current number of HTTP requests being processed",
  registers: [register]
});

const errors = new client.Counter({
  name: "shopkart_http_errors_total",
  help: "Total HTTP responses with status code 400 or higher",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

app.use(express.json());
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
  autoLogging: { ignore: (req) => req.url === "/metrics" },
  customProps: (req) => ({
    requestId: req.id,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    version: APP_VERSION
  }),
  customSuccessMessage: (req, res) => `request completed`,
  customErrorMessage: (req, res, error) => `request failed`,
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  }
}));

app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  inFlight.inc();

  res.on("finish", () => {
    inFlight.dec();
    if (req.path === "/metrics") return;

    const route = req.route?.path || "unmatched";
    const statusCode = String(res.statusCode);
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = { method: req.method, route, status_code: statusCode };

    requests.inc(labels);
    duration.observe(labels, seconds);
    if (res.statusCode >= 400) errors.inc(labels);
  });
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE_NAME }));
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const Redis = require("ioredis");
const { Pool } = require("pg");

const cache = new client.Counter({
  name: "shopkart_catalog_cache_total",
  help: "Catalog cache lookups",
  labelNames: ["result"],
  registers: [register]
});

const productCreates = new client.Counter({
  name: "shopkart_catalog_product_creations_total",
  help: "Products created",
  registers: [register]
});

const pool = process.env.NODE_ENV === "test"
  ? null
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

const redis = process.env.NODE_ENV === "test" ? null : new Redis(process.env.REDIS_URL || "redis://redis:6379");

function seedProducts() {
  return [
    { id: 1, name: "Wireless Mouse", price: 799, stock: 25 },
    { id: 2, name: "Mechanical Keyboard", price: 2499, stock: 15 },
    { id: 3, name: "USB-C Hub", price: 1499, stock: 20 }
  ];
}

async function getProducts() {
  if (process.env.NODE_ENV === "test") return seedProducts();
  const cached = await redis.get("products:all");
  if (cached) { cache.inc({ result: "hit" }); return JSON.parse(cached); }
  cache.inc({ result: "miss" });
  const result = await pool.query("SELECT id,name,price,stock FROM products ORDER BY id");
  await redis.set("products:all", JSON.stringify(result.rows), "EX", 60);
  return result.rows;
}


app.get("/products", async (_req, res) => {
  try {
    const data = await getProducts();
    res.json({ source: process.env.NODE_ENV === "test" ? "memory" : "redis-or-postgres", data });
  } catch (error) {
    logger.error({ err: error }, "list products failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid product id" });

  try {
    if (process.env.NODE_ENV === "test") {
      const product = seedProducts().find(p => p.id === id);
      return product ? res.json(product) : res.status(404).json({ error: "Product not found" });
    }

    const key = `product:${id}`;
    const cached = await redis.get(key);
    if (cached) { cache.inc({ result: "hit" }); return res.json(JSON.parse(cached)); }
    cache.inc({ result: "miss" });
    const result = await pool.query("SELECT id,name,price,stock FROM products WHERE id=$1", [id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Product not found" });
    await redis.set(key, JSON.stringify(result.rows[0]), "EX", 60);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error }, "get product failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/products", async (req, res) => {
  const { name, price, stock = 0 } = req.body || {};
  if (!name || typeof price !== "number" || price < 0 || !Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: "name, non-negative price and integer stock are required" });
  }

  if (process.env.NODE_ENV === "test") {
    return res.status(201).json({ id: 99, name, price, stock });
  }

  try {
    const result = await pool.query(
      "INSERT INTO products(name,price,stock) VALUES($1,$2,$3) RETURNING id,name,price,stock",
      [name, price, stock]
    );
    await redis.del("products:all");
    productCreates.inc();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error }, "create product failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { app, redis };
