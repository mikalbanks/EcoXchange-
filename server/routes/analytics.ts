/**
 * Spec 22 — public performance-analytics routes.
 *
 * GET /api/public/analytics/projects       → every analyzed project
 * GET /api/public/analytics/projects/:id   → one project, with its rows
 *
 * Public because the three deliverables these back — degradation certificate,
 * soiling report, availability report — are things an owner hands to a third
 * party. The wedge is that the output is independent: incumbent monitoring
 * platforms are selected and paid for by the asset manager whose performance
 * they report, and a report that needs a login to the reporting party's system
 * is not obviously independent of it.
 *
 * These read a committed artifact off disk and never trigger an analysis. The
 * engine run behind them is minutes per system.
 *
 * Registered from server/routes.ts alongside the other route modules.
 */
import type { Express } from "express";
import rateLimit from "express-rate-limit";
import {
  AnalyticsUnavailableError,
  getPlantAnalytics,
  getPlantAnalyticsProject,
} from "../services/plant-analytics";

const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many analytics requests, please try again later" },
});

export function registerAnalyticsRoutes(app: Express): void {
  app.get("/api/public/analytics/projects", analyticsLimiter, async (_req, res) => {
    try {
      res.json(await getPlantAnalytics());
    } catch (error: any) {
      if (error instanceof AnalyticsUnavailableError) {
        // 503, not 500 and not an empty 200. The analysis has not been run (or
        // its artifact did not validate); that is a real, temporary state with
        // a documented fix, and an empty 200 would render as "this plant has no
        // degradation" rather than "nobody has measured it yet".
        return res.status(503).json({ message: error.message });
      }
      console.error("Analytics list error:", error);
      res.status(500).json({ message: error.message || "Failed to load analytics" });
    }
  });

  app.get(
    "/api/public/analytics/projects/:id",
    analyticsLimiter,
    async (req, res) => {
      try {
        const project = await getPlantAnalyticsProject(req.params.id);
        if (!project) {
          const analytics = await getPlantAnalytics();
          return res.status(404).json({
            message: `No analytics for project ${req.params.id}.`,
            available: analytics.projects.map((p) => ({
              projectId: p.projectId,
              name: p.name,
            })),
            skipped: analytics.skipped,
          });
        }
        const analytics = await getPlantAnalytics();
        res.json({
          ...project,
          generatedAt: analytics.generatedAt,
          engineVersion: analytics.engineVersion,
          rdtoolsVersion: analytics.rdtoolsVersion,
          asOfDate: analytics.asOfDate,
        });
      } catch (error: any) {
        if (error instanceof AnalyticsUnavailableError) {
          return res.status(503).json({ message: error.message });
        }
        console.error("Analytics project error:", error);
        res
          .status(500)
          .json({ message: error.message || "Failed to load analytics" });
      }
    },
  );
}
