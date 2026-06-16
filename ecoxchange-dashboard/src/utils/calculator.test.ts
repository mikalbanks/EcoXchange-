import { describe, it, expect } from "vitest";
import {
  computeReturns,
  computeBenchmark,
  computeIRR,
  type CalculatorInputs,
} from "./calculator.js";

function inputs(overrides: Partial<CalculatorInputs> = {}): CalculatorInputs {
  return {
    initial_investment: 10000,
    monthly_contribution: 0,
    time_horizon_years: 10,
    reinvest_distributions: false,
    annual_yield: 0.07,
    annual_appreciation: 0,
    ...overrides,
  };
}

describe("computeReturns", () => {
  it("$10k one-time @7% for 10y, no DRIP → ~$7,000 distributions", () => {
    const out = computeReturns(inputs());
    expect(out.total_distributions_received).toBeCloseTo(7000, 2);
    expect(out.ending_portfolio_value).toBeCloseTo(10000, 2); // principal unchanged
  });

  it("$10k one-time @7% for 10y, DRIP on → ending value > $19,000 (compounding)", () => {
    const out = computeReturns(inputs({ reinvest_distributions: true }));
    expect(out.ending_portfolio_value).toBeGreaterThan(19000);
    expect(out.total_distributions_received).toBe(0); // reinvested, not paid out
  });

  it("$10k + $500/mo for 10y → total_invested = $69,500", () => {
    // Spec cites ~$70,000; the provided algorithm begins monthly contributions
    // in month 2 (month 1 is the initial), so 10000 + 119*500 = 69,500.
    const out = computeReturns(inputs({ monthly_contribution: 500 }));
    expect(out.total_invested).toBe(69500);
  });

  it("yield-only DRIP scenario → effective IRR ≈ the 7% yield", () => {
    const out = computeReturns(inputs({ reinvest_distributions: true }));
    expect(out.effective_irr).toBeCloseTo(0.07, 4);
  });
});

describe("computeBenchmark", () => {
  it("$10k at 10% for 10y (monthly compounding) ≈ $27,070", () => {
    // Spec cites $25,937 (annual compounding); the provided code compounds the
    // nominal 10% monthly → 10000*(1+0.10/12)^120 ≈ 27,070.
    const value = computeBenchmark(10000, 0, 120, 0.1);
    expect(value).toBeCloseTo(27070.4, 0);
  });
});

describe("computeIRR", () => {
  it("converges to ~7% for a pure-compounding terminal value", () => {
    const terminal = 10000 * Math.pow(1 + 0.07 / 12, 120);
    const irr = computeIRR(10000, 0, 120, terminal);
    expect(irr).toBeCloseTo(0.07, 4);
  });
});
