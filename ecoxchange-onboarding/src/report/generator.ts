import type {
  DeveloperBacktestReport,
  MonthlyResult,
  ReconciledMonthly,
  SubmissionRow,
} from "../utils/types.js";
import { yearsBetween } from "../utils/dates.js";

const ENGINE_VERSION = "0.1.0";
const HOURS_PER_YEAR = 8760;

export interface BuildReportInput {
  submission: SubmissionRow;
  monthly: MonthlyResult[];
  reconciled: ReconciledMonthly[] | null;
  irradianceSource: string;
}

export function buildReport(input: BuildReportInput): DeveloperBacktestReport {
  const { submission, monthly, reconciled, irradianceSource } = input;
  const hasInverter = reconciled !== null;

  const records: ReconciledMonthly[] =
    reconciled ??
    monthly.map((m) => ({
      ...m,
      inverter_kwh: null,
      inv_vs_expected_pct: null,
      status: null,
      flag_reasons: [],
      estimated_revenue_usd:
        submission.ppa_rate_per_kwh !== null && submission.ppa_rate_per_kwh !== undefined
          ? m.expected_kwh * submission.ppa_rate_per_kwh
          : null,
    }));

  const expectedTotal = monthly.reduce((s, m) => s + m.expected_kwh, 0);
  const monthsTested = monthly.length;
  const annualMwh = monthsTested > 0 ? (expectedTotal * 12) / monthsTested / 1000 : 0;
  const cf =
    submission.capacity_kw_dc > 0
      ? (annualMwh * 1000) / (submission.capacity_kw_dc * HOURS_PER_YEAR) * 100
      : 0;

  const best = monthly.reduce(
    (acc, m) => (m.expected_kwh > acc.expected_kwh ? m : acc),
    monthly[0]!,
  );
  const worst = monthly.reduce(
    (acc, m) => (m.expected_kwh < acc.expected_kwh ? m : acc),
    monthly[0]!,
  );
  const seasonalRatio =
    worst.expected_kwh > 0 ? best.expected_kwh / worst.expected_kwh : 0;

  let monthsVerified: number | null = null;
  let monthsFlagged: number | null = null;
  let meanDeviation: number | null = null;
  let maxDeviation: number | null = null;
  let passRate: number | null = null;
  if (reconciled) {
    monthsVerified = reconciled.filter((r) => r.status === "verified").length;
    monthsFlagged = reconciled.filter((r) => r.status === "flagged").length;
    const devs = reconciled
      .map((r) => r.inv_vs_expected_pct)
      .filter((v): v is number => v !== null);
    meanDeviation =
      devs.length > 0
        ? devs.reduce((s, v) => s + Math.abs(v), 0) / devs.length
        : 0;
    maxDeviation =
      devs.length > 0 ? devs.reduce((m, v) => Math.max(m, Math.abs(v)), 0) : 0;
    passRate =
      reconciled.length > 0
        ? (monthsVerified / reconciled.length) * 100
        : null;
  }

  const annualRevenue =
    submission.ppa_rate_per_kwh !== null && submission.ppa_rate_per_kwh !== undefined
      ? annualMwh * 1000 * submission.ppa_rate_per_kwh
      : null;
  const monthlyDistribution = annualRevenue !== null ? annualRevenue / 12 : null;
  const yieldOnEquity =
    annualRevenue !== null && submission.equity_raise_target
      ? (annualRevenue / submission.equity_raise_target) * 100
      : null;

  const age = yearsBetween(submission.commissioning_date);

  const periodStart = monthly[0]?.month ?? "";
  const periodEnd = monthly[monthly.length - 1]?.month ?? "";

  return {
    title: "EcoXchange Production Backtest Report",
    generated_at: new Date().toISOString(),
    engine_version: ENGINE_VERSION,
    developer: {
      name: submission.developer_name,
      company: submission.developer_company ?? null,
      email: submission.developer_email,
    },
    system: {
      name: submission.project_name,
      location: `${submission.latitude.toFixed(2)}°N, ${Math.abs(submission.longitude).toFixed(2)}°W`,
      capacity_kw_dc: submission.capacity_kw_dc,
      configuration: `${submission.tilt_deg}° tilt, ${submission.azimuth_deg}° azimuth, ${(submission.module_efficiency * 100).toFixed(0)}% module eff., ${(submission.system_losses * 100).toFixed(0)}% system losses`,
      commissioning_date: submission.commissioning_date,
      system_age_years: age,
    },
    summary: {
      period_tested: `${periodStart} – ${periodEnd}`,
      months_tested: monthsTested,
      irradiance_source: irradianceSource,
      has_real_inverter_data: hasInverter,
      annual_expected_mwh: annualMwh,
      capacity_factor_pct: cf,
      best_month: { month: best.month, kwh: best.expected_kwh },
      worst_month: { month: worst.month, kwh: worst.expected_kwh },
      seasonal_ratio: seasonalRatio,
      months_verified: monthsVerified,
      months_flagged: monthsFlagged,
      mean_deviation_pct: meanDeviation,
      max_deviation_pct: maxDeviation,
      verification_pass_rate_pct: passRate,
    },
    financials: {
      ppa_rate_per_kwh: submission.ppa_rate_per_kwh ?? null,
      estimated_annual_revenue_usd: annualRevenue,
      estimated_monthly_distribution_usd: monthlyDistribution,
      equity_raise_target_usd: submission.equity_raise_target ?? null,
      estimated_yield_on_equity_pct: yieldOnEquity,
      developer_cost_comparison: {
        traditional_all_in_cost_usd: "$325,000–$500,000",
        ecoxchange_estimated_cost_usd: "$125,000–$175,000",
        savings_pct: "55–65%",
        time_to_capital_traditional: "3–9 months",
        time_to_capital_ecoxchange: "2–6 weeks",
      },
    },
    monthly: records,
    next_steps: {
      step_1: "Review this report with EcoXchange",
      step_2: "Sign a Letter of Intent",
      step_3: "EcoXchange forms project SPV and prepares Reg D 506(c) offering",
      step_4: "Offering goes live to pre-onboarded accredited investors",
      contact_email: "mikal@ecoxchange.net",
      contact_name: "Mikal Banks",
    },
  };
}
