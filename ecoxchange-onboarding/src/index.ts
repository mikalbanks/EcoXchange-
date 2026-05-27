import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./api/routes.js";
import { startWorker, stopWorker } from "./orchestration/worker.js";

function main() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const dashboardOrigin =
    process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173";
  app.use(
    cors({
      origin: [dashboardOrigin, "http://localhost:5173"],
      credentials: false,
    }),
  );

  app.use("/api/onboard", routes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "ecoxchange-onboarding" });
  });

  const port = parseInt(process.env.PORT ?? "3004", 10);
  const server = app.listen(port, () => {
    console.error(`ecoxchange-onboarding listening on http://localhost:${port}`);
  });

  // Worker is opt-in to keep tests + tooling free of background polling.
  if (process.env.ONBOARDING_WORKER !== "off") {
    startWorker();
  }

  const shutdown = (signal: string) => {
    console.error(`[${signal}] shutting down...`);
    stopWorker();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
