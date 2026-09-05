import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerProjectFinanceApi } from "./routes/project-finance";
import { registerProjectFinanceV1Routes } from "./routes/project-finance-v1";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startSchedulers } from "./jobs/scheduler";
import crypto from "node:crypto";
import { audit } from "./audit";
import "./runtime-config";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = req.header("x-request-id") || crypto.randomUUID();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      audit("http_request_completed", {
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Legacy non-persistent preview remains available during the transition. Ticket 13
  // mounts the authoritative persistence-backed /api/v1 project-finance contract beside it.
  registerProjectFinanceApi(app, (req: any, res, next) => {
    if (!req.session?.userId) return res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
        request_id: req.header("x-request-id") || crypto.randomUUID(),
      },
    });
    next();
  });
  registerProjectFinanceV1Routes(app);

  startSchedulers();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();