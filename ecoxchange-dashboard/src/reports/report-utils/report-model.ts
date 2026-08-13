// Pure data model for the developer-facing Production Verification Report
// PDF. Everything the four report pages bind to is computed here — pages
// stay dumb, and the numbers (revenue, dynamic fees, benchmark stats,
// filename) are unit-tested without touching the DOM.

import benchmark, { targetSegmentRange } from "../../data/benchmark.js";
import { DEMO_SCENARIOS, type DemoScenarioId } from "../../data/demo-scenarios.js";
import type { StoredBacktestResult } from "../../utils/backtest-store.js";
import {
  SPEC_COST,
  computeCostComparison,
  type CostComparisonResult,
} from "../../utils/cost-comparison.js";
import { slugForFilename } from "../pdf.js";

// EIA-923-derived fleet capacity-factor reference averages. These are NOT
// in benchmark-results.json (which tracks deviations, not fleet CF); they
// are cited reference values for the page-2 context chart and labeled with
// their source line there.
export const EIA_FLEET_CF = {
  target_1_20_mw_pct: 17.8, // 1–20 MW fixed-tilt fleet average
  national_avg_pct: 16.2, // national utility-scale + DG average
} as const;

export interface CfComparisonRow {
  label: string;
  pct: number;
  emphasis: boolean; // true = the project's own bar
}

export interface MonthlyBar {
  month: string; // "2024-01"
  kwh: number;
  mwhLabel: string; // "642"
}

export interface VerificationReportModel {
  // Identity / provenance
  projectName: string;
  locationLabel: string; // "Savannah, GA (32.08°N, 81.09°W)"
  stateProgram: string | null;
  reportId: string;
  reportDateLabel: string; // "July 27, 2026"
  engineVersion: string;
  sourceBadge: string; // "Satellite Backtest" | "Live Engine Backtest"
  filename: string;

  // Intake echo
  capacityKwDc: number;
  tiltDeg: number;
  azimuthDeg: number;
  moduleEfficiencyPct: number;
  systemLossesPct: number;
  offtakeLabel: string;
  ppaRate: number | undefined;
  ppaEscalatorPct: number | undefined;

  // Production
  annualMwh: number;
  capacityFactorPct: number;
  annualRevenueUsd: number;
  backtestWindowLabel: string; // "January 2024 – December 2024"
  monthlyBars: MonthlyBar[];
  maxMonthKwh: number;
  bestMonth: { label: string; kwh: number };
  worstMonth: { label: string; kwh: number };
  seasonalRatio: number;
  seasonalityLabel: string;
  cfComparison: CfComparisonRow[];

  // Benchmark (Spec 4 artifact)
  fleetSize: number;
  publicationMadPct: number;
  publicationWithin10Pct: number;
  targetSegmentMadLow: number; // 5–20 MW
  targetSegmentMadHigh: number; // 1–5 MW

  // Cost (dynamic on the project's raise)
  equityRaiseUsd: number;
  cost: CostComparisonResult;
  allInYear1Usd: number; // ecoxchange origination + first-year platform fee
}

const OFFTAKE_LABELS: Record<string, string> = {
  ppa: "Power Purchase Agreement",
  community_solar: "Community Solar",
  net_metering: "Net Metering",
  merchant: "Merchant",
};

