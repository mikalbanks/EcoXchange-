import {
  parseProjectFinanceInput,
  type AnnualDebtScheduleRow,
  type CalculationWarning,
  type CapitalStackResult,
  type MetricTrace,
  type ProjectFinanceInput,
  type ReconciliationResult,
  type TaxCreditResult,
} from "./domain-contracts";
import type { DebtEngineResult } from "./debt-engine";

const MONEY_TOLERANCE = 1;

export const CAPITAL_STACK_FORMULA_IDS = {
  itcEligibleBasis: "ITC_ELIGIBLE_BASIS_V1",
  itcFaceValue: "ITC_FACE_VALUE_V1",
  itcTransferProceeds: "ITC_TRANSFER_PROCEEDS_V1",
  netItcTransferProceeds: "NET_ITC_TRANSFER_PROCEEDS_V1",
  dsra: "DSRA_V1",
  lenderFee: "LENDER_FEE_V1",
  totalClosingUses: "TOTAL_CLOSING_USES_V1",
  preSponsorSources: "PRE_SPONSOR_SOURCES_V1",
  sponsorEquity: "SPONSOR_EQUITY_V1",
  totalSources: "TOTAL_SOURCES_V1",
  capitalStackPercentages: "CAPITAL_STACK_PERCENTAGES_V1",
  sourcesUsesReconciliation: "SOURCES_USES_RECONCILIATION_V1",
} as const;

export type CapitalStackFormulaId =
  (typeof CAPITAL_STACK_FORMULA_IDS)[keyof typeof CAPITAL_STACK_FORMULA_IDS];

export type CapitalStackCalculationErrorCode =
  | "UNSUPPORTED_DSRA_REFERENCE_METHOD"
  | "SOURCES_USES_RECONCILIATION_ERROR";

export class CapitalStackCalculationError extends Error {
  constructor(
    public readonly code: CapitalStackCalculationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CapitalStackCalculationError";
  }
}

export interface Ticket05CapitalStackResult extends CapitalStackResult {
  excess_sources: number;
  total_sources: number;
}

export interface Ticket05ReconciliationResult extends ReconciliationResult {
  sources_uses_difference: number;
  sources_uses_reconciled: boolean;
}

export interface CapitalStackEngineResult {
  tax_credit_result: TaxCreditResult;
  lender_fee: number;
  dsra: number;
  capital_stack_result: Ticket05CapitalStackResult;
  reconciliation: Ticket05ReconciliationResult;
  warnings: CalculationWarning[];
  metric_traces: MetricTrace[];
}

function trace(
  metric_key: string,
  value: number,
  formula_id: CapitalStackFormulaId,
  dependencies: string[],
  inputs?: Record<string, unknown>,
): MetricTrace {
  return {
    metric_key,
    value,
    formula_id,
    dependencies,
    metadata: inputs ? { inputs } : undefined,
  };
}

export function calculateTaxCredit(input: ProjectFinanceInput): {
  result: TaxCreditResult;
  warnings: CalculationWarning[];
} {
  const validated = parseProjectFinanceInput(input);
  const capex = validated.transaction_costs.project_capex;
  const eligibleBasis = capex * validated.tax_credit.itc_eligible_basis_pct;
  const faceValue = eligibleBasis * validated.tax_credit.itc_rate;
  const grossProceeds = faceValue * validated.tax_credit.itc_transfer_price;
  const transactionCosts = validated.tax_credit.itc_transaction_costs;
  const rawNetProceeds = grossProceeds - transactionCosts;
  const warnings: CalculationWarning[] = [];

  if (rawNetProceeds < 0) {
    warnings.push({
      code: "ITC_TRANSACTION_COSTS_EXCEED_PROCEEDS",
      severity: "HIGH",
      message: "ITC transaction costs exceed gross transfer proceeds; net ITC financing proceeds are floored at zero.",
      metric_key: "net_itc_transfer_proceeds",
      metadata: { gross_transfer_proceeds: grossProceeds, transaction_costs: transactionCosts },
    });
  }

  return {
    result: {
      eligible_basis: eligibleBasis,
      itc_rate: validated.tax_credit.itc_rate,
      itc_face_value: faceValue,
      transfer_price: validated.tax_credit.itc_transfer_price,
      gross_transfer_proceeds: grossProceeds,
      transaction_costs: transactionCosts,
      net_transfer_proceeds: Math.max(0, rawNetProceeds),
    },
    warnings,
  };
}

