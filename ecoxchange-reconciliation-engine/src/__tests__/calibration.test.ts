import { describe, it, expect } from "vitest";
import {
  fitCalibration,
  type CalibrationInputRecord,
} from "../reconciliation/calibration.js";
import {
  MIN_STABLE_MONTHS_FOR_CALIBRATION,
  SEASONAL_FACTORS,
} from "../reconciliation/thresholds.js";

function record(period: string, residual: number | null): CalibrationInputRecord {
  return { period_start: period, inv_vs_expected_pct: residual };
}

/** `count` stable-season months starting at March of `year`, all at `residual`. */
function stableMonths(year: number, count: number, residual: number) {
  const out: CalibrationInputRecord[] = [];
  for (let i = 0; i < count; i++) {
    const month = 3 + (i % 9); // Mar..Nov
    const y = year + Math.floor(i / 9);
    out.push(record(`${y}-${String(month).padStart(2, "0")}-01`, residual));
  }
  return out;
}

describe("fitCalibration — AC 4 (under 4 stable months there is no fit)", () => {
  it("refuses to fit with three stable months", () => {
    const result = fitCalibration(stableMonths(2024, 3, 2));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.shortfall.reason).toBe("insufficient_stable_months");
    expect(result.shortfall.stableMonthsAvailable).toBe(3);
    expect(result.shortfall.stableMonthsRequired).toBe(MIN_STABLE_MONTHS_FOR_CALIBRATION);
  });

  it("fits at exactly four", () => {
    expect(fitCalibration(stableMonths(2024, 4, 2)).ok).toBe(true);
  });

  it("does not count winter months toward the minimum", () => {
    // Three stable + three winter is still three stable.
    const records = [
      ...stableMonths(2024, 3, 2),
      record("2024-12-01", 2),
      record("2025-01-01", 2),
      record("2025-02-01", 2),
    ];
    const result = fitCalibration(records);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.shortfall.stableMonthsAvailable).toBe(3);
  });

  it("ignores periods with no deviation recorded", () => {
    const records = [...stableMonths(2024, 4, 2), record("2024-07-01", null)];
    const result = fitCalibration(records);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.fit.nMonthsUsed).toBe(4);
  });
});

describe("fitCalibration — §4.2 winter is excluded from the fit", () => {
  it("does not let a volatile winter inflate the MAD", () => {
    // Stable season is tight; winter is wild. Including winter would roughly
    // 2.4x the MAD (12.0% vs 5.1%, spec 20 §4.1) and widen the band all year.
    const stable = [
      record("2024-03-01", 1),
      record("2024-04-01", -1),
      record("2024-05-01", 1),
      record("2024-06-01", -1),
    ];
    const withWinter = [
      ...stable,
      record("2024-12-01", 40),
      record("2025-01-01", -35),
      record("2025-02-01", 38),
    ];

    const a = fitCalibration(stable);
    const b = fitCalibration(withWinter);
    if (!a.ok || !b.ok) throw new Error("both should fit");
    expect(b.fit.residualMadPct).toBeCloseTo(a.fit.residualMadPct, 10);
  });

  it("counts only stable months in nMonthsUsed", () => {
    const result = fitCalibration([
      ...stableMonths(2024, 5, 2),
      record("2024-12-01", 9),
      record("2025-01-01", 9),
    ]);
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.nMonthsUsed).toBe(5);
  });
});

describe("fitCalibration — robustness and derived values", () => {
  it("is unmoved by a single outlier month (median, not mean)", () => {
    const clean = [
      record("2024-03-01", 2),
      record("2024-04-01", 2),
      record("2024-05-01", 2),
      record("2024-06-01", 2),
      record("2024-07-01", 2),
    ];
    const withGlitch = [...clean, record("2024-08-01", 250)];
    const a = fitCalibration(clean);
    const b = fitCalibration(withGlitch);
    if (!a.ok || !b.ok) throw new Error("both should fit");
    // One meter glitch must not rewrite the plant's band.
    expect(b.fit.residualMadPct).toBeCloseTo(a.fit.residualMadPct, 10);
  });

  it("never stores a zero MAD, which would read as a failed computation", () => {
    const result = fitCalibration(stableMonths(2024, 6, 0));
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.residualMadPct).toBeGreaterThan(0);
  });

  it("derives plantFactor as the level, distinct from the spread", () => {
    // Consistently 5% under model: level 0.95, spread ~0.
    const result = fitCalibration(stableMonths(2024, 6, -5));
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.plantFactor).toBeCloseTo(0.95, 4);
  });

  it("records the window it was fitted over", () => {
    const result = fitCalibration([
      record("2024-03-01", 1),
      record("2024-09-01", 2),
      record("2024-05-01", -1),
      record("2024-07-01", 0),
    ]);
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.windowStart).toBe("2024-03-01");
    expect(result.fit.windowEnd).toBe("2024-09-01");
  });

  it("rejects an unparseable period rather than guessing a month", () => {
    expect(() => fitCalibration([record("not-a-date", 1)])).toThrow(RangeError);
  });
});

describe("fitCalibration — seasonal factors", () => {
  it("borrows the cohort priors below 24 months of own history", () => {
    const result = fitCalibration(stableMonths(2024, 9, 3));
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.usedCohortSeasonalFactors).toBe(true);
    expect(result.fit.seasonalFactors[1]).toBe(SEASONAL_FACTORS[1]);
    expect(result.fit.seasonalFactors[12]).toBe(SEASONAL_FACTORS[12]);
  });

  it("fits its own once the plant has 24 months", () => {
    // 27 months of stable season, alternating so the spread is non-zero.
    const records = stableMonths(2024, 27, 0).map((r, i) => ({
      ...r,
      inv_vs_expected_pct: i % 2 === 0 ? 3 : -3,
    }));
    const result = fitCalibration(records);
    if (!result.ok) throw new Error("should fit");
    expect(result.fit.usedCohortSeasonalFactors).toBe(false);
    for (let month = 1; month <= 12; month++) {
      expect(result.fit.seasonalFactors[month]).toBeTypeOf("number");
    }
  });
});