function monthLong(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function coordsLabel(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
}

function pickTargetSegmentMads(): { low: number; high: number } {
  // The bucket lookup lives in shared/benchmark so the page, this report and
  // the homepage cannot drift apart. Empty buckets are already filtered out
  // there, so a missing range means the artifact itself is unusable.
  const range = targetSegmentRange();
  if (!range) {
    throw new Error(
      "benchmark artifact reports no usable 1–20 MW target-segment deviations",
    );
  }
  return range;
}

export function buildVerificationReportModel(
  result: StoredBacktestResult,
): VerificationReportModel {
  const { intake, summary, months } = result;

  // Enrich with scenario metadata when this run came from a demo scenario;
  // fall back to coordinates alone for future live-data runs.
  const scenario = DEMO_SCENARIOS[result.scenario_id as DemoScenarioId];
  const locationLabel = scenario
    ? `${scenario.location_label} (${coordsLabel(intake.latitude, intake.longitude)})`
    : coordsLabel(intake.latitude, intake.longitude);
  const stateProgram = scenario?.state_program ?? null;

  const annualKwh = summary.annual_mwh * 1000;
  const annualRevenueUsd = Math.round(
    annualKwh * (intake.ppa_rate_per_kwh ?? 0),
  );

  const maxMonthKwh = Math.max(...months.map((m) => m.expected_kwh), 1);
  const monthlyBars: MonthlyBar[] = months.map((m) => ({
    month: m.month,
    kwh: m.expected_kwh,
    mwhLabel: `${Math.round(m.expected_kwh / 1000)}`,
  }));

  const seasonalityLabel =
    summary.seasonal_ratio >= 2.2
      ? "Strong (high-latitude profile)"
      : summary.seasonal_ratio >= 1.5
        ? "Moderate (typical for latitude)"
        : "Mild (low seasonal swing)";

  const cfComparison: CfComparisonRow[] = [
    {
      label: "This project",
      pct: summary.capacity_factor_pct,
      emphasis: true,
    },
    {
      label: "EIA 1–20 MW avg",
      pct: EIA_FLEET_CF.target_1_20_mw_pct,
      emphasis: false,
    },
    {
      label: "EIA national avg",
      pct: EIA_FLEET_CF.national_avg_pct,
      emphasis: false,
    },
  ];

  const equityRaiseUsd = intake.equity_raise_target ?? 2_500_000;
  const cost = computeCostComparison(equityRaiseUsd);
  const targetMads = pickTargetSegmentMads();

  const dateStamp = new Date().toISOString().slice(0, 10);

  return {
    projectName: result.project_name,
    locationLabel,
    stateProgram,
    reportId: result.report_id,
    reportDateLabel: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    engineVersion: result.engine_version,
    sourceBadge:
      result.source === "live-engine"
        ? "Live Engine Backtest"
        : "Satellite Backtest",
    filename: `EcoXchange_Verification_Report_${slugForFilename(result.project_name)}_${dateStamp}.pdf`,

    capacityKwDc: intake.capacity_kw_dc,
    tiltDeg: intake.tilt_deg,
    azimuthDeg: intake.azimuth_deg,
    moduleEfficiencyPct: intake.module_efficiency * 100,
    systemLossesPct: intake.system_losses * 100,
    offtakeLabel:
      OFFTAKE_LABELS[intake.offtake_type ?? "community_solar"] ??
      "Community Solar",
    ppaRate: intake.ppa_rate_per_kwh,
    ppaEscalatorPct:
      intake.ppa_escalator != null ? intake.ppa_escalator * 100 : undefined,

    annualMwh: summary.annual_mwh,
    capacityFactorPct: summary.capacity_factor_pct,
    annualRevenueUsd,
    backtestWindowLabel: `${monthLong(months[0].month)} – ${monthLong(months[months.length - 1].month)}`,
    monthlyBars,
    maxMonthKwh,
    bestMonth: {
      label: monthLong(summary.best_month.month),
      kwh: summary.best_month.kwh,
    },
    worstMonth: {
      label: monthLong(summary.worst_month.month),
      kwh: summary.worst_month.kwh,
    },
    seasonalRatio: summary.seasonal_ratio,
    seasonalityLabel,
    cfComparison,

    fleetSize: benchmark.plants_succeeded,
    publicationMadPct: benchmark.publication.mean_absolute_deviation_pct,
    publicationWithin10Pct: benchmark.publication.within_10_pct_rate,
    targetSegmentMadLow: targetMads.low,
    targetSegmentMadHigh: targetMads.high,

    equityRaiseUsd,
    cost,
    allInYear1Usd: cost.ecoxchangeTotal + SPEC_COST.ecoxchangeAnnualUsd,
  };
}
