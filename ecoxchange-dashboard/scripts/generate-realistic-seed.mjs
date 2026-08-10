// Regenerates the Savannah demo verification datasets (Spec 19 Task C).
//
// History: the original seed set inverter_kwh equal to expected_kwh, producing
// an artificial 0.0% INV→EXP deviation across all 12 months — the fixture
// diagnosed in docs/spec-19-diagnostic.md. An earlier pass (engine polish §A.1)
// added realistic monthly noise. Spec 19 adds the part that was still missing:
// a series that shows the engine can say NO, not just yes.
//
// Composition of the 12-month series (Spec 19 §3.2):
//   10 VERIFIED  — normal operation, deviations in the ±2–6% band
//    1 FLAGGED   — beyond the -15% INV→EXP band, with the engine's own flag
//                  reason strings, not paraphrases
//    1 VERIFIED  — utility reading absent, exercising the two-way degrade path
//                  (reconcile.ts STEP 4). This also resolves a live
//                  inconsistency: projects.utility_provider is NULL, so a
//                  populated utility_kwh on all twelve months was never coherent.
//
// Properties of the generated data:
//   - Deterministic: seeded mulberry32 PRNG — reruns produce identical output.
//   - Annual-sum preserving: the 2024 inverter total stays EXACTLY equal to the
//     expected total (8,102,755 kWh), so every canonical figure derived from it
//     (8,102.8 MWh, 18.5% capacity factor, pro-forma revenue) survives
//     unchanged. The flagged month's shortfall is absorbed across the other
//     eleven, which stay well inside tolerance.
//   - Engine-faithful: statuses, flag reasons and all three deviation
//     percentages come from `reconcileMonth()` below, which mirrors
//     ecoxchange-reconciliation-engine/src/reconciliation/reconcile.ts exactly.
//     Keep the two in sync; generate-realistic-seed.test.mjs pins the strings.
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
export const ENGINE_VERSION = "2.0.0";
export const PROJECT_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ── Series composition (Spec 19 §3.2) ─────────────────────────────────────
/** The month that breaches the -15% band. September: soiling season. */
export const FLAGGED_MONTH = "2024-09-01";
/** Deviation forced onto FLAGGED_MONTH. Also drags UTL→EXP past -20%. */
export const FLAGGED_DEVIATION_PCT = -18.4;
/** The month with no utility reading — the two-way degrade path. */
export const UTILITY_MISSING_MONTH = "2024-11-01";

/** Engine defaults, mirroring config/tolerances.ts DEFAULT_TOLERANCES. */
export const TOLERANCES = {
  inv_vs_expected_upper_pct: 15,
  inv_vs_expected_lower_pct: -15,
  inv_vs_utility_pct: 10,
  util_vs_expected_upper_pct: 20,
  util_vs_expected_lower_pct: -20,
  min_data_completeness_pct: 90,
};

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

// ── Faithful mirror of reconcile.ts ───────────────────────────────────────
/**
 * Reproduces `reconcile()` for a single month, including flag-reason wording
 * and ordering. Mirrors ecoxchange-reconciliation-engine/src/reconciliation/
 * reconcile.ts — STEP 2 deviations, STEP 3 tolerance checks, STEP 4 verdict.
 *
 * Note `inv_vs_utility_pct` divides by INVERTER, matching reconcile.ts:71.
 * (A previous version of this generator divided by utility, so the committed
 * fixture percentages disagreed with what the engine would have computed.)
 *
 * @param {number} inverterKwh
 * @param {number|null} utilityKwh  null = no utility reading this period
 * @param {number} expectedKwh
 */
