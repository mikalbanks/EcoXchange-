// Regenerates the Savannah demo verification datasets with realistic monthly
// noise (engine polish spec §A.1). The original seed set inverter_kwh equal
// to expected_kwh, producing an artificial 0.0% INV→EXP deviation across all
// 12 months. Real systems show ±2–5% monthly variance from weather-model
// imprecision, soiling, and transient shading.
//
// Properties of the generated data:
//   - Deterministic: seeded mulberry32 PRNG — reruns produce identical output.
//   - Realistic spread: INV→EXP mostly within ±2%, all within ±5%.
//   - Annual-sum preserving: the 2024 inverter total stays EXACTLY equal to
//     the expected total (8,102,755 kWh), so every canonical figure derived
//     from it (8,102.8 MWh YTD, 18.5% capacity factor, pro-forma revenue)
//     survives unchanged.
//   - Tolerance-safe: all verified months stay inside the engine bands
//     (INV→EXP ±15%, INV→UTL ±10%, UTL→EXP ±20%).
//
// Rewrites:
//   ecoxchange-dashboard/src/data/demo-savannah.json
//   ecoxchange-dashboard/src/data/demo-savannah-flagged.json
//   ecoxchange-reconciliation-engine/supabase/seed/001_savannah_backtest.sql
//
// Run: node scripts/generate-realistic-seed.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const SEED = 20240704;
export const PPA_RATE = 0.085;
export const UTILITY_LOSS_FACTOR = 0.03;

