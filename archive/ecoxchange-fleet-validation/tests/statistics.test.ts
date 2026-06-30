import { describe, expect, it } from "vitest";
import {
  safeCorrelation,
  safeMean,
  safeMedian,
  safeStdDev,
} from "../src/report/statistics.js";

describe("statistics primitives", () => {
  it("safeMean / safeMedian on empty arrays return 0", () => {
    expect(safeMean([])).toBe(0);
    expect(safeMedian([])).toBe(0);
  });
  it("safeStdDev needs at least 2 points", () => {
    expect(safeStdDev([])).toBe(0);
    expect(safeStdDev([1])).toBe(0);
    expect(safeStdDev([1, 2, 3, 4, 5])).toBeGreaterThan(0);
  });
  it("safeCorrelation returns 0 when one series is constant", () => {
    expect(safeCorrelation([1, 2, 3], [5, 5, 5])).toBe(0);
  });
  it("safeCorrelation = +1 for perfect linear relationship", () => {
    expect(safeCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
  });
});
