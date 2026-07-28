import { describe, expect, it } from "vitest";
import { DEMO_OFFERING } from "./demo-offering.js";
import { DEMO_HOLDERS, holderAmountUsd } from "./demo-wallets.js";

describe("demo-wallets", () => {
  it("shares sum to exactly 10000 bps", () => {
    const total = DEMO_HOLDERS.reduce((sum, h) => sum + h.shareBps, 0);
    expect(total).toBe(10000);
  });

  it("all addresses are valid 20-byte hex and unique", () => {
    const addresses = DEMO_HOLDERS.map((h) => h.address);
    for (const address of addresses) {
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it("exactly one holder is the demo investor persona at 0.4%", () => {
    const yours = DEMO_HOLDERS.filter((h) => h.label === "Your Wallet");
    expect(yours).toHaveLength(1);
    expect(yours[0].shareBps).toBe(DEMO_OFFERING.demo_investor.ownership_bps);
    expect(yours[0].shareBps).toBe(40);
  });

  it("pro-rata amounts match the canonical monthly pool", () => {
    const pool = DEMO_OFFERING.offering_distributions.monthly_total_usd;
    expect(pool).toBeCloseTo(14_583.33, 2);
    expect(holderAmountUsd(pool, 40)).toBeCloseTo(58.33, 2);
    expect(holderAmountUsd(pool, 6660)).toBeCloseTo(9_712.5, 2);
    // Sum of all holder payouts reconstitutes the pool exactly.
    const paid = DEMO_HOLDERS.reduce((sum, h) => sum + holderAmountUsd(pool, h.shareBps), 0);
    expect(paid).toBeCloseTo(pool, 2);
  });
});
