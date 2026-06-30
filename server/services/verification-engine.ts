import { createHash } from "crypto";
import { storage } from "../storage";
import {
  resolvePpaForInterval,
  inferOfftakerClassFromProject,
  inferPlantUseFromProject,
  type OfftakerClass,
  type PlantUse,
  type PpaResolution,
} from "../lib/market-rates";
import type {
  AnomalyFlag,
  InsertAnomalyFlag,
  IrradianceSnapshot,
  Project,
  SgtInterval,
  VerificationRun,
} from "@shared/schema";

export const TOLERANCE_15M_PCT = 10;
export const TOLERANCE_DAILY_PCT = 5;
export const CLEAR_SKY_MAX_FACTOR = 1.05;
export const METER_DRIFT_THRESHOLD_PCT = 3;
export const DATA_GAP_BLOCK_PCT = 10;
// Monthly fallback band used only when a site-specific P90 is unavailable
// (§2.2). When P90 *is* available, monthly verdicts use it instead of this.
export const TOLERANCE_MONTHLY_FALLBACK_PCT = 15;

export type Granularity = "INTERVAL_15M" | "DAILY";

export type VerificationStatusCode =
  | "PENDING"
  | "VERIFIED"
  | "FLAGGED"
  | "REJECTED"
  | "SETTLED";

export type AnomalyRuleCodeT =
  | "VARIANCE_BAND"
  | "CLEAR_SKY_CAP"
  | "CAPACITY_FACTOR"
  | "METER_DRIFT"
  | "DATA_GAP"
  | "DUPLICATE"
  | "P90_SHORTFALL"
  | "ML_SCORER";

export type AnomalySeverityT = "INFO" | "WARN" | "BLOCK";

// ─── ML scorer interface ───────────────────────────────────────────────────
// Severity type EXCLUDES "BLOCK" at the type level so a future ML scorer
// can never block settlement. Storage layer enforces the same at runtime.

export interface MlFlag {
  severity: "INFO" | "WARN";
  detail: Record<string, unknown>;
  modelConfidence: number;
}

export interface VerificationContext {
  projectId: string;
  intervalStart: Date;
  intervalEnd: Date;
  expectedKwh: number;
  actualKwh: number;
  variancePct: number;
  status: VerificationStatusCode;
  ppaSource: string;
  ppaRateUsdPerKwh: number;
}

export interface AnomalyScorer {
  name: string;
  version: string;
  score(input: VerificationContext): Promise<MlFlag[]>;
}

let registeredScorers: AnomalyScorer[] = [];
export function registerAnomalyScorer(scorer: AnomalyScorer) {
  registeredScorers.push(scorer);
}
export function _resetAnomalyScorersForTest() {
  registeredScorers = [];
}

// ─── Pure functions ────────────────────────────────────────────────────────

export interface ComputeExpectedKwhInput {
  pvEstimateKw: number;
  intervalMinutes: number;
  derateFactors?: number[];
}

export function computeExpectedKwh(input: ComputeExpectedKwhInput): number {
  const totalDerate = (input.derateFactors ?? []).reduce((s, d) => s + d, 0);
  const efficiency = Math.max(0, 1 - totalDerate);
  return input.pvEstimateKw * (input.intervalMinutes / 60) * efficiency;
}

export interface ReconcileResult {
  variancePct: number;
  status: "VERIFIED" | "REJECTED";
  blocking: boolean;
}

export function reconcileInterval(input: {
  expectedKwh: number;
  actualKwh: number;
  tolerancePct: number;
}): ReconcileResult {
  if (input.expectedKwh <= 0) {
    // No expected energy (e.g. night) — only verify if metered actual is also ~zero
    const blocking = Math.abs(input.actualKwh) > 0.01;
    return {
      variancePct: 0,
      status: blocking ? "REJECTED" : "VERIFIED",
      blocking,
    };
  }
  const variancePct = ((input.actualKwh - input.expectedKwh) / input.expectedKwh) * 100;
  const blocking = Math.abs(variancePct) > input.tolerancePct;
  return {
    variancePct: Number(variancePct.toFixed(4)),
    status: blocking ? "REJECTED" : "VERIFIED",
    blocking,
  };
}

