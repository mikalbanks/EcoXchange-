import { parseProjectFinanceInput, type CalculationWarning, type MetricTrace, type ProjectFinanceInput } from "./domain-contracts";
import { calculateOperatingCashFlows } from "./operating-cash-flow";
import { calculateDebtEngine, type DebtEngineResult } from "./debt-engine";
import { calculateCapitalStack, type CapitalStackEngineResult } from "./capital-stack";

const MONEY_TOLERANCE = 1;
const IRR_TOLERANCE = 1e-10;
const IRR_ITERATIONS = 250;

export const TICKET06_FORMULA_IDS = {
  sponsorOperatingCashFlow: "SPONSOR_OPERATING_CASH_FLOW_V1",
  sponsorCashIrr: "SPONSOR_CASH_IRR_V1",
  projectUnleveredCashIrr: "PROJECT_UNLEVERED_CASH_IRR_V1",
  npv: "NPV_V1",
  depreciableBasis: "DEPRECIABLE_BASIS_V1",
  bonusDepreciation: "BONUS_DEPRECIATION_V1",
  immediateTaxShield: "IMMEDIATE_TAX_SHIELD_V1",
  simplifiedAfterTaxSponsorIrr: "SIMPLIFIED_AFTER_TAX_SPONSOR_IRR_V1",
  downsideGeneration: "DOWNSIDE_GENERATION_V1",
  downsideRevenue: "DOWNSIDE_REVENUE_V1",
  downsideCfads: "DOWNSIDE_CFADS_V1",
  downsideDscr: "DOWNSIDE_DSCR_V1",
  downsideCashSweep: "DOWNSIDE_CASH_SWEEP_V1",
  downsideCashSweepInterest: "DOWNSIDE_CASH_SWEEP_INTEREST_V1",
  downsideCashSweepPrincipal: "DOWNSIDE_CASH_SWEEP_PRINCIPAL_V1",
  sensitivityRerun: "SENSITIVITY_RERUN_V1",
} as const;

export type IrrStatus = "VALID" | "NO_SIGN_CHANGE" | "MULTIPLE_ROOT_RISK" | "SOLVER_FAILED";
export interface IrrResult { irr: number | null; status: IrrStatus; warning?: string; }

export interface SponsorReturnResult {
  sponsor_operating_cash_flows: number[];
  sponsor_cash_flows_with_year0: number[];
  levered_sponsor_cash_irr: IrrResult;
  project_unlevered_cash_irr_before_tax_attributes: IrrResult;
  sponsor_npv: number | null;
  project_npv: number | null;
  simplified_sponsor_after_tax_irr: IrrResult | null;
  depreciable_basis: number | null;
  bonus_depreciation: number | null;
  immediate_tax_shield: number | null;
}

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

export interface Ticket06DownsideResult {
  downside_type: ProjectFinanceInput["downside"]["downside_type"];
  generation_source_type?: ProjectFinanceInput["downside"]["generation_source_type"];
  generation_multiplier?: number;
  generation_mwh: number[];
  revenue: number[];
  cfads: number[];
  dscr: Array<number | null>;
  minimum_downside_dscr: number | null;
  minimum_downside_dscr_year: number | null;
  full_repayment: boolean;
  repayment_year: number | null;
  unrepaid_balance: number;
  interest_shortfall: boolean;
  cash_sweep_schedule: DownsideCashSweepRow[];
}

export type SensitivityVariable = "PPA_PRICE" | "INTEREST_RATE" | "PROJECT_CAPEX" | "CAPACITY_FACTOR" | "ITC_RATE";
export interface SensitivityPoint {
  input_value: number;
  permanent_debt: number;
  debt_to_capex: number;
  sponsor_equity: number;
  minimum_dscr: number | null;
  levered_sponsor_cash_irr: number | null;
  simplified_sponsor_after_tax_irr: number | null;
  binding_constraint: string;
  minimum_downside_dscr: number | null;
}
export interface SensitivityResult { variable: SensitivityVariable; base_value: number; points: SensitivityPoint[]; }

