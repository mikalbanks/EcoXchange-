import type {
  DistributionRecord,
  DistributionSummary,
} from "../types/distributions.js";

// Next distribution lands on the 3rd of next month (Spec 09).
export function nextDistributionDate(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 3);
  return d.toISOString().split("T")[0];
}

// Pure aggregation of distribution history into summary stats.
export function summarizeDistributions(
  records: DistributionRecord[],
  now?: Date,
): DistributionSummary {
  const sorted = [...records].sort((a, b) =>
    b.period_start.localeCompare(a.period_start),
  );
  const completed = sorted.filter((r) => r.status === "completed");
  const sumNet = (rs: DistributionRecord[]) =>
    rs.reduce((s, r) => s + r.net_distribution, 0);

  return {
    total_distributions_received: sumNet(completed),
    total_reinvested: sumNet(completed.filter((r) => r.action_taken === "reinvest")),
    total_cashed_out: sumNet(completed.filter((r) => r.action_taken === "cash_out")),
    next_estimated_distribution: sorted.length > 0 ? sorted[0].net_distribution : 0,
    next_distribution_date: nextDistributionDate(now),
    distribution_history: sorted,
  };
}