// ─── Monthly P90 threshold (§2.2) ────────────────────────────────────────────
// Interval verdicts keep the tight static tolerance + robust-z anomaly path. At
// MONTHLY granularity, the financial signal is underperformance against the
// site's P90 (the level solar finance underwrites to): FLAG — not REJECT — when
// metered energy falls below the site P90 from Engine A. Where no site P90 is
// available we fall back to the static ±15% band. This EXTENDS the verdict; the
// three-source VERIFIED/FLAGGED/PENDING authority still lives here in TS.

export interface MonthlyP90Input {
  actualKwh: number;
  p50Kwh: number;
  /** Site P90 expected energy for the month (from Engine A). Null => fallback. */
  p90Kwh?: number | null;
}

export interface MonthlyP90Result {
  status: "VERIFIED" | "FLAGGED";
  variancePct: number; // (actual - p50) / p50, %
  threshold: "P90" | "STATIC_15PCT";
  thresholdKwh: number;
  shortfall: boolean;
  flag: NewAnomalyFlag | null;
}

export function reconcileMonthlyAgainstP90(input: MonthlyP90Input): MonthlyP90Result {
  const variancePct =
    input.p50Kwh > 0
      ? Number((((input.actualKwh - input.p50Kwh) / input.p50Kwh) * 100).toFixed(4))
      : 0;

  const hasP90 = input.p90Kwh != null && input.p90Kwh > 0;
  let threshold: "P90" | "STATIC_15PCT";
  let thresholdKwh: number;
  let shortfall: boolean;

  if (hasP90) {
    threshold = "P90";
    thresholdKwh = input.p90Kwh as number;
    // Underperformance vs the P90 floor is the flagging signal.
    shortfall = input.actualKwh < thresholdKwh;
  } else {
    threshold = "STATIC_15PCT";
    thresholdKwh = input.p50Kwh * (1 - TOLERANCE_MONTHLY_FALLBACK_PCT / 100);
    shortfall = Math.abs(variancePct) > TOLERANCE_MONTHLY_FALLBACK_PCT;
  }

  const flag: NewAnomalyFlag | null = shortfall
    ? {
        ruleCode: "P90_SHORTFALL",
        severity: "WARN",
        detail: {
          actualKwh: input.actualKwh,
          p50Kwh: input.p50Kwh,
          p90Kwh: input.p90Kwh ?? null,
          threshold,
          thresholdKwh: Number(thresholdKwh.toFixed(4)),
          variancePct,
        },
      }
    : null;

  return {
    status: shortfall ? "FLAGGED" : "VERIFIED",
    variancePct,
    threshold,
    thresholdKwh: Number(thresholdKwh.toFixed(4)),
    shortfall,
    flag,
  };
}

// ─── Anomaly rules ─────────────────────────────────────────────────────────

export interface AnomalyInput {
  expectedKwh: number;
  actualKwh: number;
  pvEstimateKw: number;
  intervalMinutes: number;
  capacityKw: number;
  tolerancePct: number;
  variancePct: number;
}

export interface HistoryInput {
  recent7dResidualPct: number | null;
  recent24hActualKwh: number | null;
  hasDuplicate: boolean;
  expectedIntervalsInWindow: number;
  observedIntervalsInWindow: number;
}

export interface NewAnomalyFlag {
  ruleCode: AnomalyRuleCodeT;
  severity: AnomalySeverityT;
  detail: Record<string, unknown>;
}