export function reconcileMonth(inverterKwh, utilityKwh, expectedKwh) {
  const t = TOLERANCES;
  const flag_reasons = [];
  let hasBlockingGap = false;

  // STEP 2 — deviation percentages.
  const inv_vs_expected_pct =
    expectedKwh > 0 ? ((inverterKwh - expectedKwh) / expectedKwh) * 100 : 0;
  const inv_vs_utility_pct =
    utilityKwh !== null && inverterKwh > 0
      ? ((inverterKwh - utilityKwh) / inverterKwh) * 100
      : null;
  const util_vs_expected_pct =
    utilityKwh !== null && expectedKwh > 0
      ? ((utilityKwh - expectedKwh) / expectedKwh) * 100
      : null;

  // STEP 3 — tolerance checks, in reconcile.ts order.
  if (inv_vs_expected_pct > t.inv_vs_expected_upper_pct) {
    flag_reasons.push(
      `Inverter production ${inv_vs_expected_pct.toFixed(1)}% ABOVE expected ` +
        `(threshold: +${t.inv_vs_expected_upper_pct}%). ` +
        `Possible causes: satellite underestimate, meter calibration error, system upgrade not reflected in specs.`,
    );
    hasBlockingGap = true;
  }
  if (inv_vs_expected_pct < t.inv_vs_expected_lower_pct) {
    flag_reasons.push(
      `Inverter production ${Math.abs(inv_vs_expected_pct).toFixed(1)}% BELOW expected ` +
        `(threshold: ${t.inv_vs_expected_lower_pct}%). ` +
        `Possible causes: panel degradation exceeding model, soiling, shading, inverter fault, curtailment.`,
    );
    hasBlockingGap = true;
  }
  if (inv_vs_utility_pct !== null && Math.abs(inv_vs_utility_pct) > t.inv_vs_utility_pct) {
    flag_reasons.push(
      `Inverter and utility meter diverge by ${Math.abs(inv_vs_utility_pct).toFixed(1)}% ` +
        `(threshold: ±${t.inv_vs_utility_pct}%). ` +
        `Possible causes: significant on-site consumption, meter fault, data lag between sources.`,
    );
    hasBlockingGap = true;
  }
  if (util_vs_expected_pct !== null) {
    if (util_vs_expected_pct > t.util_vs_expected_upper_pct) {
      flag_reasons.push(
        `Utility meter ${util_vs_expected_pct.toFixed(1)}% ABOVE expected ` +
          `(threshold: +${t.util_vs_expected_upper_pct}%). ` +
          `Possible causes: satellite irradiance underestimate, meter error.`,
      );
      hasBlockingGap = true;
    }
    if (util_vs_expected_pct < t.util_vs_expected_lower_pct) {
      flag_reasons.push(
        `Utility meter ${Math.abs(util_vs_expected_pct).toFixed(1)}% BELOW expected ` +
          `(threshold: ${t.util_vs_expected_lower_pct}%). ` +
          `Possible causes: high on-site consumption, curtailment, system issue.`,
      );
      hasBlockingGap = true;
    }
  }

  // STEP 4 — verdict. The missing-utility note is appended after the tolerance
  // checks and is NOT blocking: the month still verifies on the two-way check.
  if (utilityKwh === null) {
    flag_reasons.push(
      "Utility meter data not available — verification based on inverter vs. satellite only (two-way check).",
    );
  }

  return {
    status: hasBlockingGap ? "flagged" : "verified",
    inv_vs_expected_pct: round2(inv_vs_expected_pct),
    inv_vs_utility_pct: inv_vs_utility_pct === null ? null : round2(inv_vs_utility_pct),
    util_vs_expected_pct: util_vs_expected_pct === null ? null : round2(util_vs_expected_pct),
    flag_reasons,
  };
}

