// The single canonical benchmark result object.
//
// `benchmark-results.json` is produced by the engine repo's `run_eia_benchmark`
// and committed here verbatim. Both front ends read it through this module:
// `client/` via the `@shared/*` alias, `ecoxchange-dashboard/` via
// `src/data/benchmark.ts`. Nothing may hard-code a benchmark statistic in a
// component — a figure that appears on the homepage, the benchmark page and the
// exported PDF has to be the same figure, and the only way to guarantee that is
// for all three to resolve it from here.
//
// Two cohorts are reported and they are NOT interchangeable:
//
//   full fleet  — every plant the run succeeded on (n=5,065). Mean absolute
//                 deviation ±13.0%.
//   publication — the healthy-fleet cohort (n=3,882) after the documented
//                 curtailment-state and severe-underperformer exclusions.
//                 Mean absolute deviation ±9.8%.
//
// The headline cites the publication cohort; the full-fleet figure is always
// disclosed alongside it. Never label one with the other's number.

import raw from "./benchmark-results.json";

export interface CapacityBucket {
  bucket: string;
  count: number;
  /** null when the bucket is empty (e.g. "< 1 MW", 0 plants). */
  mean_abs_deviation_pct: number | null;
}

export interface StateRow {
  state: string;
  count: number;
  mean_abs_deviation_pct: number;
  median_abs_deviation_pct: number;
}

export interface PublicationCohort {
  /** Verbatim exclusion rule, rendered as-is next to the results. */
  rule: string;
  n: number;
  excluded_total: number;
  excluded_curtailment_state: number;
  excluded_underperformer: number;
  excluded_both: number;
  mean_absolute_deviation_pct: number;
  median_absolute_deviation_pct: number;
  mode_absolute_deviation_pct: number;
  std_deviation_pct: number;
  mean_signed_deviation_pct: number;
  within_5_pct: number;
  within_5_pct_rate: number;
  within_10_pct: number;
  within_10_pct_rate: number;
  within_15_pct: number;
  within_15_pct_rate: number;
  within_20_pct: number;
  within_20_pct_rate: number;
  by_state: StateRow[];
  by_capacity: CapacityBucket[];
}

export interface BenchmarkResults {
  engine_version: string;
  benchmark_date: string;
  benchmark_year: number;
  data_source: string;
  irradiance_source: string;
  plants_attempted: number;
  plants_succeeded: number;
  plants_failed: number;
  success_rate_pct: number;
  benchmark_valid: boolean;
  validation_gate_pct: number;
  validated: boolean;
  mean_absolute_deviation_pct: number;
  median_absolute_deviation_pct: number;
  mode_absolute_deviation_pct: number;
  std_deviation_pct: number;
  mean_signed_deviation_pct: number;
  within_5_pct: number;
  within_5_pct_rate: number;
  within_10_pct: number;
  within_10_pct_rate: number;
  within_15_pct: number;
  within_15_pct_rate: number;
  within_20_pct: number;
  within_20_pct_rate: number;
  by_state: StateRow[];
  by_capacity: CapacityBucket[];
  publication: PublicationCohort;
  cohorts: Record<string, Record<string, number>>;
}

export const BENCHMARK = raw as unknown as BenchmarkResults;

/** The healthy-fleet cohort the headline figures cite. */
export const PUBLICATION = BENCHMARK.publication;

// ── Headline figures ────────────────────────────────────────────────────────
// Every one of these is rendered on more than one surface. Import the constant.

export const ENGINE_VERSION_BENCHMARKED = BENCHMARK.engine_version;
export const BENCHMARK_DATE = BENCHMARK.benchmark_date;
export const BENCHMARK_YEAR = BENCHMARK.benchmark_year;

/** 5,065 — plants the run succeeded on. */
export const PLANTS_TESTED = BENCHMARK.plants_succeeded;
export const RUN_SUCCESS_RATE_PCT = BENCHMARK.success_rate_pct;

/** ±9.8% — publication-cohort mean absolute deviation. */
export const PUBLICATION_MAD_PCT = PUBLICATION.mean_absolute_deviation_pct;
/** 3,882 — publication-cohort size. */
export const PUBLICATION_N = PUBLICATION.n;
/** 66.3% — share of the publication cohort within ±10%. */
export const PUBLICATION_WITHIN_10_RATE = PUBLICATION.within_10_pct_rate;
/** 2,572 — plants behind that 66.3%. */
export const PUBLICATION_WITHIN_10_COUNT = PUBLICATION.within_10_pct;

/** ±13.0% — full-fleet mean absolute deviation. Always shown alongside ±9.8%. */
export const FULL_FLEET_MAD_PCT = BENCHMARK.mean_absolute_deviation_pct;

// ── Target segment ──────────────────────────────────────────────────────────

/**
 * The 1–20 MW origination band, as two capacity buckets. Note the EN DASH —
 * these strings must match `by_capacity[].bucket` exactly, which is why the
 * lookup lives here instead of being re-typed at each call site.
 */
export const TARGET_BUCKETS = ["1–5 MW", "5–20 MW"] as const;

export interface TargetSegmentBucket {
  bucket: string;
  count: number;
  meanAbsDeviationPct: number;
}

/**
 * Publication-cohort results for the 1–20 MW target segment, in bucket order:
 * 1–5 MW (±9.7%, n=2,094) then 5–20 MW (±9.2%, n=1,190).
 *
 * Buckets with no reportable deviation are dropped rather than coerced to 0 —
 * a card reading "±0.0%" is worse than a card that is not there.
 */
export function targetSegment(): TargetSegmentBucket[] {
  return TARGET_BUCKETS.flatMap((bucket) => {
    const row = PUBLICATION.by_capacity.find((b) => b.bucket === bucket);
    const mad = row?.mean_abs_deviation_pct;
    return row && typeof mad === "number" && Number.isFinite(mad) && mad > 0
      ? [{ bucket: row.bucket, count: row.count, meanAbsDeviationPct: mad }]
      : [];
  });
}

/**
 * Count-weighted mean absolute deviation across the whole 1–20 MW band, for
 * prose that cites the segment as one number rather than two.
 */
export function targetSegmentWeightedMad(): number | null {
  const buckets = targetSegment();
  const n = buckets.reduce((sum, b) => sum + b.count, 0);
  if (n === 0) return null;
  return (
    buckets.reduce((sum, b) => sum + b.count * b.meanAbsDeviationPct, 0) / n
  );
}

/** Lowest and highest target-segment deviation, for "±9.2–9.7%" prose. */
export function targetSegmentRange(): { low: number; high: number } | null {
  const values = targetSegment().map((b) => b.meanAbsDeviationPct);
  if (values.length === 0) return null;
  return { low: Math.min(...values), high: Math.max(...values) };
}

/** True when a plant's capacity sits inside EcoXchange's 1–20 MW band. */
export function isTargetCapacity(capacityKw: number): boolean {
  return capacityKw >= 1_000 && capacityKw <= 20_000;
}
