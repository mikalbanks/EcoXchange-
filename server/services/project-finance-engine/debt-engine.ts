import {
  parseProjectFinanceInput,
  type AnnualDebtScheduleRow,
  type AnnualProjectCashFlow,
  type BindingDebtConstraint,
  type FinancingSummary,
  type MetricTrace,
  type ProjectFinanceInput,
  type ReconciliationResult,
} from "./domain-contracts";

const MONEY_TOLERANCE = 1;
const SOLVER_ITERATIONS = 100;
const EPSILON = 1e-9;

export const DEBT_FORMULA_IDS = {
  allowableDebtService: "ALLOWABLE_DEBT_SERVICE_V1",
  dscrDebtCapacity: "DSCR_DEBT_CAPACITY_V1",
  ltcLimit: "LTC_LIMIT_V1",
  permanentDebt: "PERMANENT_DEBT_V1",
  debtSculpt: "DEBT_SCULPT_V1",
  annualDscr: "ANNUAL_DSCR_V1",
  balloonBalance: "BALLOON_BALANCE_V1",
  debtReconciliation: "DEBT_RECONCILIATION_V1",
  negativeAmortizationLimit: "NEGATIVE_AMORTIZATION_LIMIT_V1",
} as const;

export type DebtFormulaId = (typeof DEBT_FORMULA_IDS)[keyof typeof DEBT_FORMULA_IDS];

export type DebtCalculationErrorCode =
  | "DEBT_SCULPTING_RECONCILIATION_ERROR"
  | "NEGATIVE_AMORTIZATION_REQUIRED"
  | "DEBT_SOLVER_FAILED"
  | "INVALID_DEBT_SERVICE_PROFILE";

export class DebtCalculationError extends Error {
  constructor(
    public readonly code: DebtCalculationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DebtCalculationError";
  }
}

export interface DebtSizingResult {
  raw_allowable_debt_service: number[];
  usable_allowable_debt_service: number[];
  raw_pv_debt_capacity: number;
  dscr_sized_debt: number;
  ltc_debt_limit: number;
  permanent_debt: number;
  binding_constraint: BindingDebtConstraint;
  negative_amortization_limited: boolean;
  schedule_scale: number;
}

export interface DebtEngineResult {
  debt_sizing: DebtSizingResult;
  annual_debt_schedule: AnnualDebtScheduleRow[];
  financing_summary: FinancingSummary;
  reconciliation: ReconciliationResult;
  metric_traces: MetricTrace[];
}

function trace(
  metric_key: string,
  value: number | null,
  formula_id: DebtFormulaId,
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

export function calculateAllowableDebtService(
  annualCashFlows: readonly AnnualProjectCashFlow[],
  targetDscr: number,
  amortizationYears: number,
): { raw: number[]; usable: number[] } {
  if (targetDscr <= 0 || !Number.isFinite(targetDscr)) {
    throw new DebtCalculationError("INVALID_DEBT_SERVICE_PROFILE", "Target DSCR must be positive and finite.");
  }
  if (annualCashFlows.length < amortizationYears) {
    throw new DebtCalculationError(
      "INVALID_DEBT_SERVICE_PROFILE",
      "Operating cash-flow rows must cover the full amortization period.",
      { rows: annualCashFlows.length, amortizationYears },
    );
  }

  const raw = annualCashFlows.slice(0, amortizationYears).map((row) => row.cfads / targetDscr);
  const usable = raw.map((value) => Math.max(0, value));
  return { raw, usable };
}

export function presentValueDebtCapacity(
  annualDebtService: readonly number[],
  annualInterestRate: number,
): number {
  if (!Number.isFinite(annualInterestRate) || annualInterestRate <= -1) {
    throw new DebtCalculationError("INVALID_DEBT_SERVICE_PROFILE", "Annual interest rate must be greater than -1.");
  }
  return annualDebtService.reduce(
    (sum, debtService, index) => sum + debtService / Math.pow(1 + annualInterestRate, index + 1),
    0,
  );
}

interface FeasibilityCheck {
  feasible: boolean;
  ending_balance: number;
  negative_amortization_year: number | null;
}

function checkScheduleFeasibility(
  openingDebt: number,
  annualInterestRate: number,
  debtServiceProfile: readonly number[],
): FeasibilityCheck {
  let balance = openingDebt;

  for (let index = 0; index < debtServiceProfile.length; index += 1) {
    if (balance <= MONEY_TOLERANCE) return { feasible: true, ending_balance: 0, negative_amortization_year: null };
    const interest = balance * annualInterestRate;
    const service = Math.max(0, debtServiceProfile[index] ?? 0);
    if (service + EPSILON < interest) {
      return { feasible: false, ending_balance: balance, negative_amortization_year: index + 1 };
    }
    const principal = Math.min(balance, Math.max(0, service - interest));
    balance = Math.max(0, balance - principal);
  }

  return {
    feasible: balance <= MONEY_TOLERANCE,
    ending_balance: balance,
    negative_amortization_year: null,
  };
}

export function solveMaximumFeasibleDebt(
  initialDebt: number,
  annualInterestRate: number,
  debtServiceProfile: readonly number[],
): number {
  if (initialDebt <= MONEY_TOLERANCE) return 0;
  const initialCheck = checkScheduleFeasibility(initialDebt, annualInterestRate, debtServiceProfile);
  if (initialCheck.feasible) return initialDebt;

  let low = 0;
  let high = initialDebt;
  for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
    const mid = (low + high) / 2;
    const check = checkScheduleFeasibility(mid, annualInterestRate, debtServiceProfile);
    if (check.feasible) low = mid;
    else high = mid;
    if (high - low <= MONEY_TOLERANCE / 100) break;
  }

  const solved = low;
  const solvedCheck = checkScheduleFeasibility(solved, annualInterestRate, debtServiceProfile);
  if (!solvedCheck.feasible) {
    throw new DebtCalculationError("DEBT_SOLVER_FAILED", "Unable to solve a non-negative-amortizing debt amount.", {
      initialDebt,
      annualInterestRate,
    });
  }
  return solved;
}

