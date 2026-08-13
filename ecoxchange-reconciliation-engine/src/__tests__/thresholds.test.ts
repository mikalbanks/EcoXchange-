import { describe, it, expect } from "vitest";
import {
  COHORT_MEDIAN_MAD_PCT,
  DETECT,
  GATE,
  SEASONAL_FACTORS,
  STABLE_SEASON_MONTHS,
  WINTER_MONTHS,
  calibrationLabel,
  computeBand,
  resolveBands,
  toToleranceConfig,
  type CalibrationBasis,
} from "../reconciliation/thresholds.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";

const JUNE = 6;
const JANUARY = 1;

function basis(residualMadPct: number): CalibrationBasis {
  return { id: "cal-1", calibrationVersion: 2, residualMadPct };
}

describe("computeBand — AC 7 (floor/cap clamp at MAD extremes)", () => {
  it("scales linearly with MAD between floor and cap", () => {
    // 6 x 3.0 = 18, inside [10, 30]
    expect(computeBand(3.0, JUNE, GATE)).toBeCloseTo(18, 10);
    // 3 x 3.0 = 9, inside [5, 15]
    expect(computeBand(3.0, JUNE, DETECT)).toBeCloseTo(9, 10);
  });

  it("clamps to the floor for an unusually quiet plant", () => {
    // 6 x 0.1 = 0.6 -> floor 10. Without this a perfectly-tracking plant would
    // flag on any deviation at all.
    expect(computeBand(0.1, JUNE, GATE)).toBe(GATE.floorPct);
    expect(computeBand(0.1, JUNE, DETECT)).toBe(DETECT.floorPct);
    expect(computeBand(0, JUNE, GATE)).toBe(GATE.floorPct);
  });

  it("clamps to the cap for an unusually noisy plant", () => {
    // 6 x 50 = 300 -> cap 30. A plant this noisy is a data problem, and letting
    // the band follow it would mean never flagging anything.
    expect(computeBand(50, JUNE, GATE)).toBe(GATE.capPct);
    expect(computeBand(50, JUNE, DETECT)).toBe(DETECT.capPct);
  });

  it("sits exactly on the boundary at the clamp points", () => {
    expect(computeBand(GATE.floorPct / GATE.k, JUNE, GATE)).toBeCloseTo(GATE.floorPct, 10);
    expect(computeBand(GATE.capPct / GATE.k, JUNE, GATE)).toBeCloseTo(GATE.capPct, 10);
  });

  it("rejects a nonsensical MAD or month rather than producing a band", () => {
    expect(() => computeBand(Number.NaN, JUNE, GATE)).toThrow(RangeError);
    expect(() => computeBand(-1, JUNE, GATE)).toThrow(RangeError);
    expect(() => computeBand(3, 0, GATE)).toThrow(RangeError);
    expect(() => computeBand(3, 13, GATE)).toThrow(RangeError);
    expect(() => computeBand(3, 6.5, GATE)).toThrow(RangeError);
  });
});

describe("computeBand — AC 6 (winter months are exactly winterMult x base)", () => {
  for (const month of [12, 1, 2]) {
    it(`month ${month} is exactly the multiplier applied to the base band`, () => {
      const base = computeBand(3.0, JUNE, GATE);
      // Equality, not a range: the multiplier is the whole claim.
      expect(computeBand(3.0, month, GATE)).toBeCloseTo(base * GATE.winterMult, 10);
      const detectBase = computeBand(3.0, JUNE, DETECT);
      expect(computeBand(3.0, month, DETECT)).toBeCloseTo(
        detectBase * DETECT.winterMult,
        10,
      );
    });
  }

  it("clamps BEFORE multiplying, so a winter band can exceed the cap", () => {
    // The order is load-bearing. Clamping after would cap winter at 30 and erase
    // the widening exactly where it was measured to be needed.
    expect(computeBand(50, JANUARY, GATE)).toBeCloseTo(GATE.capPct * GATE.winterMult, 10);
    expect(computeBand(50, JANUARY, GATE)).toBeGreaterThan(GATE.capPct);
  });

  it("leaves every non-winter month unmultiplied", () => {
    for (let month = 1; month <= 12; month++) {
      const band = computeBand(3.0, month, GATE);
      if (WINTER_MONTHS.has(month)) expect(band).toBeCloseTo(18 * 2.0, 10);
      else expect(band).toBeCloseTo(18, 10);
    }
  });
});