export function applyAnomalyRules(
  interval: AnomalyInput,
  history: HistoryInput,
): NewAnomalyFlag[] {
  const flags: NewAnomalyFlag[] = [];

  if (history.hasDuplicate) {
    flags.push({
      ruleCode: "DUPLICATE",
      severity: "BLOCK",
      detail: { reason: "Period already verified for this meter" },
    });
  }

  if (
    interval.expectedKwh > 0 &&
    Math.abs(interval.variancePct) > interval.tolerancePct
  ) {
    flags.push({
      ruleCode: "VARIANCE_BAND",
      severity: "BLOCK",
      detail: {
        expectedKwh: interval.expectedKwh,
        actualKwh: interval.actualKwh,
        variancePct: interval.variancePct,
        tolerancePct: interval.tolerancePct,
      },
    });
  }

  const intervalHours = interval.intervalMinutes / 60;
  const clearSkyCapKwh =
    interval.pvEstimateKw * intervalHours * CLEAR_SKY_MAX_FACTOR;
  if (interval.actualKwh > clearSkyCapKwh && interval.pvEstimateKw > 0.001) {
    flags.push({
      ruleCode: "CLEAR_SKY_CAP",
      severity: "WARN",
      detail: {
        actualKwh: interval.actualKwh,
        clearSkyCapKwh,
        pvEstimateKw: interval.pvEstimateKw,
        factor: CLEAR_SKY_MAX_FACTOR,
      },
    });
  }

  if (history.recent24hActualKwh != null) {
    const maxDailyKwh = interval.capacityKw * 24;
    if (history.recent24hActualKwh > maxDailyKwh) {
      flags.push({
        ruleCode: "CAPACITY_FACTOR",
        severity: "BLOCK",
        detail: {
          recent24hActualKwh: history.recent24hActualKwh,
          maxDailyKwh,
          capacityKw: interval.capacityKw,
        },
      });
    }
  }

  if (
    history.recent7dResidualPct != null &&
    Math.abs(history.recent7dResidualPct) > METER_DRIFT_THRESHOLD_PCT
  ) {
    flags.push({
      ruleCode: "METER_DRIFT",
      severity: "WARN",
      detail: {
        rolling7dResidualPct: history.recent7dResidualPct,
        thresholdPct: METER_DRIFT_THRESHOLD_PCT,
      },
    });
  }

  if (history.expectedIntervalsInWindow > 0) {
    const gapPct =
      ((history.expectedIntervalsInWindow - history.observedIntervalsInWindow) /
        history.expectedIntervalsInWindow) *
      100;
    if (gapPct >= DATA_GAP_BLOCK_PCT) {
      flags.push({
        ruleCode: "DATA_GAP",
        severity: "BLOCK",
        detail: {
          gapPct,
          observed: history.observedIntervalsInWindow,
          expected: history.expectedIntervalsInWindow,
        },
      });
    } else if (gapPct > 0) {
      flags.push({
        ruleCode: "DATA_GAP",
        severity: "WARN",
        detail: {
          gapPct,
          observed: history.observedIntervalsInWindow,
          expected: history.expectedIntervalsInWindow,
        },
      });
    }
  }

  return flags;
}

function deriveStatus(flags: NewAnomalyFlag[]): VerificationStatusCode {
  if (flags.some((f) => f.severity === "BLOCK")) return "REJECTED";
  if (flags.some((f) => f.severity === "WARN")) return "FLAGGED";
  return "VERIFIED";
}