export function calculateDebtSizing(
  input: ProjectFinanceInput,
  annualCashFlows: readonly AnnualProjectCashFlow[],
): DebtSizingResult {
  const validated = parseProjectFinanceInput(input);
  const amortizationYears = validated.financing.amortization_years;
  const { raw, usable } = calculateAllowableDebtService(
    annualCashFlows,
    validated.financing.target_dscr,
    amortizationYears,
  );

  const rawPvDebtCapacity = presentValueDebtCapacity(usable, validated.financing.annual_interest_rate);
  const feasibleDscrDebt = solveMaximumFeasibleDebt(
    rawPvDebtCapacity,
    validated.financing.annual_interest_rate,
    usable,
  );
  const negativeAmortizationLimited = feasibleDscrDebt + MONEY_TOLERANCE < rawPvDebtCapacity;
  const ltcDebtLimit = validated.transaction_costs.project_capex * validated.financing.max_ltc;
  const permanentDebt = Math.max(0, Math.min(feasibleDscrDebt, ltcDebtLimit));

  let binding: BindingDebtConstraint;
  if (permanentDebt <= MONEY_TOLERANCE) {
    binding = "ZERO_CFADS";
  } else if (negativeAmortizationLimited && feasibleDscrDebt <= ltcDebtLimit + MONEY_TOLERANCE) {
    binding = "NEGATIVE_AMORTIZATION";
  } else if (feasibleDscrDebt <= ltcDebtLimit + MONEY_TOLERANCE) {
    binding = "DSCR";
  } else if (ltcDebtLimit < feasibleDscrDebt - MONEY_TOLERANCE) {
    binding = "LTC";
  } else {
    binding = "OTHER";
  }

  const scale = feasibleDscrDebt > 0 ? permanentDebt / feasibleDscrDebt : 0;

  return {
    raw_allowable_debt_service: raw,
    usable_allowable_debt_service: usable,
    raw_pv_debt_capacity: rawPvDebtCapacity,
    dscr_sized_debt: feasibleDscrDebt,
    ltc_debt_limit: ltcDebtLimit,
    permanent_debt: permanentDebt,
    binding_constraint: binding,
    negative_amortization_limited: negativeAmortizationLimited,
    schedule_scale: scale,
  };
}

export function buildDebtSchedule(
  input: ProjectFinanceInput,
  annualCashFlows: readonly AnnualProjectCashFlow[],
  sizing: DebtSizingResult,
): AnnualDebtScheduleRow[] {
  const validated = parseProjectFinanceInput(input);
  const years = validated.financing.amortization_years;
  const rate = validated.financing.annual_interest_rate;
  const targetDscr = validated.financing.target_dscr;
  let balance = sizing.permanent_debt;
  const rows: AnnualDebtScheduleRow[] = [];

  for (let index = 0; index < years; index += 1) {
    const year = index + 1;
    const opening = balance;
    const interest = opening * rate;
    const maximumService = sizing.usable_allowable_debt_service[index] ?? 0;
    const scheduledService = maximumService * sizing.schedule_scale;

    if (opening > MONEY_TOLERANCE && scheduledService + EPSILON < interest) {
      throw new DebtCalculationError("NEGATIVE_AMORTIZATION_REQUIRED", "Scheduled debt service is below annual interest.", {
        year,
        opening,
        interest,
        scheduledService,
      });
    }

    const principalCapacity = Math.max(0, scheduledService - interest);
    let principal = Math.min(opening, principalCapacity);
    if (opening - principal <= MONEY_TOLERANCE) principal = opening;
    const debtService = opening <= MONEY_TOLERANCE ? 0 : interest + principal;
    balance = Math.max(0, opening - principal);
    if (balance <= MONEY_TOLERANCE) balance = 0;
    const cfads = annualCashFlows[index]?.cfads ?? 0;
    const dscr = debtService > 0 ? cfads / debtService : null;

    rows.push({
      year,
      opening_balance: opening,
      interest: debtService > 0 ? interest : 0,
      principal,
      debt_service: debtService,
      ending_balance: balance,
      dscr,
    });
  }

  return rows;
}

