const pino = require("pino");
const { app } = require("./app");

const port = Number(process.env.PORT || 3002);
const service = "catalog-service";
const logger = pino({ base: { service, environment: process.env.NODE_ENV || "production", version: process.env.APP_VERSION || process.env.GIT_SHA || "unknown" } });

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "service started");
});

function shutdown(signal) {
  logger.info({ signal }, "shutdown requested");
  server.close(() => {
    logger.info("service stopped");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
