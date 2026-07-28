import { describe, expect, it } from "vitest";
import { DEMO_OFFERING } from "../data/demo-offering.js";
import { computeAnnualIrr, computeProForma } from "./proforma.js";

describe("computeProForma", () => {
  it("matches the canonical demo position at $10k / 20y", () => {
    const out = computeProForma({
      investmentUsd: 10_000,
      holdingPeriodYears: 20,
      includeItc: true,
    });
    // Canonical demo investor: 100 ESN = $10,000 = 0.4% ownership, paying
    // $58.33/month at the 7.0% target cash yield (data/demo-offering.ts).
    const d = DEMO_OFFERING.demo_investor;
    expect(out.ownershipPct).toBeCloseTo(d.ownership_pct, 4);
    expect(out.monthlyDistribution).toBeCloseTo(d.monthly_distribution_usd, 2);
    expect(out.annualCashYieldPct).toBeCloseTo(d.target_annual_yield_pct, 1);
    expect(out.tokenCount).toBe(d.tokens_held); // $100/token
    expect(out.series).toHaveLength(20);
  });

  it("scales linearly with investment", () => {
    const at50k = computeProForma({
      investmentUsd: 50_000,
      holdingPeriodYears: 10,
      includeItc: false,
    });
    expect(at50k.ownershipPct).toBeCloseTo(2, 5);
    expect(at50k.monthlyDistribution).toBeCloseTo(291.67, 1);
    expect(at50k.tokenCount).toBe(500); // $100/token
    // Cash yield is scale-invariant and stays inside the advertised 6-8% band.
    expect(at50k.annualCashYieldPct).toBeCloseTo(7, 1);
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
