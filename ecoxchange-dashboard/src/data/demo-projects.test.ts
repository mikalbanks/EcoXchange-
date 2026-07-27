import { describe, expect, it } from "vitest";
import {
  DEMO_PROJECTS,
  INVESTOR_SUBSET,
  PORTFOLIO_AGGREGATE,
  aggregateFor,
} from "./demo-projects.js";

describe("demo portfolio projects", () => {
  it("has 8 projects across 8 distinct states", () => {
    expect(DEMO_PROJECTS).toHaveLength(8);
    expect(new Set(DEMO_PROJECTS.map((p) => p.state)).size).toBe(8);
  });

  it("aggregates match the spec headline numbers", () => {
    expect(PORTFOLIO_AGGREGATE.aua_usd).toBe(11_900_000);
    expect(PORTFOLIO_AGGREGATE.investors).toBe(216);
    expect(PORTFOLIO_AGGREGATE.avg_yield_pct).toBe(7.9);
    // Spec's stated fraction: 53 verified / 55 total months.
    expect(PORTFOLIO_AGGREGATE.months_verified).toBe(53);
    expect(PORTFOLIO_AGGREGATE.months_total).toBe(55);
    expect(PORTFOLIO_AGGREGATE.verification_rate_pct).toBeCloseTo(96.4, 1);
    expect(PORTFOLIO_AGGREGATE.active_projects).toBe(7);
    expect(PORTFOLIO_AGGREGATE.onboarding_projects).toBe(1);
  });

  it("has exactly one flagged and two pending/onboarding stories", () => {
    const flagged = DEMO_PROJECTS.filter(
      (p) => p.verification_status === "flagged",
    );
    expect(flagged).toHaveLength(1);
    expect(flagged[0].state).toBe("NY");
    const pending = DEMO_PROJECTS.filter(
      (p) => p.verification_status === "pending",
    );
    expect(pending).toHaveLength(2);
    expect(
      DEMO_PROJECTS.filter((p) => p.status === "onboarding"),
    ).toHaveLength(1);
  });

  it("monthly production sums to the annual figure per project", () => {
    for (const p of DEMO_PROJECTS) {
      expect(p.monthly_production_mwh).toHaveLength(12);
      const total = p.monthly_production_mwh.reduce((s, m) => s + m, 0);
      // seasonal weights sum to 1 with small rounding drift
      expect(Math.abs(total - p.annual_generation_mwh)).toBeLessThan(
        p.annual_generation_mwh * 0.01,
      );
    }
  });

  it("capacity factors are consistent with annual generation", () => {
    for (const p of DEMO_PROJECTS) {
      const impliedCf =
        (p.annual_generation_mwh * 1000) / (p.capacity_kw * 8760);
      expect(Math.abs(impliedCf - p.capacity_factor)).toBeLessThan(0.011);
    }
  });

  it("investor subset references real projects that distribute", () => {
    expect(INVESTOR_SUBSET.projectIds).toHaveLength(3);
    for (const id of INVESTOR_SUBSET.projectIds) {
      const p = DEMO_PROJECTS.find((x) => x.id === id);
      expect(p).toBeDefined();
      expect(p!.current_yield_pct).toBeGreaterThan(0);
    }
    const sub = aggregateFor(INVESTOR_SUBSET.projectIds);
    expect(sub.investors).toBeGreaterThan(0);
    expect(sub.aua_usd).toBeGreaterThan(0);
  });
});
