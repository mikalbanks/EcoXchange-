/**
 * Developer Portal backtest orchestration.
 *
 * Reuses the in-process reconciliation engine (NASA POWER irradiance →
 * Hay-Davies expected generation, with automatic pvlib upgrade when the
 * port-3004 service is reachable → three-way reconciliation). We drive the
 * month loop here — rather than calling the engine's `runBacktest` black box —
 * so each month can be streamed to the client as it completes and enriched with
 * the POA / cell-temperature / capacity-factor fields the dashboard renders.
 *
 * Loop logic mirrors ecoxchange-reconciliation-engine/src/backtest/runner.ts.
 */
import { randomUUID } from "crypto";
import {
  isSupabaseConfigured,
  persistBacktest,
  type ReconciliationRow,
} from "./backtest-supabase-writer";
import { fetchNasaPowerDaily } from "../../ecoxchange-reconciliation-engine/src/ingestion/nasa-power.js";
import { calculateExpectedGeneration } from "../../ecoxchange-reconciliation-engine/src/physics/expected-generation.js";
import { getExpectedGeneration } from "../../ecoxchange-reconciliation-engine/src/physics/pvlib-client.js";
import { reconcile } from "../../ecoxchange-reconciliation-engine/src/reconciliation/reconcile.js";
import { DEFAULT_TOLERANCES } from "../../ecoxchange-reconciliation-engine/src/config/tolerances.js";
import { monthRange } from "../../ecoxchange-reconciliation-engine/src/utils/dates.js";
import { randomNormal, seededRng } from "../../ecoxchange-reconciliation-engine/src/utils/math.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
} from "../../ecoxchange-reconciliation-engine/src/utils/types.js";
import {
  type BacktestCompletePayload,
  type BacktestProgressEvent,
  type BacktestRequest,
  type BacktestSummary,
  type MonthlyBacktestResult,
  DEFAULT_DEGRADATION_RATE,
  DEFAULT_SYSTEM_LOSSES,
} from "@shared/developer-backtest";

// NOCT (Nominal Operating Cell Temperature) by racking type — used to estimate
// average cell temperature when the physics-grade pvlib service is unavailable.
const NOCT_BY_RACKING: Record<string, number> = {
  open_rack: 45,
  single_axis_tracker: 45,
  roof_mount: 48,
};

const HOURS_PER_YEAR = 8760;

/** Map wizard intake onto the reconciliation engine's ProjectConfig. */
function toProjectConfig(p: BacktestRequest["project"]): ProjectConfig {
  return {
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    capacity_kw_dc: p.capacity_kw_dc,
    tilt_deg: p.tilt_deg,
    azimuth_deg: p.azimuth_deg,
    module_efficiency: p.module_efficiency,
    system_losses: p.system_losses ?? DEFAULT_SYSTEM_LOSSES,
    degradation_rate: p.degradation_rate ?? DEFAULT_DEGRADATION_RATE,
    commissioning_date: p.commissioning_date,
  };
}

/**
 * NASA POWER's beam/diffuse components (DNI/DHI) lag GHI by several months —
 * the reconciliation engine drops any day missing a component, so we end the
 * backtest window far enough back that all three are published. Six months is
 * the observed lag and yields a clean, complete trailing window for the demo.
 */
const NASA_DATA_LAG_MONTHS = 6;

/** Trailing N-month window ending at the last fully-available month. */
function backtestWindow(months: number): { start_month: string; end_month: string } {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - NASA_DATA_LAG_MONTHS, 1),
  );
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1), 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start_month: fmt(start), end_month: fmt(end) };
}

async function computeExpected(
  project: ProjectConfig,
  period_start: string,
  period_end: string,
  daily: ExpectedGenInput,
): Promise<{ output: ExpectedGenerationOutput; engine: "pvlib" | "hay_davies" }> {
  const localFallback = (): ExpectedGenerationOutput =>
    calculateExpectedGeneration({
      ...project,
      period_start,
      period_end,
      daily_irradiance: daily,
    });

  if (process.env.PVLIB_DISABLED === "1") {
    return { output: localFallback(), engine: "hay_davies" };
  }
  try {
    const r = await getExpectedGeneration(project, daily);
    return {
      output: {
        period_start,
        period_end,
        expected_kwh: r.total_expected_kwh,
        daily_breakdown: [],
        assumptions: {
          degradation_factor: Number(r.system_summary.degradation_factor ?? 1),
          system_losses: project.system_losses,
          albedo: Number(r.system_summary.albedo ?? 0.2),
          transposition_model: String(r.model_metadata.transposition_model ?? "perez"),
        },
      },
      engine: "pvlib",
    };
  } catch {
    return { output: localFallback(), engine: "hay_davies" };
  }
}