describe("resolveBands — AC 4 (no calibration runs at cap bands)", () => {
  it("returns cap bands and flags pending when uncalibrated", () => {
    const bands = resolveBands(null, JUNE);
    expect(bands.gate).toBe(GATE.capPct);
    expect(bands.detect).toBe(DETECT.capPct);
    expect(bands.calibrationId).toBeNull();
    expect(bands.calibrationVersion).toBeNull();
  });

  it("widens the uncalibrated cap in winter too", () => {
    const bands = resolveBands(null, JANUARY);
    expect(bands.gate).toBeCloseTo(GATE.capPct * GATE.winterMult, 10);
    expect(bands.winterApplied).toBe(true);
  });

  it("carries the calibration identity through for the audit trail", () => {
    const bands = resolveBands(basis(3.0), JUNE);
    expect(bands.calibrationId).toBe("cal-1");
    expect(bands.calibrationVersion).toBe(2);
    expect(bands.gate).toBeCloseTo(18, 10);
  });

  it("labels an uncalibrated plant as such, never as v0", () => {
    expect(calibrationLabel(resolveBands(null, JUNE))).toBe("uncalibrated");
    expect(calibrationLabel(resolveBands(basis(3), JUNE))).toBe("calibration v2");
  });
});

describe("toToleranceConfig — CHECK A adaptive, B and C untouched", () => {
  const projected = toToleranceConfig(resolveBands(basis(3.0), JUNE), DEFAULT_TOLERANCES);

  it("replaces only the inverter-vs-expected pair", () => {
    expect(projected.inv_vs_expected_upper_pct).toBeCloseTo(18, 10);
    expect(projected.inv_vs_expected_lower_pct).toBeCloseTo(-18, 10);
  });

  it("leaves CHECK B and CHECK C exactly as configured", () => {
    // Those legs have no measured residual distribution behind them; adapting
    // them would be inventing a band for an unvalidated check.
    expect(projected.inv_vs_utility_pct).toBe(DEFAULT_TOLERANCES.inv_vs_utility_pct);
    expect(projected.util_vs_expected_upper_pct).toBe(
      DEFAULT_TOLERANCES.util_vs_expected_upper_pct,
    );
    expect(projected.util_vs_expected_lower_pct).toBe(
      DEFAULT_TOLERANCES.util_vs_expected_lower_pct,
    );
    expect(projected.min_data_completeness_pct).toBe(
      DEFAULT_TOLERANCES.min_data_completeness_pct,
    );
  });

  it("is symmetric, because spec 20 measured |residual|", () => {
    expect(projected.inv_vs_expected_upper_pct).toBe(-projected.inv_vs_expected_lower_pct);
  });
});

describe("cohort priors are the measured spec 20 values", () => {
  it("has a factor for all twelve months", () => {
    for (let month = 1; month <= 12; month++) {
      expect(SEASONAL_FACTORS[month]).toBeTypeOf("number");
      expect(SEASONAL_FACTORS[month]).toBeGreaterThan(0);
    }
  });

  it("pins the published cohort figures", () => {
    expect(COHORT_MEDIAN_MAD_PCT).toBe(3.1);
    expect(SEASONAL_FACTORS[1]).toBe(0.73);
    expect(SEASONAL_FACTORS[12]).toBe(0.8);
    expect(SEASONAL_FACTORS[4]).toBe(1.07);
  });

  it("treats winter and stable season as an exact partition of the year", () => {
    const all = [...WINTER_MONTHS, ...STABLE_SEASON_MONTHS].sort((a, b) => a - b);
    expect(all).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const m of WINTER_MONTHS) expect(STABLE_SEASON_MONTHS.has(m)).toBe(false);
  });

  it("keeps the gate strictly wider than the detect band at every MAD", () => {
    for (const mad of [0, 0.5, 1, 3.1, 5, 10, 50]) {
      for (const month of [1, 6, 12]) {
        expect(computeBand(mad, month, GATE)).toBeGreaterThan(
          computeBand(mad, month, DETECT),
        );
      }
    }
  });
});
