/**
 * Developer Portal backtest routes (SSE).
 *
 * POST /api/developer/backtest        → streams progress + monthly results via
 *                                       Server-Sent Events, caches the result.
 * GET  /api/developer/backtest/:id    → returns a cached completed result.
 *
 * Registered from server/routes.ts so it can share the `requireRole` guard.
 */
import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { backtestRequestSchema } from "@shared/developer-backtest";
import {
  getCachedBacktest,
  streamBacktest,
} from "../services/developer-backtest";

type RoleGuard = (...roles: string[]) => any;

const backtestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many backtest runs, please try again later" },
});

export function registerDeveloperBacktestRoutes(
  app: Express,
  requireRole: RoleGuard,
): void {
  app.post(
    "/api/developer/backtest",
    backtestLimiter,
    requireRole("DEVELOPER"),
    async (req: any, res) => {
      const parsed = backtestRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid backtest request", issues: parsed.error.issues });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const signal = { aborted: false };
      req.on("close", () => {
        signal.aborted = true;
      });

      try {
        const result = await streamBacktest(
          parsed.data,
          (progress) => sendEvent("progress", progress),
          signal,
        );
        if (!signal.aborted) {
          sendEvent("complete", result);
        }
      } catch (error) {
        sendEvent("error", {
          message: `Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        res.end();
      }
    },
  );

  app.get(
    "/api/developer/backtest/:id",
    requireRole("DEVELOPER"),
    async (req: any, res) => {
      const result = getCachedBacktest(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Backtest result not found" });
      }
      res.json(result);
    },
  );
}