type ExpectedGenInput = Parameters<typeof calculateExpectedGeneration>[0]["daily_irradiance"];

/** Average ambient air temperature across the month's daily records. */
function avgAirTemp(daily: ExpectedGenInput): number {
  const temps = daily.map((d) => d.temp_air_c ?? 20).filter((t) => Number.isFinite(t));
  if (temps.length === 0) return 20;
  return temps.reduce((s, t) => s + t, 0) / temps.length;
}

/**
 * Estimate average cell temperature from ambient + an irradiance-driven rise
 * (NOCT model). This is an estimate when pvlib is unavailable; the dashboard
 * labels it as such.
 */
function estimateCellTemp(
  avgAir: number,
  poaKwhM2Monthly: number,
  days: number,
  rackingType: string,
): number {
  const noct = NOCT_BY_RACKING[rackingType] ?? 45;
  const ASSUMED_SUN_HOURS = 5.5;
  const avgDailyPoa = days > 0 ? poaKwhM2Monthly / days : 0;
  const representativePoaW = (avgDailyPoa / ASSUMED_SUN_HOURS) * 1000;
  const rise = (representativePoaW / 800) * (noct - 20);
  return avgAir + rise;
}

export interface BacktestResult extends BacktestCompletePayload {}

/** Simple in-memory cache so /backtest/:id and /project/:id can re-fetch. */
const RESULT_CACHE = new Map<string, BacktestResult>();
const MAX_CACHED = 200;

export function getCachedBacktest(id: string): BacktestResult | undefined {
  return RESULT_CACHE.get(id);
}

function cacheResult(result: BacktestResult): void {
  if (RESULT_CACHE.size >= MAX_CACHED) {
    const oldest = RESULT_CACHE.keys().next().value;
    if (oldest) RESULT_CACHE.delete(oldest);
  }
  RESULT_CACHE.set(result.backtest_id, result);
}

/**
 * Run a streaming backtest. `emit` is called for each progress/month event;
 * the resolved value is the complete payload (also cached for later GET).
 */
