import { describe, expect, it } from "vitest";
import { computeAnnualIrr, computeProForma } from "./proforma.js";

describe("computeProForma", () => {
  it("matches the canonical demo dataset at $50k / 20y", () => {
    const out = computeProForma({
      investmentUsd: 50_000,
      holdingPeriodYears: 20,
      includeItc: true,
    });
    // Portfolio canon: 2.0% ownership pays $354.00/month, 8.5% cash yield.
    expect(out.ownershipPct).toBe(2);
    expect(out.monthlyDistribution).toBeCloseTo(354, 2);
    expect(out.annualCashYieldPct).toBeCloseTo(8.5, 1);
    expect(out.tokenCount).toBe(500); // $100/token
    expect(out.series).toHaveLength(20);
  });

  it("scales linearly with investment", () => {
    const at10k = computeProForma({
      investmentUsd: 10_000,
      holdingPeriodYears: 10,
      includeItc: false,
    });
    expect(at10k.ownershipPct).toBeCloseTo(0.4, 5);
    expect(at10k.monthlyDistribution).toBeCloseTo(70.8, 1);
    expect(at10k.tokenCount).toBe(100); // canonical 100 ESN at $10k
  });

  it("ITC toggle raises IRR materially", () => {
    const base = { investmentUsd: 50_000, holdingPeriodYears: 5 };
    const withItc = computeProForma({ ...base, includeItc: true });
    const withoutItc = computeProForma({ ...base, includeItc: false });
    expect(withItc.netIrrPct).toBeGreaterThan(withoutItc.netIrrPct);
    // ~30% of basis returned in year 1 lifts a 5-year IRR by several points.
    expect(withItc.netIrrPct - withoutItc.netIrrPct).toBeGreaterThan(4);
  });

  it("escalates distributions at 2% and accumulates the series", () => {
    const out = computeProForma({
      investmentUsd: 50_000,
      holdingPeriodYears: 3,
      includeItc: false,
    });
    const y1 = out.series[0].cumulativeWithoutItc;
    const y2 = out.series[1].cumulativeWithoutItc - y1;
    expect(y2 / y1).toBeCloseTo(1.02, 3);
    // With-ITC series is a constant +30%-of-basis offset.
    expect(out.series[2].cumulativeWithItc - out.series[2].cumulativeWithoutItc).toBe(15_000);
  });
});

describe("computeAnnualIrr", () => {
  it("recovers a known rate", () => {
    // -1000 now, +1100 in one year = exactly 10%.
    expect(computeAnnualIrr([-1000, 1100])).toBeCloseTo(0.1, 4);
  });

  it("handles level annuities", () => {
    // -1000 now, +120/yr for 20y, principal back at t=20 -> 12%.
    const flows = [-1000, ...Array.from({ length: 19 }, () => 120), 1120];
    expect(computeAnnualIrr(flows)).toBeCloseTo(0.12, 3);
  });
});
