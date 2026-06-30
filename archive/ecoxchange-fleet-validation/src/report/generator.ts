import type {
  BatchBacktestError,
  BatchBacktestReport,
  JoinedPlantRecord,
  PlantBacktestResult,
} from "../utils/types.js";
import {
  safeCorrelation,
  safeMean,
  safeMedian,
  safeStdDev,
} from "./statistics.js";
import { inferOutlierCause } from "../backtest/outlier-analysis.js";
import { capacityBand } from "../backtest/parameters.js";

const ENGINE_VERSION = "0.1.0";

export interface GenerateReportInput {
  results: PlantBacktestResult[];
  errors: BatchBacktestError[];
  joined: JoinedPlantRecord[];
  totalInUspvdb: number;
  totalInBand: number;
  sources: {
    uspvdb_version: string;
    eia860_year: number;
    eia923_year: number;
    irradiance: string;
  };
  pvdaqRefinedCount: number;
}

interface SegmentAccumulator {
  count: number;
  devs: number[];
  within10: number;
}

function emptySegment(): SegmentAccumulator {
  return { count: 0, devs: [], within10: 0 };
}

function summarizeSegment(s: SegmentAccumulator) {
  return {
    count: s.count,
    mean_deviation_pct: safeMean(s.devs),
    pct_within_10: s.count > 0 ? (s.within10 / s.count) * 100 : 0,
  };
}