function computeEvidenceHash(parts: {
  irradianceHashes: string[];
  intervalIds: number[];
  expectedKwh: number;
  actualKwh: number;
  ppaRateUsdPerKwh: number;
  periodStart: string;
}): string {
  const payload = JSON.stringify({
    i: parts.irradianceHashes.sort(),
    s: parts.intervalIds.sort((a, b) => a - b),
    e: Number(parts.expectedKwh.toFixed(6)),
    a: Number(parts.actualKwh.toFixed(6)),
    p: Number(parts.ppaRateUsdPerKwh.toFixed(8)),
    t: parts.periodStart,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function intervalMinutes(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

function whToKwh(wh: string | number | null | undefined): number {
  const n = Number(wh ?? 0);
  return Number.isFinite(n) ? n / 1000 : 0;
}

// ─── Orchestrator: single interval ─────────────────────────────────────────

export interface VerificationRunResult {
  run: VerificationRun;
  anomalies: AnomalyFlag[];
  status: VerificationStatusCode;
}

async function loadProjectContext(projectId: string): Promise<{
  project: Project;
  offtakerClass: OfftakerClass;
  plantUse: PlantUse;
}> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  return {
    project,
    offtakerClass: inferOfftakerClassFromProject(project),
    plantUse: inferPlantUseFromProject(project),
  };
}

async function resolvePriceForInterval(
  project: Project,
  intervalStart: Date,
): Promise<PpaResolution> {
  const ppas = await storage.getPpasByProject(project.id);
  // jurisdictionPpaBenchmarks is not yet exposed by MemStorage; pass [] so
  // resolution falls through to NATIONAL_AVG when no PPA + non-CA project.
  return resolvePpaForInterval({
    project,
    intervalStart,
    ppas,
    jurisdictionBenchmarks: [],
  });
}

async function buildHistory(
  projectId: string,
  intervalStart: Date,
  hasDuplicate: boolean,
): Promise<HistoryInput> {
  const sevenDaysAgo = new Date(intervalStart.getTime() - 7 * 24 * 3600 * 1000);
  const recent = await storage.getVerificationRuns(projectId, {
    from: sevenDaysAgo,
    to: intervalStart,
    granularity: "INTERVAL_15M",
  });
  let residualSum = 0;
  let residualN = 0;
  let recent24h = 0;
  const twentyFourAgo = new Date(intervalStart.getTime() - 24 * 3600 * 1000);
  for (const r of recent) {
    const v = Number(r.variancePct);
    if (Number.isFinite(v)) {
      residualSum += v;
      residualN++;
    }
    if (new Date(r.periodStart).getTime() >= twentyFourAgo.getTime()) {
      recent24h += Number(r.actualKwh);
    }
  }
  // For 15-min: expect 7 days × 96 intervals; for daily this is recomputed.
  return {
    recent7dResidualPct: residualN > 0 ? residualSum / residualN : null,
    recent24hActualKwh: recent.length > 0 ? recent24h : null,
    hasDuplicate,
    expectedIntervalsInWindow: 1,
    observedIntervalsInWindow: 1,
  };
}

export async function runIntervalVerificationFor(
  interval: SgtInterval,
): Promise<VerificationRunResult> {
  const meter = await storage.getMeter(interval.meterId);
  if (!meter) throw new Error(`Meter not found: ${interval.meterId}`);
  return runIntervalVerificationInternal(interval, meter.projectId);
}

export async function runIntervalVerification(
  intervalId: number,
): Promise<VerificationRunResult> {
  const interval = await findIntervalById(intervalId);
  if (!interval) throw new Error(`SGT interval not found: ${intervalId}`);

  const meter = await storage.getMeter(interval.meterId);
  if (!meter) throw new Error(`Meter not found: ${interval.meterId}`);

  return runIntervalVerificationInternal(interval, meter.projectId);
}

async function runIntervalVerificationInternal(
  interval: SgtInterval,
  projectId: string,
): Promise<VerificationRunResult> {
  const intervalId = interval.id;
  const { project, offtakerClass, plantUse } = await loadProjectContext(projectId);
  const capacityKw = Number(project.capacityKw ?? 0);

  const snapshot = await storage.getIrradianceSnapshotForInterval(
    projectId,
    interval.intervalStart,
  );

  const minutes = intervalMinutes(interval.intervalStart, interval.intervalEnd);
  const pvEstimateKw = snapshot
    ? Number(snapshot.pvEstimateKw)
    : Number(interval.expectedGrossWh ?? 0) / 1000 / (minutes / 60);

  const expectedKwh = computeExpectedKwh({
    pvEstimateKw,
    intervalMinutes: minutes,
  });

  const actualKwh = whToKwh(interval.syntheticGrossWh);
  const tolerancePct = TOLERANCE_15M_PCT;

  const recon = reconcileInterval({ expectedKwh, actualKwh, tolerancePct });

  const existingRun = await storage.getVerificationRunByInterval(intervalId);
  const hasDuplicate = !!existingRun && existingRun.status === "VERIFIED";
  const history = await buildHistory(projectId, interval.intervalStart, hasDuplicate);

  const anomalyFlags = applyAnomalyRules(
    {
      expectedKwh,
      actualKwh,
      pvEstimateKw,
      intervalMinutes: minutes,
      capacityKw,
      tolerancePct,
      variancePct: recon.variancePct,
    },
    history,
  );

  const status = deriveStatus(anomalyFlags);

  const price = await resolvePriceForInterval(project, interval.intervalStart);
  const grossRevenueUsd = actualKwh * price.usdPerKwh;
  const evidenceHash = computeEvidenceHash({
    irradianceHashes: snapshot ? [snapshot.rawResponseHash] : [],
    intervalIds: [intervalId],
    expectedKwh,
    actualKwh,
    ppaRateUsdPerKwh: price.usdPerKwh,
    periodStart: interval.intervalStart.toISOString(),
  });

  const run = await storage.createVerificationRun({
    projectId,
    intervalId,
    granularity: "INTERVAL_15M",
    periodStart: interval.intervalStart,
    periodEnd: interval.intervalEnd,
    expectedKwh: expectedKwh.toFixed(4) as any,
    actualKwh: actualKwh.toFixed(4) as any,
    variancePct: recon.variancePct.toFixed(4) as any,
    tolerancePct: tolerancePct.toFixed(4) as any,
    ppaRateUsdPerKwh: price.usdPerKwh.toFixed(6) as any,
    ppaSource: price.source,
    offtakerClass,
    plantUse,
    grossRevenueUsd: grossRevenueUsd.toFixed(4) as any,
    status,
    evidenceHash,
  });

  const persistedFlags: AnomalyFlag[] = [];
  for (const f of anomalyFlags) {
    const flag = await storage.createAnomalyFlag({
      verificationRunId: run.id,
      ruleCode: f.ruleCode,
      severity: f.severity,
      detail: f.detail as any,
    } as InsertAnomalyFlag);
    persistedFlags.push(flag);
  }

  // Fire-and-forget ML scorers. They can only append advisory flags.
  if (registeredScorers.length > 0) {
    const ctx: VerificationContext = {
      projectId,
      intervalStart: interval.intervalStart,
      intervalEnd: interval.intervalEnd,
      expectedKwh,
      actualKwh,
      variancePct: recon.variancePct,
      status,
      ppaSource: price.source,
      ppaRateUsdPerKwh: price.usdPerKwh,
    };
    void Promise.allSettled(
      registeredScorers.map(async (s) => {
        try {
          const flags = await s.score(ctx);
          for (const f of flags) {
            await storage.createAnomalyFlag({
              verificationRunId: run.id,
              ruleCode: "ML_SCORER",
              severity: f.severity,
              detail: {
                scorer: s.name,
                version: s.version,
                modelConfidence: f.modelConfidence,
                ...f.detail,
              } as any,
            } as InsertAnomalyFlag);
          }
        } catch (err: any) {
          console.warn(`[verification-engine] scorer ${s.name} failed: ${err.message}`);
        }
      }),
    );
  }

  return { run, anomalies: persistedFlags, status };
}

async function findIntervalById(intervalId: number): Promise<SgtInterval | undefined> {
  // MemStorage doesn't expose a direct getter; iterate meters.
  const allProjects = await storage.getAllProjects();
  for (const p of allProjects) {
    const meters = await storage.getMetersByProject(p.id);
    for (const m of meters) {
      const intervals = await storage.getSgtIntervalsByMeter(m.id);
      const found = intervals.find((i) => i.id === intervalId);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── Orchestrator: daily rollup ────────────────────────────────────────────

export async function runDailyVerification(
  projectId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<VerificationRunResult> {
  const { project, offtakerClass, plantUse } = await loadProjectContext(projectId);
  const capacityKw = Number(project.capacityKw ?? 0);

  const snapshots = await storage.getIrradianceSnapshots(projectId, dayStart, dayEnd);

  const meters = await storage.getMetersByProject(projectId);
  const intervals: SgtInterval[] = [];
  for (const m of meters) {
    const ms = await storage.getSgtIntervalsByMeter(m.id);
    for (const i of ms) {
      if (i.intervalStart >= dayStart && i.intervalStart < dayEnd) intervals.push(i);
    }
  }

  const expectedKwh = snapshots.reduce((sum, s) => {
    const mins = intervalMinutes(s.intervalStart, s.intervalEnd);
    return sum + Number(s.pvEstimateKw) * (mins / 60);
  }, 0);
  const actualKwh = intervals.reduce((sum, i) => sum + whToKwh(i.syntheticGrossWh), 0);

  const tolerancePct = TOLERANCE_DAILY_PCT;
  const recon = reconcileInterval({ expectedKwh, actualKwh, tolerancePct });

  const expectedIntervals = 96;
  const observedIntervals = intervals.length;

  const recent24h = actualKwh;
  const anomalyFlags = applyAnomalyRules(
    {
      expectedKwh,
      actualKwh,
      pvEstimateKw:
        snapshots.length > 0
          ? snapshots.reduce((s, x) => s + Number(x.pvEstimateKw), 0) / snapshots.length
          : 0,
      intervalMinutes: 24 * 60,
      capacityKw,
      tolerancePct,
      variancePct: recon.variancePct,
    },
    {
      recent7dResidualPct: null,
      recent24hActualKwh: recent24h,
      hasDuplicate: false,
      expectedIntervalsInWindow: expectedIntervals,
      observedIntervalsInWindow: observedIntervals,
    },
  );

  const status = deriveStatus(anomalyFlags);
  const price = await resolvePriceForInterval(project, dayStart);
  const grossRevenueUsd = actualKwh * price.usdPerKwh;
  const evidenceHash = computeEvidenceHash({
    irradianceHashes: snapshots.map((s) => s.rawResponseHash),
    intervalIds: intervals.map((i) => i.id),
    expectedKwh,
    actualKwh,
    ppaRateUsdPerKwh: price.usdPerKwh,
    periodStart: dayStart.toISOString(),
  });

  const run = await storage.createVerificationRun({
    projectId,
    intervalId: null,
    granularity: "DAILY",
    periodStart: dayStart,
    periodEnd: dayEnd,
    expectedKwh: expectedKwh.toFixed(4) as any,
    actualKwh: actualKwh.toFixed(4) as any,
    variancePct: recon.variancePct.toFixed(4) as any,
    tolerancePct: tolerancePct.toFixed(4) as any,
    ppaRateUsdPerKwh: price.usdPerKwh.toFixed(6) as any,
    ppaSource: price.source,
    offtakerClass,
    plantUse,
    grossRevenueUsd: grossRevenueUsd.toFixed(4) as any,
    status,
    evidenceHash,
  });

  const persistedFlags: AnomalyFlag[] = [];
  for (const f of anomalyFlags) {
    const flag = await storage.createAnomalyFlag({
      verificationRunId: run.id,
      ruleCode: f.ruleCode,
      severity: f.severity,
      detail: f.detail as any,
    } as InsertAnomalyFlag);
    persistedFlags.push(flag);
  }

  return { run, anomalies: persistedFlags, status };
}

export async function runVerification(
  projectId: string,
  periodStart: Date,
  periodEnd: Date,
  granularity: Granularity,
): Promise<VerificationRunResult[]> {
  if (granularity === "DAILY") {
    const results: VerificationRunResult[] = [];
    const cursor = new Date(periodStart);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor < periodEnd) {
      const dayEnd = new Date(cursor.getTime() + 24 * 3600 * 1000);
      results.push(await runDailyVerification(projectId, new Date(cursor), dayEnd));
      cursor.setTime(cursor.getTime() + 24 * 3600 * 1000);
    }
    return results;
  }

  const meters = await storage.getMetersByProject(projectId);
  const results: VerificationRunResult[] = [];
  for (const m of meters) {
    const intervals = await storage.getSgtIntervalsByMeter(m.id);
    for (const i of intervals) {
      if (i.intervalStart < periodStart || i.intervalStart >= periodEnd) continue;
      results.push(await runIntervalVerification(i.id));
    }
  }
  return results;
}

// ─── Anomaly clear / reject ────────────────────────────────────────────────

export async function clearAnomalies(
  runId: string,
  adminUserId: string,
  reason: string,
  force: boolean,
): Promise<{ run: VerificationRun; cleared: number }> {
  const run = await storage.getVerificationRun(runId);
  if (!run) throw new Error(`Verification run not found: ${runId}`);
  const flags = await storage.getAnomalyFlagsByRun(runId);
  const open = flags.filter((f) => f.clearedAt == null);

  let cleared = 0;
  for (const f of open) {
    if (f.severity === "BLOCK" && !force) continue;
    await storage.updateAnomalyFlag(f.id, {
      clearedAt: new Date(),
      clearedBy: adminUserId,
      clearedReason: reason,
    });
    cleared++;
  }

  // Recompute status from any flags that remain open.
  const refreshed = await storage.getAnomalyFlagsByRun(runId);
  const stillOpen = refreshed.filter((f) => f.clearedAt == null);
  const newStatus: VerificationStatusCode = stillOpen.some((f) => f.severity === "BLOCK")
    ? "REJECTED"
    : stillOpen.some((f) => f.severity === "WARN")
      ? "FLAGGED"
      : "VERIFIED";

  const updated = await storage.updateVerificationRun(runId, {
    status: newStatus,
    clearedAt: new Date(),
  });

  return { run: updated ?? run, cleared };
}

export async function rejectVerificationRun(
  runId: string,
  reason: string,
): Promise<VerificationRun> {
  const updated = await storage.updateVerificationRun(runId, {
    status: "REJECTED",
    notes: reason,
  });
  if (!updated) throw new Error(`Verification run not found: ${runId}`);
  return updated;
}
