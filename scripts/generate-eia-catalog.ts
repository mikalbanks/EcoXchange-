/**
 * Generate the EIA Solar Catalog JSON from enriched benchmark results.
 *
 * Reads the full fleet benchmark, extracts the publication (prime) cohort,
 * derives indicative pricing from NREL benchmarks and regional PPA rates,
 * and writes a static JSON catalog for the dashboard.
 *
 * Usage:
 *   npx tsx scripts/generate-eia-catalog.ts
 */
import * as fs from "fs";
import * as path from "path";

// NREL installed cost benchmarks (2024, $/Wdc) by capacity segment
const COST_PER_WATT: Record<string, number> = {
  "tiny": 1.30,   // < 1 MW
  "small": 1.10,  // 1–5 MW
  "mid": 0.95,    // 5–20 MW
  "large": 0.85,  // 20–100 MW
  "utility": 0.75, // 100+ MW
};

function costBucket(mw: number): string {
  if (mw < 1) return "tiny";
  if (mw < 5) return "small";
  if (mw < 20) return "mid";
  if (mw < 100) return "large";
  return "utility";
}

// State-level average PPA rates ($/kWh, approximate 2024 values)
const STATE_PPA_RATES: Record<string, number> = {
  AL: 0.065, AZ: 0.055, AR: 0.060, CA: 0.080, CO: 0.060,
  CT: 0.095, DE: 0.085, FL: 0.065, GA: 0.070, HI: 0.120,
  ID: 0.055, IL: 0.070, IN: 0.065, IA: 0.055, KS: 0.055,
  KY: 0.060, LA: 0.060, ME: 0.090, MD: 0.080, MA: 0.095,
  MI: 0.070, MN: 0.065, MS: 0.060, MO: 0.060, MT: 0.055,
  NE: 0.055, NV: 0.060, NH: 0.090, NJ: 0.085, NM: 0.055,
  NY: 0.090, NC: 0.065, ND: 0.055, OH: 0.065, OK: 0.055,
  OR: 0.060, PA: 0.075, RI: 0.095, SC: 0.065, SD: 0.055,
  TN: 0.065, TX: 0.055, UT: 0.055, VT: 0.090, VA: 0.070,
  WA: 0.055, WV: 0.065, WI: 0.065, WY: 0.055, DC: 0.085,
  PR: 0.100, GU: 0.100, VI: 0.120, AS: 0.100,
};
const DEFAULT_PPA_RATE = 0.065;

interface BenchmarkPlant {
  eia_plant_id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity_mw: number;
  capacity_ac_mw: number | null;
  tilt_deg: number;
  azimuth_deg: number;
  axis_type: string;
  panel_technology: string;
  commissioning_year: number;
  actual_mwh: number;
  expected_mwh: number;
  actual_cf_pct: number;
  expected_cf_pct: number;
  deviation_pct: number;
  absolute_deviation_pct: number;
  within_10pct: boolean;
  within_5pct: boolean;
  high_curtailment: boolean;
}

interface Exclusion {
  eia_plant_id: string;
  reasons: string[];
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const resultsPath = path.join(repoRoot, "verification-engine", "reports", "eia_fleet_benchmark_results.json");
const outPath = path.join(repoRoot, "ecoxchange-dashboard", "src", "data", "eia-catalog.json");

const raw = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
const allPlants: BenchmarkPlant[] = raw.plants;
const exclusions: Exclusion[] = raw.publication_exclusions;
const summary = raw.summary;

const excludedIds = new Set(exclusions.map((e: Exclusion) => e.eia_plant_id));
const primePlants = allPlants.filter((p) => !excludedIds.has(p.eia_plant_id));

console.log(`[info] Total plants: ${allPlants.length}, prime cohort: ${primePlants.length}`);

const catalog = primePlants.map((p) => {
  const ppaRate = STATE_PPA_RATES[p.state] ?? DEFAULT_PPA_RATE;
  const costPerW = COST_PER_WATT[costBucket(p.capacity_mw)];
  const indicativeValue = Math.round(p.capacity_mw * 1_000_000 * costPerW);
  const impliedRevenue = Math.round(p.actual_mwh * 1000 * ppaRate);

  return {
    eia_plant_id: p.eia_plant_id,
    name: p.name,
    state: p.state,
    latitude: p.latitude,
    longitude: p.longitude,
    capacity_mw: p.capacity_mw,
    capacity_ac_mw: p.capacity_ac_mw,
    tilt_deg: p.tilt_deg,
    azimuth_deg: p.azimuth_deg,
    axis_type: p.axis_type,
    panel_technology: p.panel_technology,
    commissioning_year: p.commissioning_year,
    actual_mwh: p.actual_mwh,
    expected_mwh: p.expected_mwh,
    actual_cf_pct: p.actual_cf_pct,
    expected_cf_pct: p.expected_cf_pct,
    deviation_pct: p.deviation_pct,
    absolute_deviation_pct: p.absolute_deviation_pct,
    within_10pct: p.within_10pct,
    within_5pct: p.within_5pct,
    indicative_value_usd: indicativeValue,
    implied_annual_revenue_usd: impliedRevenue,
  };
});

const pub = summary.publication;
const output = {
  generated_at: new Date().toISOString(),
  engine_version: summary.engine_version,
  benchmark_year: summary.benchmark_year,
  stats: {
    total_plants: catalog.length,
    mean_absolute_deviation_pct: pub.mean_absolute_deviation_pct,
    median_absolute_deviation_pct: pub.median_absolute_deviation_pct,
    mode_absolute_deviation_pct: pub.mode_absolute_deviation_pct ?? null,
    std_deviation_pct: pub.std_deviation_pct,
    within_5_pct_rate: pub.within_5_pct_rate,
    within_10_pct_rate: pub.within_10_pct_rate,
  },
  plants: catalog,
};

fs.writeFileSync(outPath, JSON.stringify(output));
const sizeMb = (fs.statSync(outPath).size / 1_048_576).toFixed(1);
console.log(`[done] Wrote ${catalog.length} entries to ${outPath} (${sizeMb} MB)`);
