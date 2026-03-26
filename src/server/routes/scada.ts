/**
 * SCADA API Routes
 * ================
 * REST endpoints for the Virtual SCADA pipeline and yield dashboard.
 */
import { Router, type Request, type Response } from "express";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  spvs,
  irradianceTelemetry,
  powerTelemetry,
  yieldLedger,
  investors,
} from "../../db/schema";
import { runScadaPipeline, seedDefaultSpv } from "../services/scadaPipeline";
import { goesS3Path, logGoesProvenance } from "../services/goesS3";

const router = Router();

// ─── GET /api/spvs — List all SPVs ─────────────────────────────────────────
router.get("/spvs", async (_req: Request, res: Response) => {
  const allSpvs = await db.select().from(spvs);
  res.json(allSpvs);
});

// ─── GET /api/spvs/:id — Single SPV detail ─────────────────────────────────
router.get("/spvs/:id", async (req: Request, res: Response) => {
  const spv = await db
    .select()
    .from(spvs)
    .where(eq(spvs.id, parseInt(req.params.id)))
    .limit(1);
  if (spv.length === 0) return res.status(404).json({ error: "SPV not found" });
  res.json(spv[0]);
});

// ─── POST /api/scada/ingest — Trigger SCADA pipeline ingestion ─────────────
router.post("/scada/ingest", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, spvId } = req.body;

    let spv;
    if (spvId) {
      const result = await db.select().from(spvs).where(eq(spvs.id, spvId)).limit(1);
      if (result.length === 0) return res.status(404).json({ error: "SPV not found" });
      spv = result[0];
    } else {
      spv = await seedDefaultSpv();
    }

    // Default: ingest yesterday's data
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400_000);
    const start = startDate || formatDate(yesterday);
    const end = endDate || formatDate(yesterday);

    // Log GOES-16 S3 provenance
    const goesRef = goesS3Path(yesterday);
    console.log(logGoesProvenance(goesRef));

    const result = await runScadaPipeline(spv, start, end);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[SCADA] Ingestion error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/scada/power/:spvId — Recent power telemetry ──────────────────
router.get("/scada/power/:spvId", async (req: Request, res: Response) => {
  const spvId = parseInt(req.params.spvId);
  const hours = parseInt(req.query.hours as string) || 72;
  const since = new Date(Date.now() - hours * 3600_000);

  const data = await db
    .select()
    .from(powerTelemetry)
    .where(and(eq(powerTelemetry.spvId, spvId), gte(powerTelemetry.timestamp, since)))
    .orderBy(powerTelemetry.timestamp);

  res.json(data);
});

// ─── GET /api/scada/irradiance/:spvId — Recent irradiance data ─────────────
router.get("/scada/irradiance/:spvId", async (req: Request, res: Response) => {
  const spvId = parseInt(req.params.spvId);
  const hours = parseInt(req.query.hours as string) || 72;
  const since = new Date(Date.now() - hours * 3600_000);

  const data = await db
    .select()
    .from(irradianceTelemetry)
    .where(
      and(eq(irradianceTelemetry.spvId, spvId), gte(irradianceTelemetry.timestamp, since))
    )
    .orderBy(irradianceTelemetry.timestamp);

  res.json(data);
});

// ─── GET /api/yield/:spvId — Yield ledger entries ──────────────────────────
router.get("/yield/:spvId", async (req: Request, res: Response) => {
  const spvId = parseInt(req.params.spvId);
  const periodType = (req.query.period as string) || "hourly";
  const limit = parseInt(req.query.limit as string) || 168; // 7 days of hourly

  const data = await db
    .select()
    .from(yieldLedger)
    .where(
      and(eq(yieldLedger.spvId, spvId), eq(yieldLedger.periodType, periodType))
    )
    .orderBy(desc(yieldLedger.periodStart))
    .limit(limit);

  res.json(data.reverse()); // Chronological order
});

// ─── GET /api/yield/:spvId/summary — Aggregate yield summary ───────────────
router.get("/yield/:spvId/summary", async (req: Request, res: Response) => {
  const spvId = parseInt(req.params.spvId);

  const [summary] = await db
    .select({
      totalEnergyKwh: sql<number>`COALESCE(SUM(${yieldLedger.energyKwh}), 0)`,
      totalRevenueUsd: sql<number>`COALESCE(SUM(${yieldLedger.revenueUsd}), 0)`,
      totalYieldPerToken: sql<number>`COALESCE(SUM(${yieldLedger.yieldPerToken}), 0)`,
      avgCapacityFactor: sql<number>`COALESCE(AVG(${yieldLedger.avgCapacityFactor}), 0)`,
      recordCount: sql<number>`COUNT(*)`,
    })
    .from(yieldLedger)
    .where(eq(yieldLedger.spvId, spvId));

  const spv = await db.select().from(spvs).where(eq(spvs.id, spvId)).limit(1);

  res.json({
    ...summary,
    spv: spv[0] || null,
    totalEnergyMwh: (summary?.totalEnergyKwh || 0) / 1000,
  });
});

// ─── GET /api/investors — List accredited investors ─────────────────────────
router.get("/investors", async (_req: Request, res: Response) => {
  const data = await db.select().from(investors);
  res.json(data);
});

// ─── GET /api/scada/latest/:spvId — Latest single reading ──────────────────
router.get("/scada/latest/:spvId", async (req: Request, res: Response) => {
  const spvId = parseInt(req.params.spvId);

  const [latestPower] = await db
    .select()
    .from(powerTelemetry)
    .where(eq(powerTelemetry.spvId, spvId))
    .orderBy(desc(powerTelemetry.timestamp))
    .limit(1);

  const [latestIrradiance] = await db
    .select()
    .from(irradianceTelemetry)
    .where(eq(irradianceTelemetry.spvId, spvId))
    .orderBy(desc(irradianceTelemetry.timestamp))
    .limit(1);

  res.json({
    power: latestPower || null,
    irradiance: latestIrradiance || null,
  });
});

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export default router;
