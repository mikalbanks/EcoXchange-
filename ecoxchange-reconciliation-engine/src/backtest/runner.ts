import { calculateExpectedGeneration } from "../physics/expected-generation.js";
import { getExpectedGeneration } from "../physics/pvlib-client.js";
import { reconcile } from "../reconciliation/reconcile.js";
import { assertDeviationIndependence } from "../reconciliation/independence.js";
import { fetchNasaPowerDaily } from "../ingestion/nasa-power.js";
import { DEFAULT_TOLERANCES, type ToleranceConfig } from "../config/tolerances.js";
import { ENGINE_VERSION } from "../config/constants.js";
import { monthRange } from "../utils/dates.js";
import { randomNormal, seededRng } from "../utils/math.js";
import type {
  DailyIrradiance,
  ExpectedGenerationOutput,
  ProjectConfig,
  VerificationStatus,
} from "../utils/types.js";

type ExpectedEngine = "pvlib" | "hay_davies";

/**
 * Compute expected generation for one period. Prefers the pvlib microservice
 * (physics-grade) and falls back to the in-process Hay-Davies model when the
 * service is unreachable, so backtests still run if pvlib is down.
 * Set PVLIB_DISABLED=1 to force the in-process model.
 */
async function computeExpected(
  project: ProjectConfig,
  period_start: string,
  period_end: string,
  daily: DailyIrradiance[],
): Promise<{ output: ExpectedGenerationOutput; engine: ExpectedEngine }> {
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
    const output: ExpectedGenerationOutput = {
      period_start,
      period_end,
      expected_kwh: r.total_expected_kwh,
      daily_breakdown: [],
      assumptions: {
        degradation_factor: Number(r.system_summary.degradation_factor ?? 1),
        system_losses: project.system_losses,
        albedo: Number(r.system_summary.albedo ?? 0.2),
        transposition_model: String(
          r.model_metadata.transposition_model ?? "perez",
        ),
      },
    };
    return { output, engine: "pvlib" };
  } catch (err) {
    console.warn(
      `pvlib service unavailable (${err instanceof Error ? err.message : err}); ` +
        "falling back to in-process Hay-Davies model",
    );
    return { output: localFallback(), engine: "hay_davies" };
  }
}

/**
 * Per-month escape hatch from the series-wide noise policy (Spec 19 §3.2).
 *
 * A demo where every month passes proves the engine can say yes. It does not
 * prove the engine can say no, which is the only property that matters. These
 * overrides let a run compose a series that exercises both verdicts and the
 * two-way degrade path, without hand-writing records.
 */
export interface BacktestMonthOverride {
  /** Force this month's INV deviation, ignoring the series noise policy. */
  deviation_pct?: number;
  /**
   * Drop the utility leg for this month. `reconcile()` then runs the two-way
   * inverter-vs-satellite check (see reconcile.ts STEP 4) and notes the absence
   * in flag_reasons without failing the month.
   */
  utility_missing?: boolean;
}

export interface BacktestSimulation {
  monthly_deviation_pct: number | "random_normal";
  random_std_dev?: number;
  seed?: number;
  /** Keyed by period start, "YYYY-MM-DD". */
  month_overrides?: Record<string, BacktestMonthOverride>;
  /**
   * Opt out of the G1 independence assertion for a deliberate 0%-deviation run.
   *
   * Engine spec §5.6 acceptance criterion 3 requires such a run to prove the
   * engine raises no false flags, so it is legitimate — but its output is the
   * exact shape of the fixture that reached production
   * (docs/spec-19-diagnostic.md). Setting this is an explicit statement that the
   * caller knows the series is degenerate and will not persist or publish it.
   *
   * Never set it on a path that writes to the database or a demo fixture.
   */
  acknowledge_zero_deviation?: boolean;
}

export interface BacktestConfig {
  project: ProjectConfig;
  start_month: string;
  end_month: string;
  simulation: BacktestSimulation;
  tolerances?: ToleranceConfig;
}

export interface BacktestMonthResult {
  month: string;
  ghi_kwh_m2: number;
  expected_kwh: number;
  simulated_inverter_kwh: number;
  /** Null when the month's utility leg was deliberately omitted. */
  simulated_utility_kwh: number | null;
  deviation_applied_pct: number;
  inv_vs_expected_pct: number | null;
  status: VerificationStatus;
  flag_reasons: string[];
}

