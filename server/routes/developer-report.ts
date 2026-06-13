/**
 * Developer Portal report routes — Production Verification Report (PDF).
 *
 * POST /api/developer/report             → generate the PDF from a posted
 *                                          backtest payload (primary path; the
 *                                          dashboard holds the full payload, so
 *                                          this is immune to cache eviction).
 * GET  /api/developer/backtest/:id/pdf   → regenerate from the in-memory cache.
 *
 * Registered from server/routes.ts so it shares the `requireRole` guard.
 */
import type { Express, Response } from "express";
import rateLimit from "express-rate-limit";
import { reportRequestSchema } from "@shared/developer-backtest";
import type { BacktestCompletePayload } from "@shared/developer-backtest";
import { getCachedBacktest } from "../services/developer-backtest";
import { renderReportPdf, reportFilename } from "../report/generateReport";

type RoleGuard = (...roles: string[]) => any;

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many report downloads, please try again later" },
});

async function sendReport(
  res: Response,
  payload: BacktestCompletePayload,
  includeRevenue: boolean | undefined,
): Promise<void> {
  const buffer = await renderReportPdf(payload, { includeRevenue });
  const filename = reportFilename(payload.project.name);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
}

export function registerDeveloperReportRoutes(
  app: Express,
  requireRole: RoleGuard,
): void {
  app.post(
    "/api/developer/report",
    reportLimiter,
    requireRole("DEVELOPER"),
    async (req: any, res) => {
      const parsed = reportRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Invalid report request", issues: parsed.error.issues });
      }
      try {
        await sendReport(res, parsed.data.payload, parsed.data.include_revenue);
      } catch (error) {
        res.status(500).json({
          message: `Report generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    },
  );

  app.get(
    "/api/developer/backtest/:id/pdf",
    reportLimiter,
    requireRole("DEVELOPER"),
    async (req: any, res) => {
      const result = getCachedBacktest(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Backtest result not found" });
      }
      try {
        await sendReport(res, result, undefined);
      } catch (error) {
        res.status(500).json({
          message: `Report generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    },
  );
}
