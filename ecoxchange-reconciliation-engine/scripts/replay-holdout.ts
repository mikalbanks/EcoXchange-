/**
 * Spec 23 AC 1 & 2 — replay the spec 20 hold-out set and reproduce its rates.
 *
 *   AC 1: the implemented per-plant gate reproduces 11.4% ± 0.5%
 *   AC 2: flat ±15% on the same data reproduces 25.8% calibrated / 39.2%
 *         uncalibrated — which validates the harness itself, not the engine
 *
 * ── WHY THIS IS A SCRIPT AND NOT A TEST ──────────────────────────────────────
 *
 * The hold-out set (n=15,190 plant-months) is not in this repository.
 * `verification-engine/.gitignore` excludes `data/fleet/**`, and there is no
 * spec 20 document committed either. So AC 1 and AC 2 CANNOT BE VERIFIED HERE
 * as things stand, and nothing in this file should be read as evidence that
 * they have been.
 *
 * Run it by pointing HOLDOUT_DATASET at a JSON file:
 *
 *   HOLDOUT_DATASET=/path/to/holdout.json npm run replay:holdout
 *
 * Expected shape — an array of plants, each with its months in order:
 *
 *   [{ "plant_id": "…",
 *      "months": [{ "period_start": "2024-03-01", "inv_vs_expected_pct": -4.2 }, …] }]
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
import { readFileSync } from "node:fs";
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
const AC2_CALIBRATED_TARGET = 25.8;
const AC2_UNCALIBRATED_TARGET = 39.2;

interface HoldoutMonth {
  period_start: string;
  inv_vs_expected_pct: number | null;
}

interface HoldoutPlant {
  plant_id: string;
  months: HoldoutMonth[];
}

interface Counts {
  months: number;
  perPlantGate: number;
  flatCalibrated: number;
  flatUncalibrated: number;
  plantsEverGated: number;
  plantsGatedRepeatedly: number;
}

function monthOf(periodStart: string): number {
  return Number(periodStart.slice(5, 7));
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : (n / total) * 100;
}

function replay(plants: HoldoutPlant[]): Counts {
  const counts: Counts = {
    months: 0,
    perPlantGate: 0,
    flatCalibrated: 0,
    flatUncalibrated: 0,
    plantsEverGated: 0,
    plantsGatedRepeatedly: 0,
  };

  for (const plant of plants) {
    const fit = fitCalibration(plant.months);
    // An uncalibratable plant runs at cap bands — that is the product's
    // behaviour, so counting it any other way would flatter the result.
    const basis = fit.ok
      ? { id: plant.plant_id, calibrationVersion: 1, residualMadPct: fit.fit.residualMadPct }
      : null;

    let priorDetect = false;
    let gatedThisPlant = 0;

    for (const month of plant.months) {
      const residual = month.inv_vs_expected_pct;
      if (residual === null || !Number.isFinite(residual)) continue;
      counts.months++;

      const bands = resolveBands(basis, monthOf(month.period_start));
      const detectExceeded = Math.abs(residual) > bands.detect;
      const gateExceeded = Math.abs(residual) > bands.gate;
      const persistence = detectExceeded && priorDetect;
      if (gateExceeded || persistence) {
        counts.perPlantGate++;
        gatedThisPlant++;
      }
      priorDetect = detectExceeded;

      // AC 2 — the two flat comparators. "Calibrated" applies the plant's own
      // level correction (plantFactor) before the flat band; "uncalibrated"
      // does not. That difference is what spec 20's 25.8-vs-39.2 measures.
      if (Math.abs(residual) > FLAT_BAND_PCT) counts.flatUncalibrated++;
      const levelled = fit.ok ? residual - (fit.fit.plantFactor - 1) * 100 : residual;
      if (Math.abs(levelled) > FLAT_BAND_PCT) counts.flatCalibrated++;
    }

    if (gatedThisPlant > 0) counts.plantsEverGated++;
    if (gatedThisPlant > 1) counts.plantsGatedRepeatedly++;
  }

  return counts;
}

function main(): void {
  const path = process.env.HOLDOUT_DATASET;
  if (!path) {
    console.log(
      [
        "replay-holdout: skipped — HOLDOUT_DATASET is not set.",
        "",
        "The spec 20 hold-out set (n=15,190 plant-months) is not committed to",
        "this repository, so acceptance criteria 1 and 2 are UNVERIFIED. This",
        "is not a passing run; it is a run that did not happen.",
        "",
        "  HOLDOUT_DATASET=/path/to/holdout.json npm run replay:holdout",
      ].join("\n"),
    );
    return;
  }

  const plants = JSON.parse(readFileSync(path, "utf8")) as HoldoutPlant[];
  const c = replay(plants);

  const gateRate = pct(c.perPlantGate, c.months);
  const flatCal = pct(c.flatCalibrated, c.months);
  const flatUncal = pct(c.flatUncalibrated, c.months);
  const ac1Pass = Math.abs(gateRate - AC1_TARGET) <= AC1_TOLERANCE;

  const line = (label: string, value: string) => `  ${label.padEnd(52)}  ${value}`;

  console.log(`\nSpec 23 hold-out replay — ${plants.length} plants, ${c.months} plant-months\n`);
  console.log("CHECK A only (what spec 20 measured):");
  console.log(
    line(
      `per-plant gate + persistence  [AC 1: ${AC1_TARGET}% ±${AC1_TOLERANCE}]`,
      `${gateRate.toFixed(2)}%  ${ac1Pass ? "PASS" : "FAIL"}`,
    ),
  );
  console.log(
    line(`flat ±15% calibrated  [AC 2: ${AC2_CALIBRATED_TARGET}%]`, `${flatCal.toFixed(2)}%`),
  );
  console.log(
    line(
      `flat ±15% uncalibrated  [AC 2: ${AC2_UNCALIBRATED_TARGET}%]`,
      `${flatUncal.toFixed(2)}%`,
    ),
  );
  console.log("\nPlant distribution:");
  console.log(
    line("plants never gated", `${pct(plants.length - c.plantsEverGated, plants.length).toFixed(1)}%`),
  );
  console.log(
    line("plants gated more than once", `${pct(c.plantsGatedRepeatedly, plants.length).toFixed(1)}%`),
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

  if (!ac1Pass) {
    console.error(
      `AC 1 FAILED: expected ${AC1_TARGET}% ±${AC1_TOLERANCE}, got ${gateRate.toFixed(2)}%. ` +
        "Divergence beyond tolerance means the implementation differs from the analysis.",
    );
    process.exitCode = 1;
  }
}

main();
