import { describe, it, expect } from "vitest";
import { summarizeDistributions, nextDistributionDate } from "./distributions-summary.js";
import type { DistributionRecord } from "../types/distributions.js";

function rec(
  period: string,
  action: "cash_out" | "reinvest",
  net = 58.33,
  status: DistributionRecord["status"] = "completed",
): DistributionRecord {
  return {
    id: period,
    investor_id: "demo",
    offering_id: "off",
    period_start: `${period}-01`,
    period_end: `${period}-28`,
    gross_distribution: net,
    platform_fee: 0,
    net_distribution: net,
    action_taken: action,
    tokens_acquired: null,
    reinvest_price: null,
    tx_hash: null,
    status,
    created_at: `${period}-01`,
  };
}

describe("summarizeDistributions", () => {
  it("6 months cash_out → received = cashed out, DRIP = 0, next = latest", () => {
    const months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"];
    const s = summarizeDistributions(months.map((m) => rec(m, "cash_out")));
    expect(s.total_distributions_received).toBeCloseTo(349.98, 2);
    expect(s.total_cashed_out).toBeCloseTo(349.98, 2);
    expect(s.total_reinvested).toBe(0);
    expect(s.next_estimated_distribution).toBe(58.33);
    expect(s.distribution_history[0].period_start).toBe("2024-06-01"); // newest first
  });

  it("splits reinvest vs cash_out and ignores non-completed", () => {
    const s = summarizeDistributions([
      rec("2024-01", "cash_out", 50),
      rec("2024-02", "reinvest", 60),
      rec("2024-03", "reinvest", 70, "pending"), // excluded
    ]);
    expect(s.total_distributions_received).toBe(110);
    expect(s.total_cashed_out).toBe(50);
    expect(s.total_reinvested).toBe(60);
  });

  it("next distribution date is the 3rd of next month", () => {
    expect(nextDistributionDate(new Date(2024, 5, 20))).toBe("2024-07-03");
    expect(nextDistributionDate(new Date(2024, 11, 1))).toBe("2025-01-03");
  });
});