export interface ProjectFinanceCoreResult {
  input: ProjectFinanceInput;
  operating: ReturnType<typeof calculateOperatingCashFlows>;
  debt: DebtEngineResult;
  capital_stack: CapitalStackEngineResult;
  returns: SponsorReturnResult;
  downside: Ticket06DownsideResult | null;
  warnings: CalculationWarning[];
  metric_traces: MetricTrace[];
}

function signChanges(values: readonly number[]): number {
  const nonZero = values.filter((value) => Math.abs(value) > 1e-12);
  let changes = 0;
  for (let i = 1; i < nonZero.length; i += 1) if (Math.sign(nonZero[i]) !== Math.sign(nonZero[i - 1])) changes += 1;
  return changes;
}

export function calculateNpv(cashFlows: readonly number[], discountRate: number): number {
  return cashFlows.reduce((sum, value, index) => sum + value / Math.pow(1 + discountRate, index), 0);
}

export function calculateIrr(cashFlows: readonly number[]): IrrResult {
  const changes = signChanges(cashFlows);
  if (changes === 0) return { irr: null, status: "NO_SIGN_CHANGE" };
  const f = (rate: number) => calculateNpv(cashFlows, rate);
  const scan: number[] = [-0.999999];
  for (let r = -0.95; r <= 1; r += 0.025) scan.push(Number(r.toFixed(12)));
  for (let r = 1.1; r <= 20; r += 0.1) scan.push(Number(r.toFixed(12)));
  const brackets: Array<[number, number]> = [];
  let prevRate = scan[0];
  let prevValue = f(prevRate);
  for (const rate of scan.slice(1)) {
    const value = f(rate);
    if (Number.isFinite(prevValue) && Number.isFinite(value)) {
      if (Math.abs(prevValue) <= IRR_TOLERANCE) brackets.push([prevRate, prevRate]);
      else if (Math.sign(prevValue) !== Math.sign(value)) brackets.push([prevRate, rate]);
    }
    prevRate = rate;
    prevValue = value;
  }
  if (brackets.length === 0) return { irr: null, status: "SOLVER_FAILED" };
  let [low, high] = brackets[0];
  if (low !== high) {
    let lowValue = f(low);
    for (let iteration = 0; iteration < IRR_ITERATIONS; iteration += 1) {
      const mid = (low + high) / 2;
      const midValue = f(mid);
      if (!Number.isFinite(midValue)) return { irr: null, status: "SOLVER_FAILED" };
      if (Math.abs(midValue) <= IRR_TOLERANCE || Math.abs(high - low) <= 1e-12) { low = high = mid; break; }
      if (Math.sign(lowValue) === Math.sign(midValue)) { low = mid; lowValue = midValue; } else high = mid;
    }
  }
  const irr = (low + high) / 2;
  if (changes > 1 || brackets.length > 1) return { irr, status: "MULTIPLE_ROOT_RISK", warning: "Cash-flow pattern may admit more than one IRR." };
  return { irr, status: "VALID" };
}