// ── Deterministic PRNG ────────────────────────────────────────────────────
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal draw over a uniform PRNG. */
export function makeRandomNormal(rng) {
  return (mean, std) => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

/** Bounded normal draw: redraws until |value - mean| <= cap. */
function boundedNormal(randomNormal, mean, std, cap) {
  let x = randomNormal(mean, std);
  while (Math.abs(x - mean) > cap) x = randomNormal(mean, std);
  return x;
}

// ── Verified dataset (spec §A.1) ──────────────────────────────────────────
export function generateRealisticVerificationData(baseRecords, seed = SEED) {
  const rng = mulberry32(seed);
  const randomNormal = makeRandomNormal(rng);

  // 1. Draw inverter noise per month (mean 0, std 3, hard cap ±4.9%).
  const noise = baseRecords.map(() => boundedNormal(randomNormal, 0, 3, 4.9));
  const raw = baseRecords.map((r, i) => r.expected_kwh * (1 + noise[i] / 100));

  // 2. Normalize so the annual inverter sum equals the expected sum exactly
  //    (canonical 8,102,755 kWh) — monthly deviations stay, the year nets out.
  const sumExpected = baseRecords.reduce((s, r) => s + r.expected_kwh, 0);
  const sumRaw = raw.reduce((s, x) => s + x, 0);
  const factor = sumExpected / sumRaw;
  const inverter = raw.map((x) => Math.round(x * factor));
  const residual = sumExpected - inverter.reduce((s, x) => s + x, 0);
  inverter[inverter.indexOf(Math.max(...inverter))] += residual;

  // 3. Utility = inverter minus line losses plus its own metering noise,
  //    bounded so INV→UTL stays inside the ±10% band with margin.
  return baseRecords.map((r, i) => {
    const utilNoise = boundedNormal(randomNormal, 0, 1.5, 3.5);
    const utility = Math.round(
      inverter[i] * (1 - UTILITY_LOSS_FACTOR) * (1 + utilNoise / 100),
    );
    const inv_vs_expected_pct = round2(((inverter[i] - r.expected_kwh) / r.expected_kwh) * 100);
    const inv_vs_utility_pct = round2(((inverter[i] - utility) / utility) * 100);
    const util_vs_expected_pct = round2(((utility - r.expected_kwh) / r.expected_kwh) * 100);
    return {
      ...r,
      inverter_kwh: inverter[i],
      utility_kwh: utility,
      inv_vs_expected_pct,
      inv_vs_utility_pct,
      util_vs_expected_pct,
      status: "verified",
      flag_reasons: [],
      estimated_revenue: Math.round(inverter[i] * PPA_RATE),
    };
  });
}

// ── Flagged dataset (same realism, deliberately out-of-tolerance) ─────────
export function generateFlaggedVerificationData(baseRecords, seed = SEED + 1) {
  const rng = mulberry32(seed);
  const randomNormal = makeRandomNormal(rng);

  return baseRecords.map((r) => {
    // Underperformance centered at -20% with month-to-month variation,
    // kept in [-24, -17] so every month breaches the -15% INV→EXP band.
    const shortfall = boundedNormal(randomNormal, -20, 2, 3.5);
    const inverter = Math.round(r.expected_kwh * (1 + shortfall / 100));
    const utilNoise = boundedNormal(randomNormal, 0, 1, 2.5);
    const utility = Math.round(
      inverter * (1 - UTILITY_LOSS_FACTOR) * (1 + utilNoise / 100),
    );
    const inv_vs_expected_pct = round2(((inverter - r.expected_kwh) / r.expected_kwh) * 100);
    const inv_vs_utility_pct = round2(((inverter - utility) / utility) * 100);
    const util_vs_expected_pct = round2(((utility - r.expected_kwh) / r.expected_kwh) * 100);
    const flag_reasons = [
      `Inverter production ${Math.abs(inv_vs_expected_pct).toFixed(1)}% BELOW expected (threshold: -15%). Possible causes: panel degradation exceeding model, soiling, shading, inverter fault, curtailment.`,
    ];
    if (util_vs_expected_pct < -20) {
      flag_reasons.push(
        `Utility meter ${Math.abs(util_vs_expected_pct).toFixed(1)}% BELOW expected (threshold: -20%). Possible causes: high on-site consumption, curtailment, system issue.`,
      );
    }
    return {
      ...r,
      inverter_kwh: inverter,
      utility_kwh: utility,
      inv_vs_expected_pct,
      inv_vs_utility_pct,
      util_vs_expected_pct,
      status: "flagged",
      flag_reasons,
      estimated_revenue: Math.round(inverter * PPA_RATE),
    };
  });
}

export function buildSummary(records, capacityKw) {
  const totalKwh = records.reduce((s, r) => s + r.inverter_kwh, 0);
  return {
    annual_production_mwh: round1(totalKwh / 1000),
    capacity_factor_pct: round1((totalKwh / (capacityKw * 8760)) * 100),
    months_verified: records.filter((r) => r.status === "verified").length,
    months_flagged: records.filter((r) => r.status === "flagged").length,
    total_revenue_estimate: records.reduce((s, r) => s + r.estimated_revenue, 0),
    ppa_rate: PPA_RATE,
  };
}

// ── File emission ─────────────────────────────────────────────────────────
const MONTH_END = {
  "01": "31", "02": "29", "03": "31", "04": "30", "05": "31", "06": "30",
  "07": "31", "08": "31", "09": "30", "10": "31", "11": "30", "12": "31",
};

function periodEnd(periodStart) {
  const [y, m] = periodStart.split("-");
  return `${y}-${m}-${MONTH_END[m]}`;
}

/** Match the repo's JSON style: one line per verification record. */
function formatBundle(bundle) {
  const records = bundle.verification_records
    .map((r) => `    ${JSON.stringify(r).replace(/"([^"]+)":/g, '"$1": ').replace(/,(?=")/g, ", ")}`)
    .join(",\n");
  const project = JSON.stringify(bundle.project, null, 4).replace(/^/gm, "  ").trimStart();
  const summary = JSON.stringify(bundle.summary, null, 4).replace(/^/gm, "  ").trimStart();
  return `{\n  "project": ${project},\n  "verification_records": [\n${records}\n  ],\n  "summary": ${summary}\n}\n`;
}

const TOLERANCE_JSON =
  '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}';

function formatSeedSql(records) {
  const rows = records
    .map((r) => {
      const reasons =
        r.flag_reasons.length === 0
          ? "'{}'"
          : `'{${r.flag_reasons.map((f) => `"${f.replace(/'/g, "''")}"`).join(",")}}'`;
      return `('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '${r.period_start}', '${periodEnd(r.period_start)}', ${r.inverter_kwh}, ${r.utility_kwh}, ${r.expected_kwh}, ${r.inv_vs_expected_pct}, ${r.inv_vs_utility_pct}, ${r.util_vs_expected_pct}, '${r.status}', ${reasons}, '${TOLERANCE_JSON}', ${r.estimated_revenue}, '2.0.0')`;
    })
    .join(",\n");

  return `-- 001_savannah_backtest.sql
-- Seeds the Savannah 5MW Community Solar project plus its 12 verification
-- records from the engine v2.0.0 backtest (pvlib ModelChain). Monthly
-- INV→EXP deviations carry realistic noise (±2–5%) rather than an artificial
-- 0.0%; the annual inverter total still reconciles to the expected total.
-- Regenerated by ecoxchange-dashboard/scripts/generate-realistic-seed.mjs.

INSERT INTO projects (
    id, name, latitude, longitude, timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate,
    commissioning_date, inverter_brand, inverter_api_key_ref, inverter_plant_id,
    offtake_type, ppa_rate_per_kwh, ppa_escalator, status
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Savannah Community Solar 5MW',
    32.08, -81.09, 'America/New_York',
    5000, 20, 180,
    0.20, 0.14, 0.0075,
    '2023-01-01', 'solaredge', 'demo-key-ref', 'demo-plant-001',
    'community_solar', 0.085, 0.02, 'active'
);

INSERT INTO verification_records (
    project_id, period_start, period_end,
    inverter_kwh, utility_kwh, expected_kwh,
    inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct,
    status, flag_reasons, tolerance_config, estimated_revenue, engine_version
) VALUES
${rows};
`;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(here, "..", "src", "data");
  const seedSqlPath = join(
    here, "..", "..", "ecoxchange-reconciliation-engine", "supabase", "seed",
    "001_savannah_backtest.sql",
  );

  const verified = JSON.parse(readFileSync(join(dataDir, "demo-savannah.json"), "utf8"));
  const flagged = JSON.parse(readFileSync(join(dataDir, "demo-savannah-flagged.json"), "utf8"));

  const verifiedRecords = generateRealisticVerificationData(verified.verification_records);
  const flaggedRecords = generateFlaggedVerificationData(flagged.verification_records);

  const verifiedBundle = {
    project: verified.project,
    verification_records: verifiedRecords,
    summary: buildSummary(verifiedRecords, verified.project.capacity_kw),
  };
  const flaggedBundle = {
    project: flagged.project,
    verification_records: flaggedRecords,
    summary: buildSummary(flaggedRecords, flagged.project.capacity_kw),
  };

  writeFileSync(join(dataDir, "demo-savannah.json"), formatBundle(verifiedBundle));
  writeFileSync(join(dataDir, "demo-savannah-flagged.json"), formatBundle(flaggedBundle));
  writeFileSync(seedSqlPath, formatSeedSql(verifiedRecords));

  const sum = verifiedRecords.reduce((s, r) => s + r.inverter_kwh, 0);
  const devs = verifiedRecords.map((r) => r.inv_vs_expected_pct);
  console.log(`Verified: annual inverter ${sum.toLocaleString()} kWh (expected-sum preserved)`);
  console.log(`INV→EXP deviations: ${devs.map((d) => d.toFixed(1)).join(", ")}`);
  console.log(`December: inverter ${verifiedRecords[11].inverter_kwh.toLocaleString()} kWh, ` +
    `INV→EXP ${devs[11].toFixed(1)}%, INV→UTL ${verifiedRecords[11].inv_vs_utility_pct.toFixed(1)}%`);
  console.log("Wrote demo-savannah.json, demo-savannah-flagged.json, 001_savannah_backtest.sql");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