export async function streamBacktest(
  request: BacktestRequest,
  emit: (event: BacktestProgressEvent) => void,
  signal?: { aborted: boolean },
): Promise<BacktestResult> {
  const project = toProjectConfig(request.project);
  const { start_month, end_month } = backtestWindow(request.backtest_months);
  const months = monthRange(start_month, end_month);
  const rng = seededRng(0xc0ffee);

  const results: MonthlyBacktestResult[] = [];
  // Per-month reconciliation context retained for optional Supabase persistence
  // (the shared MonthlyBacktestResult intentionally omits the full verdict).
  const reconciliations: ReconciliationRow[] = [];
  let usedPvlib = false;
  let usedFallback = false;

  emit({
    stage: "fetching_irradiance",
    progress_pct: 8,
    message: "Fetching satellite irradiance data from NASA POWER...",
  });

  for (let i = 0; i < months.length; i++) {
    if (signal?.aborted) break;
    const m = months[i];
    const monthLabel = m.start.slice(0, 7);
    const progressBase = 10 + Math.round((i / months.length) * 80);

    emit({
      stage: "fetching_irradiance",
      progress_pct: progressBase,
      message: `Fetching satellite data for ${monthLabel}...`,
    });

    const irradiance = await fetchNasaPowerDaily(
      project.latitude,
      project.longitude,
      m.start,
      m.end,
    );

    emit({
      stage: "calculating_expected",
      progress_pct: progressBase + 2,
      message: `Running physics model for ${monthLabel}...`,
    });

    const { output: expected, engine } = await computeExpected(
      project,
      m.start,
      m.end,
      irradiance.daily,
    );
    if (engine === "pvlib") usedPvlib = true;
    else usedFallback = true;

    // Simulate inverter production with realistic noise (expected × ~N(1, 0.03)).
    const noise = randomNormal(1.0, 0.03, rng);
    const simulated_inverter_kwh = expected.expected_kwh * noise;
    const simulated_utility_kwh = simulated_inverter_kwh * 0.97;
    const deviation_pct =
      expected.expected_kwh > 0
        ? ((simulated_inverter_kwh - expected.expected_kwh) / expected.expected_kwh) * 100
        : 0;

    const verification = reconcile({
      project,
      period_start: m.start,
      period_end: m.end,
      inverter_reading: {
        kwh_gross: simulated_inverter_kwh,
        data_quality: "complete",
        raw_response: { simulated: true },
      },
      utility_reading: {
        kwh_net: simulated_utility_kwh,
        data_quality: "complete",
        raw_response: { simulated: true },
      },
      expected_generation: expected,
      tolerances: DEFAULT_TOLERANCES,
    });

    // POA: sum of daily plane-of-array (Hay-Davies). pvlib path discards daily
    // breakdown, so approximate from GHI with a nominal tilt gain in that case.
    const poaFromBreakdown = expected.daily_breakdown.reduce(
      (s, d) => s + d.poa_kwh_m2,
      0,
    );
    const poa_irradiance_kwh_m2 =
      poaFromBreakdown > 0 ? poaFromBreakdown : irradiance.monthly_total_ghi * 1.1;

    const days = irradiance.daily.length || 30;
    const hoursInMonth = days * 24;
    const capacity_factor =
      project.capacity_kw_dc > 0
        ? expected.expected_kwh / (project.capacity_kw_dc * hoursInMonth)
        : 0;
    const cell_temperature_avg_c = estimateCellTemp(
      avgAirTemp(irradiance.daily),
      poa_irradiance_kwh_m2,
      days,
      request.project.racking_type,
    );

    const monthResult: MonthlyBacktestResult = {
      month: monthLabel,
      expected_kwh: round(expected.expected_kwh),
      simulated_inverter_kwh: round(simulated_inverter_kwh),
      deviation_pct: round2(deviation_pct),
      status: verification.status,
      poa_irradiance_kwh_m2: round2(poa_irradiance_kwh_m2),
      cell_temperature_avg_c: round2(cell_temperature_avg_c),
      capacity_factor: round4(capacity_factor),
      ghi_kwh_m2: round2(irradiance.monthly_total_ghi),
    };
    results.push(monthResult);
    reconciliations.push({
      month: monthLabel,
      period_start: m.start,
      period_end: m.end,
      verification,
      simulated_utility_kwh,
    });

    emit({
      stage: "running_reconciliation",
      progress_pct: progressBase + 6,
      message: `Verified ${monthLabel}...`,
      month_results: monthResult,
    });
  }

  const summary = buildSummary(results, request, usedPvlib, usedFallback);

  // Env-gated persistence: only writes when SUPABASE_URL +
  // SUPABASE_SERVICE_ROLE_KEY are set; otherwise the backtest stays in-memory.
  let persistedProjectId: string | null = null;
  if (!signal?.aborted && isSupabaseConfigured()) {
    emit({
      stage: "generating_report",
      progress_pct: 94,
      message: "Persisting verification records to database...",
    });
    const outcome = await persistBacktest({
      request,
      results,
      summary,
      reconciliations,
      windowEndMonth: end_month,
    });
    persistedProjectId = outcome.projectId;
  }

  emit({
    stage: "generating_report",
    progress_pct: 96,
    message: "Compiling verification report...",
  });

  const backtest_id = randomUUID();
  const result: BacktestResult = {
    backtest_id,
    project_id: persistedProjectId ?? randomUUID(),
    project: request.project,
    summary,
    monthly_results: results,
    generated_at: new Date().toISOString(),
  };
  cacheResult(result);
  return result;
}

function buildSummary(
  results: MonthlyBacktestResult[],
  request: BacktestRequest,
  usedPvlib: boolean,
  usedFallback: boolean,
): BacktestSummary {
  const n = results.length || 1;
  const totalExpected = results.reduce((s, m) => s + m.expected_kwh, 0);
  const annualExpected = (totalExpected * 12) / n;
  const peak = results.reduce(
    (max, m) => (m.expected_kwh > max.expected_kwh ? m : max),
    results[0] ?? ({ month: "", expected_kwh: 0 } as MonthlyBacktestResult),
  );
  const low = results.reduce(
    (min, m) => (m.expected_kwh < min.expected_kwh ? m : min),
    results[0] ?? ({ month: "", expected_kwh: 0 } as MonthlyBacktestResult),
  );
  const ppaRate = request.project.ppa_rate_per_kwh;

  return {
    annual_expected_kwh: Math.round(annualExpected),
    annual_capacity_factor:
      request.project.capacity_kw_dc > 0
        ? round4(annualExpected / (request.project.capacity_kw_dc * HOURS_PER_YEAR))
        : 0,
    avg_monthly_yield_kwh: Math.round(totalExpected / n),
    peak_month: peak.month,
    low_month: low.month,
    peak_to_trough_ratio:
      low.expected_kwh > 0 ? round2(peak.expected_kwh / low.expected_kwh) : 0,
    months_verified: results.filter((m) => m.status === "verified").length,
    months_flagged: results.filter((m) => m.status === "flagged").length,
    expected_engine:
      usedPvlib && usedFallback
        ? "mixed (pvlib + hay_davies fallback)"
        : usedPvlib
          ? "pvlib"
          : "hay_davies",
    estimated_annual_revenue: ppaRate ? Math.round(annualExpected * ppaRate) : undefined,
    estimated_monthly_yield_usd: ppaRate
      ? Math.round((annualExpected / 12) * ppaRate)
      : undefined,
  };
}

const round = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