export function calculateSponsorReturns(
  input: ProjectFinanceInput,
  debt: DebtEngineResult,
  capital: CapitalStackEngineResult,
  operatingRows: ReturnType<typeof calculateOperatingCashFlows>["annual_project_cash_flows"],
): { result: SponsorReturnResult; warnings: CalculationWarning[]; traces: MetricTrace[] } {
  const validated = parseProjectFinanceInput(input);
  const warnings: CalculationWarning[] = [];
  const traces: MetricTrace[] = [];
  if (debt.financing_summary.balloon_balance > MONEY_TOLERANCE) {
    warnings.push({ code: "UNMODELED_REFINANCE_BALLOON", severity: "HIGH", message: "Sponsor return is not calculated because the debt matures with an unmodeled balloon/refinancing requirement." });
    const emptyIrr: IrrResult = { irr: null, status: "SOLVER_FAILED", warning: "Unmodeled refinancing requirement." };
    return { result: { sponsor_operating_cash_flows: [], sponsor_cash_flows_with_year0: [], levered_sponsor_cash_irr: emptyIrr, project_unlevered_cash_irr_before_tax_attributes: emptyIrr, sponsor_npv: null, project_npv: null, simplified_sponsor_after_tax_irr: null, depreciable_basis: null, bonus_depreciation: null, immediate_tax_shield: null }, warnings, traces };
  }
  const sponsorOperating = operatingRows.map((row, index) => row.cfads - (debt.annual_debt_schedule[index]?.debt_service ?? 0));
  const sponsorCashFlows = [-capital.capital_stack.sponsor_equity, ...sponsorOperating];
  const cashIrr = calculateIrr(sponsorCashFlows);
  const projectUnlevered = calculateIrr([-validated.transaction_costs.project_capex, ...operatingRows.map((row) => row.cfads)]);
  const discountRate = validated.calculation_options.discount_rate;
  const sponsorNpv = discountRate === undefined ? null : calculateNpv(sponsorCashFlows, discountRate);
  const projectNpv = discountRate === undefined ? null : calculateNpv([-validated.transaction_costs.project_capex, ...operatingRows.map((row) => row.cfads)], discountRate);
  let depreciableBasis: number | null = null;
  let bonusDepreciation: number | null = null;
  let immediateTaxShield: number | null = null;
  let afterTaxIrr: IrrResult | null = null;
  if (validated.calculation_options.tax_module_enabled) {
    const bonusPct = validated.tax_credit.bonus_depreciation_pct;
    const taxRate = validated.tax_credit.federal_tax_rate;
    const appetite = validated.tax_credit.sponsor_tax_appetite_pct;
    if (bonusPct === undefined || taxRate === undefined || appetite === undefined) throw new Error("Tax module enabled but required simplified tax inputs are missing.");
    depreciableBasis = capital.tax_credit.eligible_basis - 0.5 * capital.tax_credit.itc_face_value;
    bonusDepreciation = depreciableBasis * bonusPct;
    immediateTaxShield = bonusDepreciation * taxRate * appetite;
    const afterTaxFlows = [...sponsorCashFlows];
    if (afterTaxFlows.length > 1) afterTaxFlows[1] += immediateTaxShield;
    afterTaxIrr = calculateIrr(afterTaxFlows);
    if (appetite > 0) warnings.push({ code: "TAX_APPETITE_ASSUMPTION_APPLIED", severity: "INFO", message: "Simplified after-tax return assumes the explicitly supplied sponsor tax appetite; it is not verified tax capacity.", metadata: { sponsor_tax_appetite_pct: appetite } });
  }
  if (cashIrr.status === "NO_SIGN_CHANGE") warnings.push({ code: "IRR_NO_SIGN_CHANGE", severity: "MEDIUM", message: "Sponsor cash IRR is undefined because cash flows do not change sign." });
  if (cashIrr.status === "MULTIPLE_ROOT_RISK") warnings.push({ code: "IRR_MULTIPLE_ROOT_RISK", severity: "MEDIUM", message: "Sponsor cash flows have multiple sign changes; IRR may not be unique." });
  if (cashIrr.status === "SOLVER_FAILED") warnings.push({ code: "IRR_SOLVER_FAILED", severity: "HIGH", message: "Sponsor cash IRR solver did not converge." });
  if (cashIrr.irr !== null && cashIrr.irr > 1 && capital.capital_stack.sponsor_equity < capital.capital_stack.total_closing_uses * 0.1) warnings.push({ code: "HIGH_IRR_SMALL_EQUITY_DENOMINATOR", severity: "MEDIUM", message: "Very high IRR is associated with a small initial sponsor-equity denominator." });
  traces.push({ metric_key: "levered_sponsor_cash_irr", value: cashIrr.irr, formula_id: TICKET06_FORMULA_IDS.sponsorCashIrr, dependencies: ["capital_stack.sponsor_equity", "sponsor_operating_cash_flows[]"], metadata: { sponsor_cash_flow_array: sponsorCashFlows, solver_version: "bracket-bisection-v1" } });
  sponsorOperating.forEach((value, index) => traces.push({ metric_key: `sponsor_operating_cash_flow.year_${index + 1}`, value, formula_id: TICKET06_FORMULA_IDS.sponsorOperatingCashFlow, dependencies: [`cfads.year_${index + 1}`, `debt_service.year_${index + 1}`] }));
  return { result: { sponsor_operating_cash_flows: sponsorOperating, sponsor_cash_flows_with_year0: sponsorCashFlows, levered_sponsor_cash_irr: cashIrr, project_unlevered_cash_irr_before_tax_attributes: projectUnlevered, sponsor_npv: sponsorNpv, project_npv: projectNpv, simplified_sponsor_after_tax_irr: afterTaxIrr, depreciable_basis: depreciableBasis, bonus_depreciation: bonusDepreciation, immediate_tax_shield: immediateTaxShield }, warnings, traces };
}