export interface BacktestReport {
  title: string;
  generated_at: string;
  engine_version: string;
  system: {
    name: string;
    location: string;
    capacity_kw_dc: number;
    configuration: string;
  };
  summary: {
    months_tested: number;
    months_verified: number;
    months_flagged: number;
    total_expected_kwh: number;
    total_simulated_kwh: number;
    mean_monthly_expected_kwh: number;
    annual_expected_kwh: number;
    annual_expected_mwh: number;
    capacity_factor_pct: number;
    mean_deviation_pct: number;
    expected_engine: string;
  };
  monthly_results: BacktestMonthResult[];
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestReport> {
  const months = monthRange(config.start_month, config.end_month);
  const tolerances = config.tolerances ?? DEFAULT_TOLERANCES;
  const rng = seededRng(config.simulation.seed ?? 0xC0FFEE);
  const results: BacktestMonthResult[] = [];
  let usedFallback = false;
  let usedPvlib = false;

  for (const m of months) {
    const irradiance = await fetchNasaPowerDaily(
      config.project.latitude,
      config.project.longitude,
      m.start,
      m.end,
    );

    const { output: expected, engine } = await computeExpected(
      config.project,
      m.start,
      m.end,
      irradiance.daily,
    );
    if (engine === "pvlib") usedPvlib = true;
    else usedFallback = true;

    // Always draw, even when overridden, so adding or changing an override
    // does not shift every later month's noise.
    const drawn =
      config.simulation.monthly_deviation_pct === "random_normal"
        ? randomNormal(0, config.simulation.random_std_dev ?? 3, rng)
        : config.simulation.monthly_deviation_pct;

    const override = config.simulation.month_overrides?.[m.start];
    const deviation_pct = override?.deviation_pct ?? drawn;

    const simulated_inverter_kwh = expected.expected_kwh * (1 + deviation_pct / 100);
    const simulated_utility_kwh = override?.utility_missing
      ? null
      : simulated_inverter_kwh * 0.97;

    const verification = reconcile({
      project: config.project,
      period_start: m.start,
      period_end: m.end,
      inverter_reading: {
        kwh_gross: simulated_inverter_kwh,
        data_quality: "complete",
        raw_response: { simulated: true, deviation_pct },
      },
      utility_reading:
        simulated_utility_kwh === null
          ? null
          : {
              kwh_net: simulated_utility_kwh,
              data_quality: "complete",
              raw_response: { simulated: true },
            },
      expected_generation: expected,
      tolerances,
    });

    results.push({
      month: m.start,
      ghi_kwh_m2: irradiance.monthly_total_ghi,
      expected_kwh: expected.expected_kwh,
      simulated_inverter_kwh,
      simulated_utility_kwh,
      deviation_applied_pct: deviation_pct,
      inv_vs_expected_pct: verification.inv_vs_expected_pct,
      status: verification.status,
      flag_reasons: verification.flag_reasons,
    });
  }

  // Spec 19 G1. Fail the run before any caller can persist or publish a series
  // where INV and EXP are not independent — a `monthly_deviation_pct: 0` run is
  // legitimate for proving the engine raises no false flags, but it must never
  // be mistaken for engine output. This throws; it does not warn.
  if (!config.simulation.acknowledge_zero_deviation) {
    assertDeviationIndependence(
      results.map((r) => ({
        period_start: r.month,
        inv_vs_expected_pct: r.inv_vs_expected_pct,
      })),
    );
  }

  const total_expected_kwh = results.reduce((s, r) => s + r.expected_kwh, 0);
  const total_simulated_kwh = results.reduce(
    (s, r) => s + r.simulated_inverter_kwh,
    0,
  );
  const months_tested = results.length;
  const months_verified = results.filter((r) => r.status === "verified").length;
  const months_flagged = results.filter((r) => r.status === "flagged").length;
  const annual_expected_kwh =
    months_tested > 0 ? (total_expected_kwh * 12) / months_tested : 0;
  const hours_in_year = 8760;
  const capacity_factor_pct =
    config.project.capacity_kw_dc > 0
      ? (annual_expected_kwh / (config.project.capacity_kw_dc * hours_in_year)) * 100
      : 0;
  const mean_deviation_pct =
    results.length > 0
      ? results.reduce(
          (s, r) =>
            s +
            (r.expected_kwh > 0
              ? Math.abs(
                  (r.simulated_inverter_kwh - r.expected_kwh) / r.expected_kwh,
                ) * 100
              : 0),
          0,
        ) / results.length
      : 0;

  return {
    title: "EcoXchange Verification Engine Backtest Report",
    generated_at: new Date().toISOString(),
    engine_version: ENGINE_VERSION,
    system: {
      name: config.project.name ?? "Unnamed",
      location: `${config.project.latitude.toFixed(2)}°, ${config.project.longitude.toFixed(2)}°`,
      capacity_kw_dc: config.project.capacity_kw_dc,
      configuration:
        `${config.project.tilt_deg}° tilt, ${config.project.azimuth_deg}° azimuth, ` +
        `${(config.project.module_efficiency * 100).toFixed(0)}% module eff., ` +
        `${(config.project.system_losses * 100).toFixed(0)}% system losses`,
    },
    summary: {
      months_tested,
      months_verified,
      months_flagged,
      total_expected_kwh,
      total_simulated_kwh,
      mean_monthly_expected_kwh:
        months_tested > 0 ? total_expected_kwh / months_tested : 0,
      annual_expected_kwh,
      annual_expected_mwh: annual_expected_kwh / 1000,
      capacity_factor_pct,
      mean_deviation_pct,
      expected_engine:
        usedPvlib && usedFallback
          ? "mixed (pvlib + hay_davies fallback)"
          : usedPvlib
            ? "pvlib"
            : "hay_davies",
    },
    monthly_results: results,
  };
}
