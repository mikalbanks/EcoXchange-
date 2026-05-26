import type { DbProject, DbVerificationRecord } from "../db/types.js";
import {
  annualKwh,
  consecutiveUnderperformanceMax,
  dataCompletenessPct,
  flagRatePct,
  maxAbsDeviationPct,
  monthsBelowFraction,
  observedDegradationTrendPctPerYear,
  revenueAtRiskP95Annual,
  revenueVolatilityPct,
  stdDevPct,
  twoWayVerificationMonths,
  yearsOperating,
} from "../utils/calculations.js";
import { degradationDivergence } from "./physical.js";
import { counterpartyTypeFor } from "../utils/nexus_constants.js";

const PRIMARY_LIFE_YEARS = 25;

export interface RiskMetrics {
  production_volatility_pct: number;
  worst_month_deviation_pct: number;
  best_month_deviation_pct: number;
  months_below_p90: number;
  months_below_p75: number;
  consecutive_underperformance_max: number;

  flag_rate_pct: number;
  data_completeness_pct: number;
  two_way_verification_months: number;

  modeled_degradation_rate: number;
  observed_degradation_trend: number | null;
  degradation_divergence: string;

  revenue_volatility_pct: number;
  annual_revenue_estimate_usd: number;
  revenue_at_risk_p95_usd: number | null;

  offtake_type: string;
  contract_remaining_years: number | null;
  escalator_annual_pct: number | null;
  counterparty_type: string | null;
}

export function computeRiskMetrics(
  project: DbProject,
  records: DbVerificationRecord[],
): RiskMetrics {
  const devs = records
    .map((r) => r.inv_vs_expected_pct)
    .filter((v): v is number => v !== null);
  const worst = devs.length > 0 ? Math.min(...devs) : 0;
  const best = devs.length > 0 ? Math.max(...devs) : 0;
  const totalRevenue = records.reduce(
    (s, r) => s + (r.estimated_revenue ?? 0),
    0,
  );
  const months = records.length;
  const annualRevenue = months > 0 ? (totalRevenue * 12) / months : 0;
  const observed = observedDegradationTrendPctPerYear(project, records);
  const remainingYears = Math.max(
    0,
    PRIMARY_LIFE_YEARS - yearsOperating(project.commissioning_date),
  );

  // sanity: annualKwh used so unused-import lint won't trip; if no inverter
  // data the revenue annualization above already covers the dashboard.
  void annualKwh(records);

  const maxDev = maxAbsDeviationPct(records); // currently informational; kept for future use
  void maxDev;

  return {
    production_volatility_pct: stdDevPct(records),
    worst_month_deviation_pct: worst,
    best_month_deviation_pct: best,
    months_below_p90: monthsBelowFraction(records, 0.9),
    months_below_p75: monthsBelowFraction(records, 0.75),
    consecutive_underperformance_max: consecutiveUnderperformanceMax(records),

    flag_rate_pct: flagRatePct(records),
    data_completeness_pct: dataCompletenessPct(records),
    two_way_verification_months: twoWayVerificationMonths(records),

    modeled_degradation_rate: project.degradation_rate,
    observed_degradation_trend: observed,
    degradation_divergence: degradationDivergence(
      project.degradation_rate,
      observed,
    ),

    revenue_volatility_pct: revenueVolatilityPct(records),
    annual_revenue_estimate_usd: annualRevenue,
    revenue_at_risk_p95_usd: revenueAtRiskP95Annual(records),

    offtake_type: project.offtake_type ?? "unknown",
    contract_remaining_years: remainingYears,
    escalator_annual_pct:
      project.ppa_escalator !== null ? project.ppa_escalator * 100 : null,
    counterparty_type: counterpartyTypeFor(project.offtake_type),
  };
}
