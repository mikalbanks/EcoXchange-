import { describe, it, expect } from "vitest";
import { scoreOfferings } from "./suitability-scorer.js";
import type { SuitabilityAnswers } from "../types/suitability.js";
import type { Offering } from "../types/offerings.js";

function offering(overrides: Partial<Offering> = {}): Offering {
  return {
    id: "off-1",
    offering_name: "Savannah Solar I ESN",
    slug: "savannah-solar-i",
    status: "open",
    target_annual_yield: 0.07,
    target_irr: 0.12,
    ppa_term_years: 20,
    target_raise: 2500000,
    ...overrides,
  } as Offering;
}

function answers(overrides: Partial<SuitabilityAnswers> = {}): SuitabilityAnswers {
  return {
    experience_level: "some_alternatives",
    primary_objective: "income",
    risk_tolerance: "conservative",
    time_horizon: "long",
    planned_allocation: "moderate",
    impact_priorities: [],
    solar_experience: false,
    crypto_comfort: "new",
    ...overrides,
  };
}

describe("scoreOfferings", () => {
  it("income + conservative + long → high score on a stable long-PPA offering", () => {
    const [rec] = scoreOfferings(answers(), [offering()]);
    // 50 + 20 (income) + 15 (conservative & ppa>=15) + 10 (long) = 95
    expect(rec.fit_score).toBe(95);
    expect(rec.fit_reasons.some((r) => /income/i.test(r))).toBe(true);
    expect(rec.fit_reasons.some((r) => /PPA/i.test(r))).toBe(true);
  });

  it("short horizon applies a penalty + liquidity warning", () => {
    const [rec] = scoreOfferings(
      answers({ primary_objective: "growth", risk_tolerance: "moderate", time_horizon: "short" }),
      [offering()],
    );
    expect(rec.fit_score).toBe(40); // 50 - 10
    expect(rec.fit_reasons.some((r) => /liquidity/i.test(r))).toBe(true);
  });

  it("always returns at least one recommendation for open offerings", () => {
    expect(scoreOfferings(answers(), [offering()]).length).toBe(1);
  });

  it("scores are clamped to 0–100 and closed offerings are excluded", () => {
    const maxed = scoreOfferings(
      answers({ primary_objective: "income", risk_tolerance: "aggressive", time_horizon: "long", planned_allocation: "institutional" }),
      [offering()],
    );
    expect(maxed[0].fit_score).toBe(100); // 50+20+15+10+5 capped at 100
    expect(maxed[0].fit_score).toBeLessThanOrEqual(100);
    expect(scoreOfferings(answers(), [offering({ status: "closed" })])).toHaveLength(0);
  });
});