// ── Verified dataset ──────────────────────────────────────────────────────
export function generateRealisticVerificationData(baseRecords, seed = SEED) {
  const rng = mulberry32(seed);
  const randomNormal = makeRandomNormal(rng);

  const flaggedIdx = baseRecords.findIndex((r) => r.period_start === FLAGGED_MONTH);
  if (flaggedIdx === -1) throw new Error(`FLAGGED_MONTH ${FLAGGED_MONTH} not in base records`);

  // 1. Draw inverter noise per month (mean 0, std 3, hard cap ±4.0%). The cap
  //    leaves headroom for the normalization lift in step 3.
  const noise = baseRecords.map(() => boundedNormal(randomNormal, 0, 3, 4.0));

  // 2. The flagged month ignores the noise policy entirely.
  const flaggedInverter = Math.round(
    baseRecords[flaggedIdx].expected_kwh * (1 + FLAGGED_DEVIATION_PCT / 100),
  );

  // 3. Normalize the ELEVEN other months so the annual inverter total still
  //    equals the expected total exactly. The flagged month's shortfall is
  //    absorbed across them (~+1.5%), keeping every canonical annual figure
  //    intact while the monthly deviations stay honest and messy.
  const sumExpected = baseRecords.reduce((s, r) => s + r.expected_kwh, 0);
  const rawOthers = baseRecords.map((r, i) =>
    i === flaggedIdx ? 0 : r.expected_kwh * (1 + noise[i] / 100),
  );
  const targetOthers = sumExpected - flaggedInverter;
  const factor = targetOthers / rawOthers.reduce((s, x) => s + x, 0);

  const inverter = baseRecords.map((r, i) =>
    i === flaggedIdx ? flaggedInverter : Math.round(rawOthers[i] * factor),
  );

  // Push any rounding residual onto the largest non-flagged month.
  const residual = sumExpected - inverter.reduce((s, x) => s + x, 0);
  if (residual !== 0) {
    let biggest = -1;
    for (let i = 0; i < inverter.length; i++) {
      if (i === flaggedIdx) continue;
      if (biggest === -1 || inverter[i] > inverter[biggest]) biggest = i;
    }
    inverter[biggest] += residual;
  }

  // 4. Utility = inverter minus line losses plus its own metering noise —
  //    except the month that has no utility reading at all.
  return baseRecords.map((r, i) => {
    const utilNoise = boundedNormal(randomNormal, 0, 1.5, 3.5);
    const utility =
      r.period_start === UTILITY_MISSING_MONTH
        ? null
        : Math.round(inverter[i] * (1 - UTILITY_LOSS_FACTOR) * (1 + utilNoise / 100));

    const verdict = reconcileMonth(inverter[i], utility, r.expected_kwh);
    return {
      ...r,
      inverter_kwh: inverter[i],
      utility_kwh: utility,
      inv_vs_expected_pct: verdict.inv_vs_expected_pct,
      inv_vs_utility_pct: verdict.inv_vs_utility_pct,
      util_vs_expected_pct: verdict.util_vs_expected_pct,
      status: verdict.status,
      flag_reasons: verdict.flag_reasons,
      estimated_revenue: Math.round(inverter[i] * PPA_RATE),
      data_provenance: "simulated",
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

    const verdict = reconcileMonth(inverter, utility, r.expected_kwh);
    return {
      ...r,
      inverter_kwh: inverter,
      utility_kwh: utility,
      inv_vs_expected_pct: verdict.inv_vs_expected_pct,
      inv_vs_utility_pct: verdict.inv_vs_utility_pct,
      util_vs_expected_pct: verdict.util_vs_expected_pct,
      status: verdict.status,
      flag_reasons: verdict.flag_reasons,
      estimated_revenue: Math.round(inverter * PPA_RATE),
      data_provenance: "simulated",
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
    months_utility_missing: records.filter((r) => r.utility_kwh === null).length,
    total_revenue_estimate: records.reduce((s, r) => s + r.estimated_revenue, 0),
    ppa_rate: PPA_RATE,
    data_provenance: "simulated",
  };
}

/**
 * Spec 19 G1, applied to generated fixtures as well as engine runs. A fixture
 * is exactly how the zero-deviation series reached production last time.
 */
export function assertDeviationIndependence(records) {
  let run = [];
  let longest = [];
  for (const r of records) {
    if (r.inv_vs_expected_pct !== null && Math.abs(r.inv_vs_expected_pct) < 0.001) {
      run.push(r.period_start);
      if (run.length > longest.length) longest = [...run];
    } else {
      run = [];
    }
  }
  if (longest.length > 2) {
    throw new Error(
      `Deviation identically zero across ${longest.length} periods — INV and EXP ` +
        `are not independent. Refusing to emit verification records. ` +
        `Affected periods: ${longest.join(", ")}.`,
    );
  }
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

const TOLERANCE_JSON = JSON.stringify(TOLERANCES);

const sqlNum = (n) => (n === null || n === undefined ? "NULL" : String(n));
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

function formatSeedSql(records) {
  const verificationRows = records
    .map((r) => {
      const reasons =
        r.flag_reasons.length === 0
          ? "'{}'"
          : `'{${r.flag_reasons.map((f) => `"${f.replace(/'/g, "''").replace(/"/g, '\\"')}"`).join(",")}}'`;
      return (
        `(${sqlStr(PROJECT_UUID)}, '${r.period_start}', '${periodEnd(r.period_start)}', ` +
        `${sqlNum(r.inverter_kwh)}, ${sqlNum(r.utility_kwh)}, ${sqlNum(r.expected_kwh)}, ` +
        `${sqlNum(r.inv_vs_expected_pct)}, ${sqlNum(r.inv_vs_utility_pct)}, ${sqlNum(r.util_vs_expected_pct)}, ` +
        `'${r.status}', ${reasons}, '${TOLERANCE_JSON}', ${sqlNum(r.estimated_revenue)}, ` +
        `'${ENGINE_VERSION}', 'simulated')`
      );
    })
    .join(",\n");

  // Every verification record gets its underlying readings. A verification
  // record with no readings is structurally impossible for engine output —
  // that inconsistency is what identified the original fixture.
  const rawRows = records
    .flatMap((r) => {
      const pe = periodEnd(r.period_start);
      const rows = [
        `(${sqlStr(PROJECT_UUID)}, 'satellite', '${r.period_start}', '${pe}', NULL, NULL, ${sqlNum(r.ghi_kwh_m2)}, ` +
          `'{"source":"nasa_power","irradiance_is_real":true}', 'complete', 'simulated')`,
        `(${sqlStr(PROJECT_UUID)}, 'inverter', '${r.period_start}', '${pe}', ${sqlNum(r.inverter_kwh)}, NULL, NULL, ` +
          `'{"simulated":true}', 'complete', 'simulated')`,
      ];
      if (r.utility_kwh !== null) {
        rows.push(
          `(${sqlStr(PROJECT_UUID)}, 'utility_meter', '${r.period_start}', '${pe}', NULL, ${sqlNum(r.utility_kwh)}, NULL, ` +
            `'{"simulated":true}', 'complete', 'simulated')`,
        );
      }
      return rows;
    })
    .join(",\n");

  const verified = records.filter((r) => r.status === "verified").length;
  const flagged = records.filter((r) => r.status === "flagged").length;
  const lastPeriod = periodEnd(records[records.length - 1].period_start);

  return `-- 001_savannah_backtest.sql
-- Seeds the Savannah 5MW Community Solar project, its twelve verification
-- records, the readings underneath them, and the engine run that produced
-- them. Regenerated by ecoxchange-dashboard/scripts/generate-realistic-seed.mjs.
--
-- Spec 19. The satellite irradiance is real NASA POWER data for these exact
-- coordinates. The inverter and utility legs are SIMULATED — every row is
-- stamped data_provenance = 'simulated' and no surface may render these
-- numbers without that tag.
--
-- Series composition (Spec 19 §3.2): ${verified} VERIFIED, ${flagged} FLAGGED
-- (${FLAGGED_MONTH} at ${FLAGGED_DEVIATION_PCT}% INV→EXP), and ${UTILITY_MISSING_MONTH}
-- carrying no utility reading, which exercises the two-way degrade path.
--
-- The project is seeded 'suspended', not 'active': it holds simulated
-- telemetry and must not be picked up by any job iterating active projects
-- (Spec 19 Task A, migration 013).

INSERT INTO projects (
    id, name, latitude, longitude, timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate,
    commissioning_date, inverter_brand, inverter_api_key_ref, inverter_plant_id,
    offtake_type, ppa_rate_per_kwh, ppa_escalator, status
) VALUES (
    ${sqlStr(PROJECT_UUID)},
    'Savannah Community Solar 5MW',
    32.08, -81.09, 'America/New_York',
    5000, 20, 180,
    0.20, 0.14, 0.0075,
    '2023-01-01', 'solaredge', 'demo-key-ref', 'demo-plant-001',
    'community_solar', 0.085, 0.02, 'suspended'
);

INSERT INTO engine_runs (
    engine_version, target_period, trigger_type, completed_at,
    projects_attempted, projects_verified, projects_flagged
) VALUES (
    '${ENGINE_VERSION}', '${lastPeriod}', 'backtest', now(),
    1, 1, ${flagged > 0 ? 1 : 0}
);

INSERT INTO raw_readings (
    project_id, source, period_start, period_end,
    kwh_gross, kwh_net, ghi_kwh_m2,
    raw_response, data_quality, data_provenance
) VALUES
${rawRows};

INSERT INTO verification_records (
    project_id, period_start, period_end,
    inverter_kwh, utility_kwh, expected_kwh,
    inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct,
    status, flag_reasons, tolerance_config, estimated_revenue, engine_version,
    data_provenance
) VALUES
${verificationRows};
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

  assertDeviationIndependence(verifiedRecords);
  assertDeviationIndependence(flaggedRecords);

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
  const flaggedMonth = verifiedRecords.find((r) => r.status === "flagged");
  const twoWay = verifiedRecords.find((r) => r.utility_kwh === null);
  console.log(`Verified: annual inverter ${sum.toLocaleString()} kWh (expected-sum preserved)`);
  console.log(`INV→EXP deviations: ${devs.map((d) => d.toFixed(1)).join(", ")}`);
  console.log(
    `FLAGGED: ${flaggedMonth.period_start} at ${flaggedMonth.inv_vs_expected_pct}% ` +
      `(${flaggedMonth.flag_reasons.length} reason(s))`,
  );
  console.log(`Two-way (no utility): ${twoWay.period_start}`);
  console.log("Wrote demo-savannah.json, demo-savannah-flagged.json, 001_savannah_backtest.sql");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
