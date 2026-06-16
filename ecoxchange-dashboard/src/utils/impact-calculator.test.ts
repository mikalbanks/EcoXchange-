import { describe, it, expect } from "vitest";
import {
  computeImpact,
  computePortfolioImpact,
  type ImpactInput,
} from "./impact-calculator.js";

function input(overrides: Partial<ImpactInput> = {}): ImpactInput {
  return {
    verified_kwh: 10000,
    unverified_kwh: 0,
    state_code: "GA",
    months_verified: 12,
    months_flagged: 0,
    period_start: "2024-01-01",
    period_end: "2024-12-01",
    ...overrides,
  };
}

describe("computeImpact", () => {
  it("10,000 kWh in Georgia (SRSO) → 3,910 kg CO2, ~65.2 trees, ~0.95 homes", () => {
    const m = computeImpact(input());
    expect(m.egrid_region).toBe("SRSO");
    expect(m.egrid_factor_used).toBe(0.391);
    expect(m.co2_avoided_kg).toBeCloseTo(3910, 2);
    expect(m.trees_equivalent).toBeCloseTo(65.17, 1);
    expect(m.homes_powered_years).toBeCloseTo(0.95, 2);
  });

  it("10,000 kWh in Massachusetts (NEWE) → 2,260 kg CO2 (cleaner grid)", () => {
    const m = computeImpact(input({ state_code: "MA" }));
    expect(m.egrid_region).toBe("NEWE");
    expect(m.co2_avoided_kg).toBeCloseTo(2260, 2);
  });

  it("zero kWh → all zeros, no NaN/Infinity", () => {
    const m = computeImpact(input({ verified_kwh: 0 }));
    for (const v of [
      m.co2_avoided_kg,
      m.co2_avoided_metric_tons,
      m.homes_powered_years,
      m.trees_equivalent,
      m.smartphone_charges,
      m.gallons_gas_avoided,
      m.miles_driving_avoided,
      m.acres_forest_equivalent,
    ]) {
      expect(v).toBe(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("computePortfolioImpact", () => {
  it("two projects sum and percentages total 100", () => {
    const port = computePortfolioImpact([
      { project_id: "a", name: "A", location: "GA", input: input({ verified_kwh: 6000 }) },
      { project_id: "b", name: "B", location: "GA", input: input({ verified_kwh: 4000 }) },
    ]);
    expect(port.total_verified_kwh).toBe(10000);
    expect(port.total_co2_avoided_metric_tons).toBeCloseTo(3.91, 3);
    const pctTotal = port.projects.reduce((s, p) => s + p.pct_of_portfolio_impact, 0);
    expect(pctTotal).toBeCloseTo(100, 6);
    expect(port.projects[0].pct_of_portfolio_impact).toBeCloseTo(60, 6);
  });
});