export function calculateDownside(input: ProjectFinanceInput, operating: ReturnType<typeof calculateOperatingCashFlows>, debt: DebtEngineResult): { result: Ticket06DownsideResult | null; warnings: CalculationWarning[]; traces: MetricTrace[] } {
  const validated = parseProjectFinanceInput(input);
  if (validated.downside.downside_type === "NONE") return { result: null, warnings: [], traces: [] };
  const warnings: CalculationWarning[] = [];
  const traces: MetricTrace[] = [];
  const baseRows = operating.annual_project_cash_flows;
  const generation = validated.downside.downside_type === "EXPLICIT_GENERATION" ? [...(validated.downside.annual_downside_generation_mwh ?? [])] : baseRows.map((row) => row.generation_mwh * (validated.downside.downside_generation_multiplier ?? 1));
  if (validated.downside.downside_type === "ILLUSTRATIVE_MULTIPLIER") warnings.push({ code: "ILLUSTRATIVE_DOWNSIDE_NOT_P90", severity: "INFO", message: "Multiplier-based downside is illustrative and is not a lender-grade independent-engineer P90." });
  const revenue = baseRows.map((row, index) => generation[index] * row.ppa_price_per_mwh);
  const cfads = baseRows.map((row, index) => revenue[index] - row.opex);
  const dscr = baseRows.map((_, index) => { const service = debt.annual_debt_schedule[index]?.debt_service ?? 0; return service > 0 ? cfads[index] / service : null; });
  let minDscr: number | null = null; let minYear: number | null = null;
  dscr.forEach((value, index) => { if (value !== null && (minDscr === null || value < minDscr)) { minDscr = value; minYear = index + 1; } });
  let balance = debt.financing_summary.permanent_debt;
  const sweep: DownsideCashSweepRow[] = [];
  let interestShortfall = false; let repaymentYear: number | null = null;
  for (let index = 0; index < validated.project.project_life_years && balance > MONEY_TOLERANCE; index += 1) {
    const year = index + 1; const opening = balance; const interestDue = opening * validated.financing.annual_interest_rate; const cashAvailable = Math.max(0, cfads[index] ?? 0); const shortfall = cashAvailable + 1e-9 < interestDue; const principalPaid = shortfall ? 0 : Math.min(opening, Math.max(0, cashAvailable - interestDue)); balance = Math.max(0, opening - principalPaid); if (balance <= MONEY_TOLERANCE) { balance = 0; repaymentYear = year; } if (shortfall) interestShortfall = true; sweep.push({ year, opening_balance: opening, downside_cfads: cfads[index] ?? 0, interest_due: interestDue, cash_available: cashAvailable, principal_paid: principalPaid, ending_balance: balance, interest_shortfall: shortfall });
  }
  if (interestShortfall) warnings.push({ code: "DOWNSIDE_INTEREST_SHORTFALL", severity: "HIGH", message: "Downside cash is insufficient to pay annual interest in at least one sweep year." });
  if (balance > MONEY_TOLERANCE) warnings.push({ code: "DOWNSIDE_NOT_FULLY_REPAID", severity: "HIGH", message: "Downside 100% cash sweep does not fully repay the base permanent debt within the modeled project life.", metadata: { unrepaid_balance: balance } });
  traces.push({ metric_key: "minimum_downside_dscr", value: minDscr, formula_id: TICKET06_FORMULA_IDS.downsideDscr, dependencies: ["downside_cfads[]", "base_debt_service[]"] });
  return { result: { downside_type: validated.downside.downside_type, generation_source_type: validated.downside.generation_source_type, generation_multiplier: validated.downside.downside_generation_multiplier, generation_mwh: generation, revenue, cfads, dscr, minimum_downside_dscr: minDscr, minimum_downside_dscr_year: minYear, full_repayment: balance <= MONEY_TOLERANCE, repayment_year: repaymentYear, unrepaid_balance: balance, interest_shortfall: interestShortfall, cash_sweep_schedule: sweep }, warnings, traces };
}

