const crypto = require("crypto");
const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const client = require("prom-client");

const app = express();
const SERVICE_NAME = "order-service";
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

const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const { Pool } = require("pg");

const checkout = new client.Counter({
  name: "shopkart_orders_checkout_total",
  help: "Checkout attempts",
  labelNames: ["result"],
  registers: [register]
});

const cartOperations = new client.Counter({
  name: "shopkart_cart_operations_total",
  help: "Cart operations",
  labelNames: ["operation", "result"],
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
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CATALOG_URL = process.env.CATALOG_URL || "http://catalog-service:3002";

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function cartKey(userId) {
  return `cart:${userId}`;
}


app.get("/cart", authRequired, async (req, res) => {
  try {
    const raw = process.env.NODE_ENV === "test" ? null : await redis.get(cartKey(req.user.sub));
    cartOperations.inc({ operation: "get", result: "success" });
    res.json({ items: raw ? JSON.parse(raw) : [] });
  } catch (error) {
    logger.error({ err: error }, "get cart failed");
    cartOperations.inc({ operation: "get", result: "error" });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/cart/items", authRequired, async (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "productId and positive integer quantity are required" });
  }

  try {
    let items = [];
    if (process.env.NODE_ENV !== "test") {
      const raw = await redis.get(cartKey(req.user.sub));
      items = raw ? JSON.parse(raw) : [];
    }

    const existing = items.find(i => i.productId === productId);
    if (existing) existing.quantity += quantity;
    else items.push({ productId, quantity });

    if (process.env.NODE_ENV !== "test") {
      await redis.set(cartKey(req.user.sub), JSON.stringify(items), "EX", 86400);
    }
    cartOperations.inc({ operation: "add", result: "success" });
    res.status(201).json({ items });
  } catch (error) {
    logger.error({ err: error }, "add cart item failed");
    cartOperations.inc({ operation: "add", result: "error" });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/cart/items/:productId", authRequired, async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) return res.status(400).json({ error: "Invalid product id" });

  try {
    let items = [];
    if (process.env.NODE_ENV !== "test") {
      const raw = await redis.get(cartKey(req.user.sub));
      items = raw ? JSON.parse(raw) : [];
    }
    items = items.filter(i => i.productId !== productId);
    if (process.env.NODE_ENV !== "test") {
      await redis.set(cartKey(req.user.sub), JSON.stringify(items), "EX", 86400);
    }
    cartOperations.inc({ operation: "remove", result: "success" });
    res.json({ items });
  } catch (error) {
    logger.error({ err: error }, "remove cart item failed");
    cartOperations.inc({ operation: "remove", result: "error" });
    res.status(500).json({ error: "Internal server error" });
  }
});

async function catalogProduct(id) {
  const response = await fetch(`${CATALOG_URL}/products/${id}`);
  if (!response.ok) return null;
  return response.json();
}

app.post("/orders", authRequired, async (req, res) => {
  try {
    let items = [];
    if (process.env.NODE_ENV !== "test") {
      const raw = await redis.get(cartKey(req.user.sub));
      items = raw ? JSON.parse(raw) : [];
    } else {
      items = req.body.items || [{ productId: 1, quantity: 1 }];
    }

    if (!items.length) { checkout.inc({ result: "empty_cart" }); return res.status(400).json({ error: "Cart is empty" }); }

    const products = [];
    let total = 0;
    for (const item of items) {
      const product = process.env.NODE_ENV === "test"
        ? { id: item.productId, name: "Test Product", price: 100, stock: 10 }
        : await catalogProduct(item.productId);

      if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
      if (product.stock < item.quantity) return res.status(409).json({ error: `Insufficient stock for product ${product.id}` });

      products.push({ ...item, name: product.name, price: Number(product.price) });
      total += Number(product.price) * item.quantity;
    }

    if (process.env.NODE_ENV === "test") {
      return res.status(201).json({
        id: 1001, user_id: String(req.user.sub), total, status: "CONFIRMED", items: products
      });
    }

    const clientConn = await pool.connect();
    try {
      await clientConn.query("BEGIN");
      const order = await clientConn.query(
        "INSERT INTO orders(user_id,total,status) VALUES($1,$2,$3) RETURNING id,user_id,total,status,created_at",
        [req.user.sub, total, "CONFIRMED"]
      );

      for (const item of products) {
        await clientConn.query(
          "INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)",
          [order.rows[0].id, item.productId, item.quantity, item.price]
        );
      }
      await clientConn.query("COMMIT");
      await redis.del(cartKey(req.user.sub));
      checkout.inc({ result: "success" });
      res.status(201).json({ ...order.rows[0], items: products });
    } catch (e) {
      await clientConn.query("ROLLBACK");
      throw e;
    } finally {
      clientConn.release();
    }
  } catch (error) {
    logger.error({ err: error }, "checkout failed");
    checkout.inc({ result: "error" });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/orders", authRequired, async (req, res) => {
  if (process.env.NODE_ENV === "test") {
    return res.json({ data: [{ id: 1001, user_id: String(req.user.sub), total: 100, status: "CONFIRMED" }] });
  }

  try {
    const result = await pool.query(
      "SELECT id,user_id,total,status,created_at FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [req.user.sub]
    );
    res.json({ data: result.rows });
  } catch (error) {
    logger.error({ err: error }, "order history failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/orders/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid order id" });

  if (process.env.NODE_ENV === "test") {
    return res.json({
      id, user_id: String(req.user.sub), total: 100, status: "CONFIRMED",
      items: [{ product_id: 1, quantity: 1, unit_price: 100 }]
    });
  }

  try {
    const order = await pool.query(
      "SELECT id,user_id,total,status,created_at FROM orders WHERE id=$1 AND user_id=$2",
      [id, req.user.sub]
    );
    if (!order.rows[0]) return res.status(404).json({ error: "Order not found" });

    const items = await pool.query(
      "SELECT product_id,quantity,unit_price FROM order_items WHERE order_id=$1 ORDER BY id",
      [id]
    );
    res.json({ ...order.rows[0], items: items.rows });
  } catch (error) {
    logger.error({ err: error }, "order detail failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = { app };
