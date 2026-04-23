import type { CatalogProjectRow } from "./catalog-projects.types.ts";

export const MIN_YIELD_DISPLAY_INVESTMENT_USD = 10_000;

/** Sum of modeled investor distributions (SGT waterfall output) for the seeded trailing year. */
export function sumAnnualInvestorShareUsd(distributions: Array<{ investorShare: string | null }>): number {
  return distributions.reduce((acc, d) => acc + parseFloat(d.investorShare || "0"), 0);
}

/**
 * Illustrative yield on a minimum ticket using full-capital distributions scaled by ticket / modeled equity stack.
 * Not an offer or guarantee — uses in-app SGT modeling only.
 */
export function estimateYieldAtMinimumTicketUsd(params: {
  equityStackUsd: number;
  annualInvestorDistributionsUsd: number;
  minimumTicketUsd?: number;
}): { minimumTicketUsd: number; modeledEquityUsd: number; estimatedAnnualIncomeUsd: number; yieldPct: number } | null {
  const minimumTicketUsd = params.minimumTicketUsd ?? MIN_YIELD_DISPLAY_INVESTMENT_USD;
  const modeledEquityUsd = params.equityStackUsd;
  if (!Number.isFinite(modeledEquityUsd) || modeledEquityUsd <= 0) return null;
  if (!Number.isFinite(minimumTicketUsd) || minimumTicketUsd <= 0) return null;
  const annual = params.annualInvestorDistributionsUsd;
  if (!Number.isFinite(annual) || annual <= 0) return null;

  const shareOfStack = minimumTicketUsd / modeledEquityUsd;
  const estimatedAnnualIncomeUsd = annual * shareOfStack;
  const yieldPct = (estimatedAnnualIncomeUsd / minimumTicketUsd) * 100;

  return {
    minimumTicketUsd,
    modeledEquityUsd,
    estimatedAnnualIncomeUsd,
    yieldPct,
  };
}
