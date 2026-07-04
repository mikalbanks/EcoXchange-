import { describe, expect, it } from "vitest";
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

  it("exactly one holder is the demo investor persona at 2%", () => {
    const yours = DEMO_HOLDERS.filter((h) => h.label === "Your Wallet");
    expect(yours).toHaveLength(1);
    expect(yours[0].shareBps).toBe(200);
  });

  it("pro-rata amounts match the canonical $17,700 pool", () => {
    expect(holderAmountUsd(17700, 200)).toBe(354);
    expect(holderAmountUsd(17700, 6500)).toBe(11505);
    // Sum of all holder payouts reconstitutes the pool exactly.
    const paid = DEMO_HOLDERS.reduce((sum, h) => sum + holderAmountUsd(17700, h.shareBps), 0);
    expect(paid).toBeCloseTo(17700, 2);
  });
});