export function calculateProjectFinanceCore(input: ProjectFinanceInput): ProjectFinanceCoreResult {
  const validated = parseProjectFinanceInput(input);
  const operating = calculateOperatingCashFlows(validated);
  const debt = calculateDebtEngine(validated, operating.annual_project_cash_flows);
  const capital = calculateCapitalStack(validated, debt);
  const returns = calculateSponsorReturns(validated, debt, capital, operating.annual_project_cash_flows);
  const downside = calculateDownside(validated, operating, debt);
  return { input: validated, operating, debt, capital_stack: capital, returns: returns.result, downside: downside.result, warnings: [...operating.warnings, ...capital.warnings, ...returns.warnings, ...downside.warnings], metric_traces: [...operating.metric_traces, ...debt.metric_traces, ...capital.metric_traces, ...returns.traces, ...downside.traces] };
}

function cloneInput(input: ProjectFinanceInput): ProjectFinanceInput { return structuredClone(input); }
function baseValue(input: ProjectFinanceInput, variable: SensitivityVariable): number {
  if (variable === "PPA_PRICE") return input.revenue.ppa_price_year_1_per_mwh;
  if (variable === "INTEREST_RATE") return input.financing.annual_interest_rate;
  if (variable === "PROJECT_CAPEX") return input.transaction_costs.project_capex;
  if (variable === "CAPACITY_FACTOR") return input.generation.capacity_factor_p50;
  return input.tax_credit.itc_rate;
}

export function runSensitivity(input: ProjectFinanceInput, variable: SensitivityVariable, values: readonly number[]): SensitivityResult {
  const validated = parseProjectFinanceInput(input);
  if (variable === "CAPACITY_FACTOR" && validated.generation.annual_generation_override_mwh) throw new Error("SENSITIVITY_NOT_APPLICABLE: capacity factor does not drive generation when an explicit annual generation override is active.");
  const points = values.map((value) => {
    const scenario = cloneInput(validated);
    if (variable === "PPA_PRICE") scenario.revenue.ppa_price_year_1_per_mwh = value;
    else if (variable === "INTEREST_RATE") scenario.financing.annual_interest_rate = value;
    else if (variable === "PROJECT_CAPEX") scenario.transaction_costs.project_capex = value;
    else if (variable === "CAPACITY_FACTOR") scenario.generation.capacity_factor_p50 = value;
    else if (variable === "ITC_RATE") scenario.tax_credit.itc_rate = value;
    else throw new Error("UNSUPPORTED_SENSITIVITY_VARIABLE");
    const result = calculateProjectFinanceCore(scenario);
    return { input_value: value, permanent_debt: result.debt.financing_summary.permanent_debt, debt_to_capex: result.debt.financing_summary.debt_to_capex, sponsor_equity: result.capital_stack.capital_stack.sponsor_equity, minimum_dscr: result.debt.financing_summary.minimum_dscr, levered_sponsor_cash_irr: result.returns.levered_sponsor_cash_irr.irr, simplified_sponsor_after_tax_irr: result.returns.simplified_sponsor_after_tax_irr?.irr ?? null, binding_constraint: result.debt.financing_summary.binding_constraint, minimum_downside_dscr: result.downside?.minimum_downside_dscr ?? null };
  });
  return { variable, base_value: baseValue(validated, variable), points };
}