export function calculateDsra(
  input: ProjectFinanceInput,
  annualDebtSchedule: readonly AnnualDebtScheduleRow[],
  permanentDebt: number,
): number {
  const validated = parseProjectFinanceInput(input);
  if (permanentDebt <= MONEY_TOLERANCE || validated.reserves.dsra_months === 0) return 0;

  const method = validated.reserves.dsra_reference_method ?? "YEAR_ONE";
  if (method !== "YEAR_ONE") {
    throw new CapitalStackCalculationError(
      "UNSUPPORTED_DSRA_REFERENCE_METHOD",
      `Ticket 05 V0 implements YEAR_ONE DSRA only; received ${method}.`,
      { method },
    );
  }

  const yearOneDebtService = annualDebtSchedule[0]?.debt_service ?? 0;
  return yearOneDebtService * (validated.reserves.dsra_months / 12);
}

export function calculateLenderFee(input: ProjectFinanceInput, permanentDebt: number): number {
  const validated = parseProjectFinanceInput(input);
  return Math.max(0, permanentDebt) * validated.financing.lender_fee_rate;
}

export function calculateCapitalStack(
  input: ProjectFinanceInput,
  debt: DebtEngineResult,
): CapitalStackEngineResult {
  const validated = parseProjectFinanceInput(input);
  const { result: taxCredit, warnings } = calculateTaxCredit(validated);
  const permanentDebt = debt.financing_summary.permanent_debt;
  const dsra = calculateDsra(validated, debt.annual_debt_schedule, permanentDebt);
  const lenderFee = calculateLenderFee(validated, permanentDebt);

  const capex = validated.transaction_costs.project_capex;
  const closingCosts = validated.transaction_costs.closing_costs;
  const otherUses = validated.transaction_costs.other_financing_uses;
  const otherSources = validated.transaction_costs.other_permanent_sources ?? 0;

  const totalClosingUses = capex + closingCosts + lenderFee + dsra + otherUses;
  const preSponsorSources = permanentDebt + taxCredit.net_transfer_proceeds + otherSources;
  const rawSponsorEquity = totalClosingUses - preSponsorSources;
  const sponsorEquity = Math.max(0, rawSponsorEquity);
  const excessSources = Math.max(0, preSponsorSources - totalClosingUses);

  if (excessSources > MONEY_TOLERANCE) {
    warnings.push({
      code: "SOURCES_EXCEED_USES",
      severity: "HIGH",
      message: "Permanent non-sponsor sources exceed total closing uses; sponsor equity is floored at zero and excess sources require structural adjustment.",
      metric_key: "sponsor_equity",
      metadata: { excess_sources: excessSources, total_closing_uses: totalClosingUses, pre_sponsor_sources: preSponsorSources },
    });
  }

  const totalSources = preSponsorSources + sponsorEquity;
  const sourcesUsesDifference = totalSources - totalClosingUses;
  const sourcesUsesReconciled = Math.abs(sourcesUsesDifference - excessSources) <= MONEY_TOLERANCE;

  if (!sourcesUsesReconciled) {
    throw new CapitalStackCalculationError(
      "SOURCES_USES_RECONCILIATION_ERROR",
      "Sources and uses do not reconcile within the $1 tolerance after explicit excess sources are considered.",
      { sourcesUsesDifference, excessSources, totalSources, totalClosingUses },
    );
  }

  const pct = (value: number): number => totalClosingUses > 0 ? value / totalClosingUses : 0;
  const capitalStack: Ticket05CapitalStackResult = {
    total_closing_uses: totalClosingUses,
    permanent_debt: permanentDebt,
    net_itc_proceeds: taxCredit.net_transfer_proceeds,
    sponsor_equity: sponsorEquity,
    other_sources: otherSources,
    permanent_debt_pct_total_uses: pct(permanentDebt),
    itc_proceeds_pct_total_uses: pct(taxCredit.net_transfer_proceeds),
    sponsor_equity_pct_total_uses: pct(sponsorEquity),
    other_sources_pct_total_uses: pct(otherSources),
    debt_to_capex: debt.financing_summary.debt_to_capex,
    excess_sources: excessSources,
    total_sources: totalSources,
  };

  const reconciliation: Ticket05ReconciliationResult = {
    debt_reconciliation_difference: debt.reconciliation.debt_reconciliation_difference,
    debt_reconciled: debt.reconciliation.debt_reconciled,
    sources_uses_difference: sourcesUsesDifference,
    sources_uses_reconciled: sourcesUsesReconciled,
  };

  const yearOneDebtService = debt.annual_debt_schedule[0]?.debt_service ?? 0;
  const metricTraces: MetricTrace[] = [
    trace("itc_eligible_basis", taxCredit.eligible_basis, CAPITAL_STACK_FORMULA_IDS.itcEligibleBasis,
      ["transaction_costs.project_capex", "tax_credit.itc_eligible_basis_pct"],
      { project_capex: capex, itc_eligible_basis_pct: validated.tax_credit.itc_eligible_basis_pct }),
    trace("itc_face_value", taxCredit.itc_face_value, CAPITAL_STACK_FORMULA_IDS.itcFaceValue,
      ["itc_eligible_basis", "tax_credit.itc_rate"],
      { eligible_basis: taxCredit.eligible_basis, itc_rate: validated.tax_credit.itc_rate }),
    trace("gross_itc_transfer_proceeds", taxCredit.gross_transfer_proceeds, CAPITAL_STACK_FORMULA_IDS.itcTransferProceeds,
      ["itc_face_value", "tax_credit.itc_transfer_price"],
      { itc_face_value: taxCredit.itc_face_value, transfer_price: validated.tax_credit.itc_transfer_price }),
    trace("net_itc_transfer_proceeds", taxCredit.net_transfer_proceeds, CAPITAL_STACK_FORMULA_IDS.netItcTransferProceeds,
      ["gross_itc_transfer_proceeds", "tax_credit.itc_transaction_costs"],
      { gross_transfer_proceeds: taxCredit.gross_transfer_proceeds, transaction_costs: taxCredit.transaction_costs }),
    trace("dsra", dsra, CAPITAL_STACK_FORMULA_IDS.dsra,
      ["annual_debt_schedule.year_1.debt_service", "reserves.dsra_months"],
      { year_1_debt_service: yearOneDebtService, dsra_months: validated.reserves.dsra_months }),
    trace("lender_fee", lenderFee, CAPITAL_STACK_FORMULA_IDS.lenderFee,
      ["permanent_debt", "financing.lender_fee_rate"],
      { permanent_debt: permanentDebt, lender_fee_rate: validated.financing.lender_fee_rate }),
    trace("total_closing_uses", totalClosingUses, CAPITAL_STACK_FORMULA_IDS.totalClosingUses,
      ["project_capex", "closing_costs", "lender_fee", "dsra", "other_financing_uses"],
      { capex, closing_costs: closingCosts, lender_fee: lenderFee, dsra, other_financing_uses: otherUses }),
    trace("pre_sponsor_sources", preSponsorSources, CAPITAL_STACK_FORMULA_IDS.preSponsorSources,
      ["permanent_debt", "net_itc_transfer_proceeds", "other_permanent_sources"],
      { permanent_debt: permanentDebt, net_itc_proceeds: taxCredit.net_transfer_proceeds, other_permanent_sources: otherSources }),
    trace("sponsor_equity", sponsorEquity, CAPITAL_STACK_FORMULA_IDS.sponsorEquity,
      ["total_closing_uses", "permanent_debt", "net_itc_transfer_proceeds", "other_permanent_sources"],
      { total_closing_uses: totalClosingUses, permanent_debt: permanentDebt, net_itc_proceeds: taxCredit.net_transfer_proceeds, other_permanent_sources: otherSources }),
    trace("total_sources", totalSources, CAPITAL_STACK_FORMULA_IDS.totalSources,
      ["permanent_debt", "net_itc_transfer_proceeds", "other_permanent_sources", "sponsor_equity"],
      { permanent_debt: permanentDebt, net_itc_proceeds: taxCredit.net_transfer_proceeds, other_permanent_sources: otherSources, sponsor_equity: sponsorEquity }),
    trace("sources_uses_difference", sourcesUsesDifference, CAPITAL_STACK_FORMULA_IDS.sourcesUsesReconciliation,
      ["total_sources", "total_closing_uses"], { total_sources: totalSources, total_closing_uses: totalClosingUses, excess_sources: excessSources }),
  ];

  return {
    tax_credit_result: taxCredit,
    lender_fee: lenderFee,
    dsra,
    capital_stack_result: capitalStack,
    reconciliation,
    warnings,
    metric_traces: metricTraces,
  };
}
