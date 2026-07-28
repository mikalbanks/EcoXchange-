import { describe, expect, it } from "vitest";
import { DEMO_OFFERING } from "./demo-offering.js";
import demoDistributions from "./demo-distributions.json";
import demoPortfolio from "./demo-portfolio.json";
import { DEMO_HOLDERS, holderAmountUsd } from "./demo-wallets.js";

describe("demo offering arithmetic", () => {
  const d = DEMO_OFFERING.demo_investor;

  it("position value = tokens x price", () => {
    expect(d.position_value_usd).toBe(
      d.tokens_held * DEMO_OFFERING.token_price_usd,
    );
  });

  it("monthly distribution = position x yield / 12", () => {
    expect(d.monthly_distribution_usd).toBeCloseTo(
      (d.position_value_usd * (d.target_annual_yield_pct / 100)) / 12,
      2,
    );
  });

  it("annual distribution = monthly x 12", () => {
    expect(d.annual_distribution_usd).toBeCloseTo(
      d.monthly_distribution_usd * 12,
      1,
    );
  });

  it("position value matches the $10K minimum", () => {
    expect(d.position_value_usd).toBe(10_000);
    expect(d.position_value_usd).toBe(DEMO_OFFERING.minimum_investment_usd);
  });

  it("yield is within the 6-8% target band", () => {
    expect(d.target_annual_yield_pct).toBeGreaterThanOrEqual(6);
    expect(d.target_annual_yield_pct).toBeLessThanOrEqual(8);
  });

  it("total raise = total tokens x price", () => {
    expect(DEMO_OFFERING.total_raise_usd).toBe(
      DEMO_OFFERING.total_tokens * DEMO_OFFERING.token_price_usd,
    );
  });

  it("ownership = tokens held / total supply", () => {
    expect(d.ownership_pct).toBeCloseTo(
      (d.tokens_held / DEMO_OFFERING.total_tokens) * 100,
      4,
    );
    expect(d.ownership_bps).toBe(40);
  });

  it("the investor's share of the offering pool is their distribution", () => {
    const share = d.ownership_pct / 100;
    expect(
      DEMO_OFFERING.offering_distributions.monthly_total_usd * share,
    ).toBeCloseTo(d.monthly_distribution_usd, 2);
    expect(
      DEMO_OFFERING.offering_distributions.annual_total_usd * share,
    ).toBeCloseTo(d.annual_distribution_usd, 2);
  });
});

// The demo renders from several fixtures. They are only consistent if every one
// of them agrees with the canonical source — that agreement is what these
// assertions pin down.
describe("downstream fixtures agree with the canonical offering", () => {
  const d = DEMO_OFFERING.demo_investor;

  it("demo-portfolio matches the canonical position", () => {
    const p = demoPortfolio.portfolio;
    expect(p.total_invested).toBe(d.position_value_usd);
    expect(p.monthly_yield_usd).toBeCloseTo(d.monthly_distribution_usd, 2);
    expect(p.lifetime_yield_usd).toBeCloseTo(d.lifetime_distributions_usd, 2);
    expect(demoPortfolio.projects[0].monthly_yield_usd).toBeCloseTo(
      d.monthly_distribution_usd,
      2,
    );
    expect(demoPortfolio.projects[0].investor_share_pct).toBeCloseTo(
      d.ownership_pct,
      4,
    );
  });

  it("demo-distributions holding matches the canonical position", () => {
    const holding = demoDistributions.holdings[0];
    expect(holding.tokens_held).toBe(d.tokens_held);
    expect(holding.cost_basis).toBe(d.position_value_usd);
    expect(holding.target_annual_yield * 100).toBeCloseTo(
      d.target_annual_yield_pct,
      4,
    );
  });

  it("every distribution in the history pays the canonical monthly amount", () => {
    for (const record of demoDistributions.history) {
      expect(record.net_distribution).toBeCloseTo(
        d.monthly_distribution_usd,
        2,
      );
    }
    const paid = demoDistributions.history.reduce(
      (sum, r) => sum + r.net_distribution,
      0,
    );
    expect(paid).toBeCloseTo(d.lifetime_distributions_usd, 2);
  });

  it("the demo investor's wallet share matches their ownership", () => {
    const yours = DEMO_HOLDERS.find((h) => h.label === "Your Wallet");
    expect(yours?.shareBps).toBe(d.ownership_bps);
    expect(
      holderAmountUsd(
        DEMO_OFFERING.offering_distributions.monthly_total_usd,
        yours!.shareBps,
      ),
    ).toBeCloseTo(d.monthly_distribution_usd, 2);
  });
});