export function buildReport(input: GenerateReportInput): BatchBacktestReport {
  const { results, errors, joined, sources, pvdaqRefinedCount } = input;
  const successful = results.length;
  const totalCapacityMw = joined.reduce(
    (s, p) => s + p.capacity_dc_mw,
    0,
  );
  const statesSet = new Set(joined.map((p) => p.state));

  const techBreakdown = {
    crystalline: 0,
    thin_film: 0,
    other: 0,
  };
  const axisBreakdown = {
    fixed: 0,
    single_tracking: 0,
    dual_tracking: 0,
  };
  for (const p of joined) {
    if (p.panel_technology === "Crystalline Silicon")
      techBreakdown.crystalline += 1;
    else if (p.panel_technology === "Thin Film")
      techBreakdown.thin_film += 1;
    else techBreakdown.other += 1;
    if (p.axis_type === "Fixed") axisBreakdown.fixed += 1;
    else if (p.axis_type === "Single Axis Tracking")
      axisBreakdown.single_tracking += 1;
    else axisBreakdown.dual_tracking += 1;
  }

  // Validation
  const devs = results.map((r) => r.deviationPct);
  const absDevs = devs.map((d) => Math.abs(d));
  const overestimates = devs.filter((d) => d > 0);
  const underestimates = devs.filter((d) => d < 0);
  const expectedCfs = results.map((r) => r.expectedCapacityFactor);
  const actualCfs = results.map((r) => r.actualCapacityFactor);

  const within5 = results.filter((r) => Math.abs(r.deviationPct) <= 5).length;
  const within10 = results.filter((r) => r.withinTenPercent).length;
  const within15 = results.filter((r) => r.withinFifteenPercent).length;
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

  // Segments
  const byState = new Map<string, SegmentAccumulator>();
  const byBand = new Map<string, SegmentAccumulator>();
  const byTech = new Map<string, SegmentAccumulator>();
  const byAxis = new Map<string, SegmentAccumulator>();

  for (const r of results) {
    const p = r.plant;
    const tally = (m: Map<string, SegmentAccumulator>, key: string) => {
      const acc = m.get(key) ?? emptySegment();
      acc.count += 1;
      acc.devs.push(r.deviationPct);
      if (r.withinTenPercent) acc.within10 += 1;
      m.set(key, acc);
    };
    tally(byState, p.state || "Unknown");
    tally(byBand, capacityBand(p.capacity_dc_mw));
    tally(byTech, p.panel_technology);
    tally(byAxis, p.axis_type);
  }

  // Outliers
  const overSorted = [...results].sort(
    (a, b) => b.deviationPct - a.deviationPct,
  );
  const underSorted = [...results].sort(
    (a, b) => a.deviationPct - b.deviationPct,
  );
  const topN = 10;
  const worst_overestimates = overSorted
    .filter((r) => r.deviationPct > 0)
    .slice(0, topN)
    .map((r) => ({
      name: r.plant.name,
      state: r.plant.state,
      deviation_pct: r.deviationPct,
      likely_cause: inferOutlierCause(r),
    }));
  const worst_underestimates = underSorted
    .filter((r) => r.deviationPct < 0)
    .slice(0, topN)
    .map((r) => ({
      name: r.plant.name,
      state: r.plant.state,
      deviation_pct: r.deviationPct,
      likely_cause: inferOutlierCause(r),
    }));

  return {
    title: "EcoXchange Engine Validation Against U.S. Solar Fleet",
    generated_at: new Date().toISOString(),
    engine_version: ENGINE_VERSION,
    sources,
    fleet: {
      total_plants_in_uspvdb: input.totalInUspvdb,
      plants_in_1_20mw_band: input.totalInBand,
      plants_with_eia923_data: joined.length,
      plants_successfully_backtested: successful,
      plants_errored: errors.length,
      total_capacity_mw: Math.round(totalCapacityMw * 10) / 10,
      states_represented: statesSet.size,
      technology_breakdown: techBreakdown,
      axis_breakdown: axisBreakdown,
      pvdaq_refined: pvdaqRefinedCount,
    },
    validation: {
      mean_deviation_pct: safeMean(devs),
      median_deviation_pct: safeMedian(devs),
      mean_absolute_deviation_pct: safeMean(absDevs),
      std_dev_deviation_pct: safeStdDev(devs),
      plants_within_5pct: within5,
      plants_within_10pct: within10,
      plants_within_15pct: within15,
      pct_within_5: pct(within5, successful),
      pct_within_10: pct(within10, successful),
      pct_within_15: pct(within15, successful),
      overestimate_count: overestimates.length,
      underestimate_count: underestimates.length,
      mean_overestimate_pct: safeMean(overestimates),
      mean_underestimate_pct: safeMean(underestimates),
      mean_expected_cf: safeMean(expectedCfs),
      mean_actual_cf: safeMean(actualCfs),
      cf_correlation: safeCorrelation(expectedCfs, actualCfs),
    },
    by_state: Array.from(byState.entries())
      .map(([state, s]) => ({ state, ...summarizeSegment(s) }))
      .sort((a, b) => b.count - a.count),
    by_capacity_band: Array.from(byBand.entries())
      .map(([band, s]) => ({ band, ...summarizeSegment(s) }))
      .sort((a, b) => b.count - a.count),
    by_technology: Array.from(byTech.entries()).map(([technology, s]) => ({
      technology,
      ...summarizeSegment(s),
    })),
    by_axis: Array.from(byAxis.entries()).map(([axis_type, s]) => ({
      axis_type,
      ...summarizeSegment(s),
    })),
    plants: results.map((r) => ({
      eia_plant_id: r.plant.eia_plant_id,
      name: r.plant.name,
      state: r.plant.state,
      capacity_mw: r.plant.capacity_dc_mw,
      technology: r.plant.panel_technology,
      axis_type: r.plant.axis_type,
      expected_mwh: Math.round(r.annualExpectedMwh * 10) / 10,
      actual_mwh: Math.round(r.annualActualMwh * 10) / 10,
      deviation_pct: Math.round(r.deviationPct * 100) / 100,
      expected_cf: Math.round(r.expectedCapacityFactor * 100) / 100,
      actual_cf: Math.round(r.actualCapacityFactor * 100) / 100,
      within_10pct: r.withinTenPercent,
    })),
    outliers: {
      worst_overestimates,
      worst_underestimates,
    },
    errors: errors.map((e) => ({
      name: e.plant.name,
      eia_id: e.plant.eia_plant_id,
      error: e.error,
    })),
  };
}
