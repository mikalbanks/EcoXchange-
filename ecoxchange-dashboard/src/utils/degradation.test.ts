import { describe, expect, it } from "vitest";
import {
  buildDegradationCurves,
  linearDegradationFactor,
  piecewiseNrelDegradationFactor,
  yearsSince,
} from "./degradation.js";

// Same breakpoints as verification-engine/tests/test_degradation.py — the
// TS mirror and the Python engine must stay provably in sync. (The spec's
// prose table quotes ~0.945 @ yr 10 / ~0.831 @ yr 25, which its own
// formula does not produce; the formula is the implementation of record.)
const BREAKPOINTS: Array<[number, number]> = [
  [0, 1.0],
  [0.5, 0.99],
  [1, 0.98],
  [3, 0.96628],
  [5, 0.95256],
  [10, 0.928746],
  [25, 0.857304],
  [30, 0.8230118],
];

describe("piecewiseNrelDegradationFactor", () => {
  it.each(BREAKPOINTS)("year %s → %s", (years, expected) => {
    expect(piecewiseNrelDegradationFactor(years)).toBeCloseTo(expected, 3);
  });

  it("is monotonically non-increasing over 0–40 years", () => {
    let prev = 1;
    for (let t = 0; t <= 400; t++) {
      const f = piecewiseNrelDegradationFactor(t / 10);
      expect(f).toBeLessThanOrEqual(prev + 1e-12);
      prev = f;
    }
  });

  it("is continuous at the segment joints", () => {
    for (const joint of [1, 5, 25]) {
      expect(
        Math.abs(
          piecewiseNrelDegradationFactor(joint - 1e-6) -
            piecewiseNrelDegradationFactor(joint + 1e-6),
        ),
      ).toBeLessThan(1e-4);
    }
  });

  it("never goes negative", () => {
    expect(piecewiseNrelDegradationFactor(500)).toBe(0);
  });
});

describe("linearDegradationFactor", () => {
  it("reproduces the engine's geometric (1-r)^years behavior", () => {
    expect(linearDegradationFactor(0)).toBe(1);
    expect(linearDegradationFactor(1)).toBeCloseTo(0.9925, 6);
    expect(linearDegradationFactor(10)).toBeCloseTo(0.9925 ** 10, 10);
    expect(linearDegradationFactor(25)).toBeCloseTo(0.9925 ** 25, 10);
  });

  it("under-predicts first-year degradation vs piecewise (the LID gap)", () => {
    expect(piecewiseNrelDegradationFactor(1)).toBeLessThan(
      linearDegradationFactor(1),
    );
  });
});

describe("buildDegradationCurves", () => {
  it("returns one point per year including endpoints", () => {
    const curves = buildDegradationCurves(30);
    expect(curves).toHaveLength(31);
    expect(curves[0]).toEqual({ year: 0, linear: 1, piecewise: 1 });
    expect(curves[30].piecewise).toBeCloseTo(0.823, 3);
  });
});

describe("yearsSince", () => {
  it("computes fractional years from a commissioning date", () => {
    const asOf = new Date("2026-01-01T00:00:00Z");
    expect(yearsSince("2023-01-01", asOf)).toBeCloseTo(3, 1);
    expect(yearsSince("2030-01-01", asOf)).toBe(0);
    expect(yearsSince("not-a-date", asOf)).toBe(0);
  });
});
