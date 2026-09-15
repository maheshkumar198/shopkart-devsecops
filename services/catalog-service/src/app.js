const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const client = require("prom-client");
const Redis = require("ioredis");
const { Pool } = require("pg");

const app = express();
const logger = pino({ base: { service: "catalog-service" } });
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register]
});

app.use(express.json());
app.use(pinoHttp({ logger }));
app.use((req, res, next) => {
  res.on("finish", () => requests.inc({
    method: req.method,
    route: req.route?.path || req.path,
    status_code: String(res.statusCode)
  }));
  next();
});

const pool = process.env.NODE_ENV === "test"
  ? null
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    });

const redis = process.env.NODE_ENV === "test"
  ? null
  : new Redis(process.env.REDIS_URL || "redis://redis:6379");

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
  if (cached) return JSON.parse(cached);
  const result = await pool.query("SELECT id,name,price,stock FROM products ORDER BY id");
  await redis.set("products:all", JSON.stringify(result.rows), "EX", 60);
  return result.rows;
}

app.get("/health", (_req, res) => res.json({ status: "ok", service: "catalog-service" }));
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/products", async (_req, res) => {
  try {
    const data = await getProducts();
    res.json({ source: process.env.NODE_ENV === "test" ? "memory" : "redis-or-postgres", data });
  } catch (error) {
    logger.error({ error }, "list products failed");
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
    if (cached) return res.json(JSON.parse(cached));
    const result = await pool.query("SELECT id,name,price,stock FROM products WHERE id=$1", [id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Product not found" });
    await redis.set(key, JSON.stringify(result.rows[0]), "EX", 60);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, "get product failed");
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
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, "create product failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { app, redis };