function minimumDscr(rows: readonly AnnualDebtScheduleRow[]): { value: number | null; year: number | null } {
  const candidates = rows.filter((row) => row.debt_service > 0 && row.dscr !== null);
  if (candidates.length === 0) return { value: null, year: null };
  let minimum = candidates[0];
  for (const row of candidates.slice(1)) {
    if ((row.dscr ?? Infinity) < (minimum.dscr ?? Infinity)) minimum = row;
  }
  return { value: minimum.dscr, year: minimum.year };
}

export function calculateDebtEngine(
  input: ProjectFinanceInput,
  annualCashFlows: readonly AnnualProjectCashFlow[],
): DebtEngineResult {
  const validated = parseProjectFinanceInput(input);
  const sizing = calculateDebtSizing(validated, annualCashFlows);
  const schedule = buildDebtSchedule(validated, annualCashFlows, sizing);
  const minimum = minimumDscr(schedule);
  const maturityIndex = Math.min(validated.financing.debt_maturity_years, schedule.length) - 1;
  const balloon = maturityIndex >= 0 ? schedule[maturityIndex]?.ending_balance ?? 0 : 0;
  const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
  const finalBalance = schedule.at(-1)?.ending_balance ?? 0;
  const reconciliationDifference = sizing.permanent_debt - totalPrincipal - finalBalance;
  const debtReconciled = Math.abs(reconciliationDifference) <= MONEY_TOLERANCE;

  if (!debtReconciled) {
    throw new DebtCalculationError(
      "DEBT_SCULPTING_RECONCILIATION_ERROR",
      "Debt schedule does not reconcile within the $1 tolerance.",
      { reconciliationDifference, permanentDebt: sizing.permanent_debt, totalPrincipal, finalBalance },
    );
  }

  const financingSummary: FinancingSummary = {
    dscr_sized_debt: sizing.dscr_sized_debt,
    ltc_debt_limit: sizing.ltc_debt_limit,
    permanent_debt: sizing.permanent_debt,
    binding_constraint: sizing.binding_constraint,
    debt_to_capex: sizing.permanent_debt / validated.transaction_costs.project_capex,
    minimum_dscr: minimum.value,
    minimum_dscr_year: minimum.year,
    balloon_balance: balloon,
  };

  const reconciliation: ReconciliationResult = {
    debt_reconciliation_difference: reconciliationDifference,
    debt_reconciled: debtReconciled,
  };

  const metricTraces: MetricTrace[] = [];
  sizing.raw_allowable_debt_service.forEach((raw, index) => {
    metricTraces.push(trace(
      `allowable_debt_service.year_${index + 1}`,
      sizing.usable_allowable_debt_service[index] ?? 0,
      DEBT_FORMULA_IDS.allowableDebtService,
      [`cfads.year_${index + 1}`, "financing.target_dscr"],
      {
        cfads: annualCashFlows[index]?.cfads ?? 0,
        target_dscr: validated.financing.target_dscr,
        raw_allowable_debt_service: raw,
      },
    ));
  });
  metricTraces.push(
    trace("dscr_sized_debt", sizing.dscr_sized_debt, DEBT_FORMULA_IDS.dscrDebtCapacity, [
      "usable_allowable_debt_service[]",
      "financing.annual_interest_rate",
      "financing.amortization_years",
    ], {
      raw_pv_debt_capacity: sizing.raw_pv_debt_capacity,
      negative_amortization_limited: sizing.negative_amortization_limited,
    }),
    trace("ltc_debt_limit", sizing.ltc_debt_limit, DEBT_FORMULA_IDS.ltcLimit, [
      "transaction_costs.project_capex",
      "financing.max_ltc",
    ]),
    trace("permanent_debt", sizing.permanent_debt, DEBT_FORMULA_IDS.permanentDebt, [
      "dscr_sized_debt",
      "ltc_debt_limit",
    ], { binding_constraint: sizing.binding_constraint }),
    trace("balloon_balance", balloon, DEBT_FORMULA_IDS.balloonBalance, [
      "annual_debt_schedule",
      "financing.debt_maturity_years",
    ]),
    trace("debt_reconciliation_difference", reconciliationDifference, DEBT_FORMULA_IDS.debtReconciliation, [
      "permanent_debt",
      "annual_debt_schedule.principal[]",
      "annual_debt_schedule.ending_balance",
    ]),
  );

  if (sizing.negative_amortization_limited) {
    metricTraces.push(trace(
      "negative_amortization_limit",
      sizing.dscr_sized_debt,
      DEBT_FORMULA_IDS.negativeAmortizationLimit,
      ["raw_pv_debt_capacity", "usable_allowable_debt_service[]", "financing.annual_interest_rate"],
    ));
  }

  schedule.forEach((row) => {
    metricTraces.push(trace(
      `annual_dscr.year_${row.year}`,
      row.dscr,
      DEBT_FORMULA_IDS.annualDscr,
      [`cfads.year_${row.year}`, `debt_service.year_${row.year}`],
    ));
  });

  return {
    debt_sizing: sizing,
    annual_debt_schedule: schedule,
    financing_summary: financingSummary,
    reconciliation,
    metric_traces: metricTraces,
  };
}
