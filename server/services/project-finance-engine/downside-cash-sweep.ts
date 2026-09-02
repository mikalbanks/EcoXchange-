export const DOWNSIDE_SWEEP_MONEY_TOLERANCE_USD = 1;

export interface DownsideCashSweepRow {
  year: number;
  opening_balance: number;
  downside_cfads: number;
  interest_due: number;
  cash_available: number;
  principal_paid: number;
  ending_balance: number;
  interest_shortfall: boolean;
}

export interface DownsideCashSweepResult {
  full_repayment: boolean;
  repayment_year: number | null;
  unrepaid_balance: number;
  interest_shortfall: boolean;
  rows: DownsideCashSweepRow[];
}

/**
 * Applies 100% of nonnegative downside CFADS to interest first and then
 * principal. Unpaid interest is never capitalized. This is a mathematical
 * repayment test only; the underwriting layer decides which horizon is
 * lender-required.
 */
export function calculateDownsideCashSweep(
  openingDebt: number,
  annualInterestRate: number,
  downsideCfads: readonly number[],
): DownsideCashSweepResult {
  let balance = Math.max(0, openingDebt);
  let interestShortfall = false;
  let repaymentYear: number | null = balance <= DOWNSIDE_SWEEP_MONEY_TOLERANCE_USD ? 0 : null;
  const rows: DownsideCashSweepRow[] = [];

  for (let index = 0; index < downsideCfads.length && balance > DOWNSIDE_SWEEP_MONEY_TOLERANCE_USD; index += 1) {
    const year = index + 1;
    const opening = balance;
    const interestDue = opening * annualInterestRate;
    const cashAvailable = Math.max(0, downsideCfads[index] ?? 0);
    const shortfall = cashAvailable + 1e-9 < interestDue;
    const principalPaid = shortfall ? 0 : Math.min(opening, Math.max(0, cashAvailable - interestDue));
    balance = Math.max(0, opening - principalPaid);
    if (balance <= DOWNSIDE_SWEEP_MONEY_TOLERANCE_USD) {
      balance = 0;
      repaymentYear = year;
    }
    if (shortfall) interestShortfall = true;
    rows.push({
      year,
      opening_balance: opening,
      downside_cfads: downsideCfads[index] ?? 0,
      interest_due: interestDue,
      cash_available: cashAvailable,
      principal_paid: principalPaid,
      ending_balance: balance,
      interest_shortfall: shortfall,
    });
  }

  return {
    full_repayment: balance <= DOWNSIDE_SWEEP_MONEY_TOLERANCE_USD,
    repayment_year: repaymentYear,
    unrepaid_balance: balance,
    interest_shortfall: interestShortfall,
    rows,
  };
}
