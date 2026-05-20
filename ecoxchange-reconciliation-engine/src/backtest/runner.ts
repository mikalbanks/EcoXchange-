import { calculateExpectedGeneration } from "../physics/expected-generation.js";
import { reconcile } from "../reconciliation/reconcile.js";
import { fetchNasaPowerDaily } from "../ingestion/nasa-power.js";
import { DEFAULT_TOLERANCES, type ToleranceConfig } from "../config/tolerances.js";
import { ENGINE_VERSION } from "../config/constants.js";
import { monthRange } from "../utils/dates.js";
import { randomNormal, seededRng } from "../utils/math.js";
import type { ProjectConfig, VerificationStatus } from "../utils/types.js";

export interface BacktestSimulation {
  monthly_deviation_pct: number | "random_normal";
  random_std_dev?: number;
  seed?: number;
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
  simulated_utility_kwh: number;
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
  };
  monthly_results: BacktestMonthResult[];
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestReport> {
  const months = monthRange(config.start_month, config.end_month);
  const tolerances = config.tolerances ?? DEFAULT_TOLERANCES;
  const rng = seededRng(config.simulation.seed ?? 0xC0FFEE);
  const results: BacktestMonthResult[] = [];

  for (const m of months) {
    const irradiance = await fetchNasaPowerDaily(
      config.project.latitude,
      config.project.longitude,
      m.start,
      m.end,
    );

    const expected = calculateExpectedGeneration({
      ...config.project,
      period_start: m.start,
      period_end: m.end,
      daily_irradiance: irradiance.daily,
    });

    let deviation_pct: number;
    if (config.simulation.monthly_deviation_pct === "random_normal") {
      deviation_pct = randomNormal(0, config.simulation.random_std_dev ?? 3, rng);
    } else {
      deviation_pct = config.simulation.monthly_deviation_pct;
    }

    const simulated_inverter_kwh = expected.expected_kwh * (1 + deviation_pct / 100);
    const simulated_utility_kwh = simulated_inverter_kwh * 0.97;

    const verification = reconcile({
      project: config.project,
      period_start: m.start,
      period_end: m.end,
      inverter_reading: {
        kwh_gross: simulated_inverter_kwh,
        data_quality: "complete",
        raw_response: { simulated: true, deviation_pct },
      },
      utility_reading: {
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
    },
    monthly_results: results,
  };
}
