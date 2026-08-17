import { describe, expect, it } from "vitest";
import { SPEC_COST, computeCostComparison } from "./cost-comparison.js";

describe("computeCostComparison", () => {
  it("reproduces the spec's $2.5M example exactly", () => {
    const r = computeCostComparison(2_500_000);
    expect(r.traditionalTotal).toBe(235_000); // 20k + 150k + 40k + 15k + 10k
    expect(r.ecoxchangeTotal).toBe(90_000); // 75k + 15k
    expect(r.savings).toBe(145_000);
    expect(r.savingsPct).toBe(62);
  });

  it("scales the capital-raise fee benchmark with the raise; fixed items stay fixed", () => {
    const small = computeCostComparison(500_000);
    const large = computeCostComparison(5_000_000);
    expect(small.lines[1].traditional).toBe(30_000);
    expect(small.lines[1].ecoxchange).toBe(15_000);
    expect(large.lines[1].traditional).toBe(300_000);
    expect(large.lines[1].ecoxchange).toBe(150_000);
    expect(small.lines[0].traditional).toBe(large.lines[0].traditional);
  });

  it("line totals reconcile and savings is always positive in range", () => {
    for (const raise of [500_000, 1_000_000, 2_500_000, 5_000_000]) {
      const r = computeCostComparison(raise);
      expect(r.lines.reduce((s, l) => s + l.traditional, 0)).toBe(r.traditionalTotal);
      expect(r.lines.reduce((s, l) => s + l.ecoxchange, 0)).toBe(r.ecoxchangeTotal);
      expect(r.savings).toBeGreaterThan(0);
      expect(r.savingsPct).toBeGreaterThanOrEqual(50);
      expect(r.savingsPct).toBeLessThanOrEqual(80);
    }
  });

  it("SPEC_COST headline agrees with the line-item model at the $2.5M raise", () => {
    // The spec's $90K origination figure and the computed EcoXchange total
    // must be the same number — chart, table, and model may never diverge.
    const r = computeCostComparison(2_500_000);
    expect(r.ecoxchangeTotal).toBe(SPEC_COST.ecoxchangeUpfrontUsd);
    expect(SPEC_COST.traditionalLowUsd).toBeLessThan(
      SPEC_COST.traditionalHighUsd,
    );
    expect(SPEC_COST.ecoxchangeUpfrontUsd).toBeLessThan(
      SPEC_COST.traditionalLowUsd,
    );
  });

  it("zero-cost EcoXchange lines carry their display labels", () => {
    const r = computeCostComparison(2_500_000);
    expect(r.lines[0].zeroLabel).toBe("Included");
    expect(r.lines[3].zeroLabel).toBe("Automated");
    expect(r.lines[4].zeroLabel).toBe("Included");
  });
});
