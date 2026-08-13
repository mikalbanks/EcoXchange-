/**
 * Spec 23 AC 1 & 2 — replay the spec 20 hold-out set and reproduce its rates.
 *
 *   AC 1: the implemented per-plant gate reproduces 11.4% ± 0.5%
 *   AC 2: flat ±15% on the same data reproduces 25.8% calibrated / 39.2%
 *         uncalibrated — which validates the harness itself, not the engine
 *
 * ── WHY THIS IS A SCRIPT AND NOT A TEST ──────────────────────────────────────
 *
 * The repository now carries a provenance-rich Spec 20 evidence manifest. If
 * the public source revision cannot construct the claimed cohort, this command
 * exits non-zero with that manifest's reason. It never silently skips.
 *
 * Run it by pointing HOLDOUT_DATASET at a JSON file:
 *
 *   HOLDOUT_DATASET=/path/to/holdout.json npm run replay:holdout
 *
 * Expected shape — an array of plants, each with its months in order:
 *
 *   [{ "plant_id": "…",
 *      "months": [{ "period_start": "2024-03-01",
 *                   "raw_deviation_pct": -8.1,
 *                   "seasonal_residual_pct": -4.2 }, …] }]
 *
 * Odd months are the frozen fit set. Even months are the only scored hold-out
 * rows. The fit is never recomputed while replaying the hold-out.
 *
 * ── WHAT THE HEADLINE NUMBER MEANS ───────────────────────────────────────────
 *
 * Spec 20 measured CHECK A. In this engine CHECK B (inverter vs utility) and
 * CHECK C (utility vs expected) also block, by decision, so the end-to-end rate
 * at which distributions are actually held is higher than the CHECK A rate by
 * however often those legs fire. This script therefore reports the CHECK A gate
 * rate as its headline — that is the number AC 1 is about — and does not
 * pretend it is the end-to-end block rate. The two are printed under different
 * labels for exactly that reason.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fitCalibration } from "../src/reconciliation/calibration.js";
import {
  DETECT,
  GATE,
  computeBand,
  resolveBands,
} from "../src/reconciliation/thresholds.js";

const FLAT_BAND_PCT = 15;
const AC1_TARGET = 11.4;
const AC1_TOLERANCE = 0.5;
const EVIDENCE_TOLERANCE = 0.5;
const AC2_CALIBRATED_TARGET = 25.8;
const AC2_UNCALIBRATED_TARGET = 39.2;
const SINGLE_MONTH_GATE_TARGET = 10.6;
const DETECTION_TARGET = 32.9;
const NEVER_GATE_TARGET = 64.1;
const REPEATED_GATE_TARGET = 15.8;
const TARGET_HOLDOUT_MONTHS = 15_190;
const EVIDENCE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../verification-engine/reports/spec20/evidence.json",
);

export interface HoldoutMonth {
  period_start: string;
  raw_deviation_pct: number | null;
  seasonal_residual_pct: number | null;
}

export interface HoldoutPlant {
  plant_id: string;
  months: HoldoutMonth[];
}

export interface Counts {
  months: number;
  singleMonthGate: number;
  detectExceeded: number;
  perPlantGate: number;
  flatCalibrated: number;
  flatUncalibrated: number;
  plantsEverGated: number;
  plantsGatedRepeatedly: number;
  pendingCalibrationPlants: number;
  rawResiduals: number[];
  seasonalResiduals: number[];
  calibratedResiduals: number[];
}

function monthOf(periodStart: string): number {
  return Number(periodStart.slice(5, 7));
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : (n / total) * 100;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function distribution(values: number[]): { iqr: number; mad: number } {
  const median = quantile(values, 0.5);
  return {
    iqr: quantile(values, 0.75) - quantile(values, 0.25),
    mad: quantile(values.map((value) => Math.abs(value - median)), 0.5),
  };
}

export function replay(plants: HoldoutPlant[]): Counts {
  const counts: Counts = {
    months: 0,
    singleMonthGate: 0,
    detectExceeded: 0,
    perPlantGate: 0,
    flatCalibrated: 0,
    flatUncalibrated: 0,
    plantsEverGated: 0,
    plantsGatedRepeatedly: 0,
    pendingCalibrationPlants: 0,
    rawResiduals: [],
    seasonalResiduals: [],
    calibratedResiduals: [],
  };

  for (const plant of plants) {
    const ordered = [...plant.months].sort((a, b) => a.period_start.localeCompare(b.period_start));
    const fit = fitCalibration(
      ordered
        .filter((month) => monthOf(month.period_start) % 2 === 1)
        .map((month) => ({
          period_start: month.period_start,
          inv_vs_expected_pct: month.seasonal_residual_pct,
        })),
    );
    // An uncalibratable plant runs at cap bands — that is the product's
    // behaviour, so counting it any other way would flatter the result.
    const basis = fit.ok
      ? { id: plant.plant_id, calibrationVersion: 1, residualMadPct: fit.fit.residualMadPct }
      : null;
    if (!fit.ok) counts.pendingCalibrationPlants++;

    let priorDetect = false;
    let priorPeriod: string | null = null;
    let gatedThisPlant = 0;

    for (const month of ordered) {
      const seasonalResidual = month.seasonal_residual_pct;
      const rawDeviation = month.raw_deviation_pct;
      if (seasonalResidual === null || !Number.isFinite(seasonalResidual)) {
        priorDetect = false;
        priorPeriod = null;
        continue;
      }
      const residual = fit.ok
        ? seasonalResidual - (fit.fit.plantFactor - 1) * 100
        : seasonalResidual;

      const bands = resolveBands(basis, monthOf(month.period_start));
      const detectExceeded = Math.abs(residual) > bands.detect;
      const gateExceeded = Math.abs(residual) > bands.gate;
      const current = new Date(`${month.period_start}T00:00:00Z`);
      const prior = priorPeriod === null ? null : new Date(`${priorPeriod}T00:00:00Z`);
      const consecutive =
        prior !== null &&
        (current.getUTCFullYear() - prior.getUTCFullYear()) * 12 +
          current.getUTCMonth() -
          prior.getUTCMonth() ===
          1;
      const persistence = detectExceeded && priorDetect && consecutive;
      priorDetect = detectExceeded;
      priorPeriod = month.period_start;

      // Frozen odd-month calibration, even-month hold-out evaluation.
      if (monthOf(month.period_start) % 2 === 1) continue;
      if (rawDeviation === null || !Number.isFinite(rawDeviation)) continue;
      counts.months++;
      counts.rawResiduals.push(rawDeviation);
      counts.seasonalResiduals.push(seasonalResidual);
      counts.calibratedResiduals.push(residual);
      if (gateExceeded) counts.singleMonthGate++;
      if (detectExceeded) counts.detectExceeded++;
      if (gateExceeded || persistence) {
        counts.perPlantGate++;
        gatedThisPlant++;
      }

      // AC 2 — the two flat comparators. "Calibrated" applies the plant's own
      // level and seasonal correction before the flat band; "uncalibrated"
      // uses the raw model deviation.
      if (Math.abs(rawDeviation) > FLAT_BAND_PCT) counts.flatUncalibrated++;
      if (Math.abs(residual) > FLAT_BAND_PCT) counts.flatCalibrated++;
    }

    if (gatedThisPlant > 0) counts.plantsEverGated++;
    if (gatedThisPlant > 1) counts.plantsGatedRepeatedly++;
  }

  return counts;
}

function main(): void {
  const path = process.env.HOLDOUT_DATASET;
  if (!path) {
    if (!existsSync(EVIDENCE_PATH)) {
      console.error(`replay-holdout: BLOCKED — evidence manifest missing: ${EVIDENCE_PATH}`);
      process.exitCode = 2;
      return;
    }
    const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as {
      status?: string;
      message?: string;
      cohort_mismatches?: Record<string, { expected: number; observed: number }>;
    };
    console.error(`replay-holdout: BLOCKED — ${evidence.status ?? "unverified evidence"}`);
    if (evidence.message) console.error(evidence.message);
    for (const [name, values] of Object.entries(evidence.cohort_mismatches ?? {})) {
      console.error(`  ${name}: expected ${values.expected}, observed ${values.observed}`);
    }
    console.error("No hold-out statistics were computed. Regenerate the exact pinned cohort first.");
    process.exitCode = 2;
    return;
  }

  const plants = JSON.parse(readFileSync(path, "utf8")) as HoldoutPlant[];
  const c = replay(plants);

  if (c.months !== TARGET_HOLDOUT_MONTHS) {
    console.error(
      `Hold-out cardinality mismatch: expected ${TARGET_HOLDOUT_MONTHS} plant-months, got ${c.months}.`,
    );
    process.exitCode = 1;
    return;
  }

  const gateRate = pct(c.perPlantGate, c.months);
  const singleMonthGateRate = pct(c.singleMonthGate, c.months);
  const detectionRate = pct(c.detectExceeded, c.months);
  const flatCal = pct(c.flatCalibrated, c.months);
  const flatUncal = pct(c.flatUncalibrated, c.months);
  const neverGateRate = pct(plants.length - c.plantsEverGated, plants.length);
  const repeatedGateRate = pct(c.plantsGatedRepeatedly, plants.length);
  const rawDistribution = distribution(c.rawResiduals);
  const seasonalDistribution = distribution(c.seasonalResiduals);
  const calibratedDistribution = distribution(c.calibratedResiduals);
  const checks = [
    ["per-plant gate + persistence", gateRate, AC1_TARGET, AC1_TOLERANCE],
    ["flat calibrated", flatCal, AC2_CALIBRATED_TARGET, EVIDENCE_TOLERANCE],
    ["flat uncalibrated", flatUncal, AC2_UNCALIBRATED_TARGET, EVIDENCE_TOLERANCE],
    ["single-month gate", singleMonthGateRate, SINGLE_MONTH_GATE_TARGET, EVIDENCE_TOLERANCE],
    ["detection", detectionRate, DETECTION_TARGET, EVIDENCE_TOLERANCE],
    ["plants never gated", neverGateRate, NEVER_GATE_TARGET, EVIDENCE_TOLERANCE],
    ["plants gated repeatedly", repeatedGateRate, REPEATED_GATE_TARGET, EVIDENCE_TOLERANCE],
  ] as const;
  const failed = checks.filter(([, observed, target, tolerance]) =>
    Math.abs(observed - target) > tolerance,
  );

  const line = (label: string, value: string) => `  ${label.padEnd(52)}  ${value}`;

  console.log(`\nSpec 23 hold-out replay — ${plants.length} plants, ${c.months} plant-months\n`);
  console.log("CHECK A only (what spec 20 measured):");
  console.log(
    line(
      `per-plant gate + persistence  [AC 1: ${AC1_TARGET}% ±${AC1_TOLERANCE}]`,
      `${gateRate.toFixed(2)}%  ${failed.some(([name]) => name === "per-plant gate + persistence") ? "FAIL" : "PASS"}`,
    ),
  );
  console.log(
    line(`single-month gate  [target: ${SINGLE_MONTH_GATE_TARGET}%]`, `${singleMonthGateRate.toFixed(2)}%`),
  );
  console.log(line(`detection  [target: ${DETECTION_TARGET}%]`, `${detectionRate.toFixed(2)}%`));
  console.log(
    line(`flat ±15% calibrated  [AC 2: ${AC2_CALIBRATED_TARGET}%]`, `${flatCal.toFixed(2)}%`),
  );
  console.log(
    line(
      `flat ±15% uncalibrated  [AC 2: ${AC2_UNCALIBRATED_TARGET}%]`,
      `${flatUncal.toFixed(2)}%`,
    ),
  );
  console.log("\nResidual spread (even-month hold-out):");
  console.log(
    line("raw IQR / MAD", `${rawDistribution.iqr.toFixed(2)} / ${rawDistribution.mad.toFixed(2)} pct`),
  );
  console.log(
    line(
      "seasonal IQR / MAD",
      `${seasonalDistribution.iqr.toFixed(2)} / ${seasonalDistribution.mad.toFixed(2)} pct`,
    ),
  );
  console.log(
    line(
      "per-plant calibrated IQR / MAD",
      `${calibratedDistribution.iqr.toFixed(2)} / ${calibratedDistribution.mad.toFixed(2)} pct`,
    ),
  );
  console.log("\nPlant distribution:");
  console.log(
    line(`plants never gated  [target: ${NEVER_GATE_TARGET}%]`, `${neverGateRate.toFixed(1)}%`),
  );
  console.log(
    line(`plants gated more than once  [target: ${REPEATED_GATE_TARGET}%]`, `${repeatedGateRate.toFixed(1)}%`),
  );
  console.log(
    line(
      "plants pending calibration (cap bands; not verified)",
      `${c.pendingCalibrationPlants}`,
    ),
  );
  console.log(
    `\nBand parameters: gate k=${GATE.k} [${GATE.floorPct},${GATE.capPct}] x${GATE.winterMult} winter · ` +
      `detect k=${DETECT.k} [${DETECT.floorPct},${DETECT.capPct}] x${DETECT.winterMult} winter`,
  );
  console.log(
    `Sanity: a 3.0% MAD plant gets a ±${computeBand(3, 6, GATE).toFixed(1)}% summer gate, ` +
      `±${computeBand(3, 1, GATE).toFixed(1)}% in January.\n`,
  );
  console.log(
    "NOTE: this is the CHECK A rate. CHECK B and CHECK C also block in this\n" +
      "engine, so the end-to-end distribution-hold rate is higher than the\n" +
      "figure above. Do not quote it as the share of distributions held.\n",
  );

  if (failed.length > 0) {
    console.error("Hold-out replay FAILED; divergences beyond tolerance:");
    for (const [name, observed, target, tolerance] of failed) {
      console.error(`  ${name}: expected ${target}% ±${tolerance}, got ${observed.toFixed(2)}%`);
    }
    process.exitCode = 1;
  }
  if (c.pendingCalibrationPlants > 0) {
    console.error(
      `${c.pendingCalibrationPlants} plants are PENDING_CALIBRATION. Their cap-band rows are ` +
        "included in aggregate rates but must not be presented as verified plant results.",
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
