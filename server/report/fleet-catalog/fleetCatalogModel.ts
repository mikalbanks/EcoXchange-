/**
 * Data model for the EIA Solar Fleet Catalog PDF.
 *
 * Transforms the enriched benchmark results JSON (verification-engine/reports/
 * eia_fleet_benchmark_results.json) into a presentation-ready model: prime
 * (publication-cohort) plants up front, excluded plants in the back with their
 * exclusion reasons and full scores.
 */

export interface CatalogPlantRow {
  eiaPlantId: string;
  name: string;
  state: string;
  capacityMw: number;
  tiltDeg: number;
  axisType: string;
  latitude: number;
  longitude: number;
  commissioningYear: number;
  actualMwh: number;
  expectedMwh: number;
  deviationPct: number;
  absoluteDeviationPct: number;
  actualCfPct: number;
  within10pct: boolean;
  exclusionReasons: string[]; // empty for prime plants
}

export interface HistogramBin {
  label: string;
  count: number;
}

export interface CohortStats {
  n: number;
  meanAbsDevPct: number;
  medianAbsDevPct: number;
  modeAbsDevPct: number | null;
  stdDevPct: number;
  meanSignedDevPct: number;
  within5Rate: number;
  within10Rate: number;
  within15Rate: number;
}

export interface StateRow {
  state: string;
  count: number;
  meanAbsDevPct: number;
}

export interface CapacityRow {
  bucket: string;
  count: number;
  meanAbsDevPct: number | null;
}

export interface FleetCatalogModel {
  generatedDate: string;
  benchmarkDate: string;
  benchmarkYear: number;
  engineVersion: string;
  totalPlants: number;
  primeStats: CohortStats;
  fullFleetStats: CohortStats;
  excludedCurtailment: number;
  excludedUnderperformer: number;
  excludedBoth: number;
  publicationRule: string;
  histogram: HistogramBin[];
  byState: StateRow[];
  byCapacity: CapacityRow[];
  primePlants: CatalogPlantRow[];
  defectivePlants: CatalogPlantRow[];
}

interface RawPlant {
  eia_plant_id: string;
  name: string;
  state: string;
  capacity_mw: number;
  tilt_deg?: number;
  axis_type: string;
  latitude?: number;
  longitude?: number;
  commissioning_year?: number;
  actual_mwh: number;
  expected_mwh: number;
  deviation_pct: number;
  absolute_deviation_pct: number;
  actual_cf_pct: number;
  within_10pct: boolean;
}

interface RawExclusion {
  eia_plant_id: string;
  reasons: string[];
}

function toRow(p: RawPlant, reasons: string[]): CatalogPlantRow {
  return {
    eiaPlantId: p.eia_plant_id,
    name: p.name,
    state: p.state,
    capacityMw: p.capacity_mw,
    tiltDeg: p.tilt_deg ?? 0,
    axisType: p.axis_type,
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    commissioningYear: p.commissioning_year ?? 0,
    actualMwh: p.actual_mwh,
    expectedMwh: p.expected_mwh,
    deviationPct: p.deviation_pct,
    absoluteDeviationPct: p.absolute_deviation_pct,
    actualCfPct: p.actual_cf_pct,
    within10pct: p.within_10pct,
    exclusionReasons: reasons,
  };
}

function cohortStats(s: Record<string, unknown>, n: number): CohortStats {
  return {
    n,
    meanAbsDevPct: s.mean_absolute_deviation_pct as number,
    medianAbsDevPct: s.median_absolute_deviation_pct as number,
    modeAbsDevPct: (s.mode_absolute_deviation_pct as number | undefined) ?? null,
    stdDevPct: s.std_deviation_pct as number,
    meanSignedDevPct: s.mean_signed_deviation_pct as number,
    within5Rate: s.within_5_pct_rate as number,
    within10Rate: s.within_10_pct_rate as number,
    within15Rate: s.within_15_pct_rate as number,
  };
}

/** 2%-wide bins to 30%, then a single 30%+ bin. */
function buildHistogram(plants: CatalogPlantRow[]): HistogramBin[] {
  const bins: HistogramBin[] = [];
  for (let lo = 0; lo < 30; lo += 2) {
    bins.push({ label: `${lo}–${lo + 2}`, count: 0 });
  }
  const overflow: HistogramBin = { label: "30+", count: 0 };
  for (const p of plants) {
    const d = p.absoluteDeviationPct;
    if (d >= 30) overflow.count += 1;
    else bins[Math.floor(d / 2)].count += 1;
  }
  return [...bins, overflow];
}

export function buildFleetCatalogModel(raw: {
  summary: Record<string, any>;
  publication_exclusions: RawExclusion[];
  plants: RawPlant[];
}): FleetCatalogModel {
  const { summary, publication_exclusions: exclusions, plants } = raw;
  const pub = summary.publication;

  const reasonsById = new Map<string, string[]>(
    exclusions.map((e) => [e.eia_plant_id, e.reasons]),
  );

  const prime: CatalogPlantRow[] = [];
  const defective: CatalogPlantRow[] = [];
  for (const p of plants) {
    const reasons = reasonsById.get(p.eia_plant_id);
    if (reasons) defective.push(toRow(p, reasons));
    else prime.push(toRow(p, []));
  }

  // Prime: state A–Z, then largest capacity first. Defective: reason, then state.
  prime.sort(
    (a, b) => a.state.localeCompare(b.state) || b.capacityMw - a.capacityMw,
  );
  defective.sort(
    (a, b) =>
      a.exclusionReasons.join().localeCompare(b.exclusionReasons.join()) ||
      a.state.localeCompare(b.state) ||
      b.capacityMw - a.capacityMw,
  );

  return {
    generatedDate: new Date().toISOString().slice(0, 10),
    benchmarkDate: summary.benchmark_date,
    benchmarkYear: summary.benchmark_year,
    engineVersion: summary.engine_version,
    totalPlants: plants.length,
    primeStats: cohortStats(pub, pub.n),
    fullFleetStats: cohortStats(summary, summary.plants_succeeded),
    excludedCurtailment: pub.excluded_curtailment_state,
    excludedUnderperformer: pub.excluded_underperformer,
    excludedBoth: pub.excluded_both,
    publicationRule: pub.rule,
    histogram: buildHistogram(prime),
    byState: (pub.by_state ?? []).map((r: any) => ({
      state: r.state,
      count: r.count,
      meanAbsDevPct: r.mean_abs_deviation_pct,
    })),
    byCapacity: (pub.by_capacity ?? []).map((r: any) => ({
      bucket: r.bucket,
      count: r.count,
      meanAbsDevPct: r.mean_abs_deviation_pct,
    })),
    primePlants: prime,
    defectivePlants: defective,
  };
}
