export type AssumptionSource =
  | "USER_FACT"
  | "DOCUMENT_FACT"
  | "ECOXCHANGE_ASSUMPTION"
  | "DERIVED";

export const CALCULATION_ENGINE_VERSION = "0.2.0";
export const ANALYSIS_TYPE = "INDICATIVE_PROJECT_FINANCE_MODEL" as const;
const HOURS_PER_YEAR = 8_760;
const MONEY_TOLERANCE_USD = 1;
const CONSTRAINT_TOLERANCE_USD = 1;

export const FORMULA_IDS = {
  generationYear1: "GENERATION_YEAR1_V1",
  generationDegradation: "GENERATION_DEGRADATION_V1",
  ppaEscalation: "PPA_ESCALATION_V1",
  revenueContracted: "REVENUE_CONTRACTED_V1",
  opexEscalation: "OPEX_ESCALATION_V1",
  cfads: "CFADS_V1",
  allowableDebtService: "ALLOWABLE_DEBT_SERVICE_V1",
  dscrDebtCapacity: "DSCR_DEBT_CAPACITY_V1",
  ltcLimit: "LTC_LIMIT_V1",
  permanentDebt: "PERMANENT_DEBT_V1",
  debtSculpt: "DEBT_SCULPT_V1",
  dsra: "DSRA_V1",
  lenderFee: "LENDER_FEE_V1",
  itcEligibleBasis: "ITC_ELIGIBLE_BASIS_V1",
  itcFaceValue: "ITC_FACE_VALUE_V1",
  itcTransferProceeds: "ITC_TRANSFER_PROCEEDS_V1",
  sponsorEquity: "SPONSOR_EQUITY_V1",
  sponsorCashIrr: "SPONSOR_CASH_IRR_V1",
  projectCashIrr: "PROJECT_CASH_IRR_V1",
  npv: "NPV_V1",
  downsideDscr: "DOWNSIDE_DSCR_V1",
  downsideCashSweep: "DOWNSIDE_CASH_SWEEP_V1",
} as const;

export type FormulaId = (typeof FORMULA_IDS)[keyof typeof FORMULA_IDS];

export interface FormulaTrace {
  metric: string;
  value: number | null;
  formulaId: FormulaId;
  dependencies: string[];
}

export type ValidationErrorCode =
  | "INVALID_CAPACITY"
  | "INVALID_CAPEX"
  | "INVALID_CAPACITY_FACTOR"
  | "INVALID_DEGRADATION"
  | "INVALID_PPA_PRICE"
  | "INVALID_ESCALATION"
  | "INVALID_PROJECT_LIFE"
  | "INVALID_PPA_TERM"
  | "INVALID_OPEX"
  | "INVALID_INTEREST_RATE"
  | "INVALID_DSCR"
  | "INVALID_LTC"
  | "INVALID_AMORTIZATION"
  | "INVALID_ITC_RATE"
  | "INVALID_ITC_BASIS"
  | "INVALID_TRANSFER_PRICE"
  | "INVALID_GENERATION_OVERRIDE"
  | "INVALID_MATURITY"
  | "INVALID_RESERVE"
  | "INVALID_TRANSACTION_COST";

export class ProjectFinanceValidationError extends Error {
  constructor(public readonly code: ValidationErrorCode, message: string) {
    super(message);
    this.name = "ProjectFinanceValidationError";
  }
}

export type CalculationWarningCode =
  | "NEGATIVE_CFADS"
  | "PPA_TERM_WARNING"
  | "UNCONTRACTED_TAIL"
  | "NEGATIVE_AMORTIZATION_REQUIRED"
  | "DEBT_SCULPTING_RECONCILIATION_ERROR"
  | "SOURCES_EXCEED_USES"
  | "ITC_PROCEEDS_FLOORED_AT_ZERO"
  | "ILLUSTRATIVE_DOWNSIDE"
  | "INTEREST_SHORTFALL"
  | "MULTIPLE_IRR_ROOT_RISK";

export interface CalculationWarning {
  code: CalculationWarningCode;
  message: string;
  year?: number;
}

export type IrrStatus =
  | "VALID"
  | "NO_SIGN_CHANGE"
  | "MULTIPLE_ROOT_RISK"
  | "SOLVER_FAILED";

export interface IrrResult {
  irr: number | null;
  status: IrrStatus;
  warning?: string;
}

export type DscrReferenceMethod =
  | "YEAR_ONE"
  | "MAX_ANNUAL_DEBT_SERVICE"
  | "NEXT_TWELVE_MONTHS"
  | "CUSTOM";

export interface TaxModuleInput {
  enabled: boolean;
  bonusDepreciationPct: number;
  federalTaxRate: number;
  sponsorTaxAppetitePct: number;
}

export interface ProjectFinanceInputs {
  projectName: string;
  capacityMwAc: number;
  p50CapacityFactor: number;
  annualGenerationOverrideMwh?: readonly number[];
  annualDegradationRate: number;
  projectLifeYears: number;
  ppaTermYears: number;
  yearOnePpaPricePerMwh: number;
  annualPpaEscalationRate: number;
  totalProjectCapexUsd: number;
  capexIncludesContingency?: boolean;
  contingencyRate?: number;
  yearOneOpexUsd: number;
  annualOpexEscalationRate: number;
  itcRate: number;
  itcEligibleBasisPercent: number;
  itcTransferPrice: number;
  itcTransferTransactionCostsUsd?: number;
  debtInterestRate: number;
  debtAmortizationYears: number;
  debtMaturityYears?: number;
  targetP50Dscr: number;
  maximumLtc: number;
  upfrontFeePercent: number;
  dsraMonths: number;
  dsraReferenceMethod?: DscrReferenceMethod;
  customDsraReferenceAnnualDebtServiceUsd?: number;
  closingCostsUsd?: number;
  otherFinancingUsesUsd?: number;
  otherPermanentSourcesUsd?: number;
  bridgeEligibleAmountUsd?: number;
  bridgeAdvancePercent?: number;
  downsideGenerationMultiplier?: number;
  explicitDownsideGenerationMwh?: readonly number[];
  discountRate?: number;
  taxModule?: TaxModuleInput;
  underwritingPolicyId?: string;
  underwritingPolicyVersion?: string;
}

export interface AnnualOperatingRow {
  year: number;
  generationMwh: number;
  ppaPricePerMwh: number;
  revenueUsd: number;
  opexUsd: number;
  cfadsUsd: number;
  allowableDebtServiceUsd: number;
  depreciationUsd?: number;
  taxShieldUsd?: number;
}

export interface AnnualDebtScheduleRow {
  year: number;
  openingBalanceUsd: number;
  interestUsd: number;
  principalUsd: number;
  debtServiceUsd: number;
  endingBalanceUsd: number;
  dscr: number | null;
  downsideCfadsUsd: number | null;
  downsideDscr: number | null;
}

export interface TaxCreditResult {
  eligibleBasisUsd: number;
  itcRate: number;
  itcFaceValueUsd: number;
  transferPrice: number;
  grossTransferProceedsUsd: number;
  transactionCostsUsd: number;
  netTransferProceedsUsd: number;
  depreciableBasisUsd?: number;
  bonusDepreciationUsd?: number;
  immediateTaxShieldUsd?: number;
}

export type DebtBindingConstraint =
  | "DSCR"
  | "LTC"
  | "ZERO_CFADS"
  | "NEGATIVE_AMORTIZATION"
  | "AMORTIZATION_TERM"
  | "OTHER"
  | "NONE";

export interface DebtSizingResult {
  dscrSizedDebtUsd: number;
  rawPvDebtCapacityUsd: number;
  ltcMaximumDebtUsd: number;
  permanentDebtUsd: number;
  bindingConstraint: DebtBindingConstraint;
  negativeAmortizationLimited: boolean;
}

export interface FinancingSummary {
  dscrSizedDebtUsd: number;
  ltcDebtLimitUsd: number;
  permanentDebtUsd: number;
  bindingConstraint: DebtBindingConstraint;
  debtToCapex: number;
  minimumDscr: number | null;
  minimumDscrYear: number | null;
  balloonBalanceAtMaturityUsd: number;
  lenderUpfrontFeeUsd: number;
  dsraRequiredUsd: number;
}

export interface CapitalStackResult {
  totalClosingUsesUsd: number;
  permanentDebtUsd: number;
  netItcProceedsUsd: number;
  sponsorEquityUsd: number;
  otherPermanentSourcesUsd: number;
  permanentDebtPctTotalUses: number;
  itcProceedsPctTotalUses: number;
  sponsorEquityPctTotalUses: number;
  otherSourcesPctTotalUses: number;
  debtToCapex: number;
  sourcesUsesDifferenceUsd: number;
}

export interface SponsorReturnsResult {
  annualSponsorCashFlowsUsd: number[];
  leveredSponsorCashIrr: IrrResult;
  projectUnleveredCashIrrBeforeTaxAttributes: IrrResult;
  simplifiedSponsorAfterTaxIrr?: IrrResult;
  sponsorNpvUsd?: number;
  projectNpvUsd?: number;
}

export interface DownsideCashSweepResult {
  downsideFullRepayment: boolean;
  downsideRepaymentYear: number | null;
  downsideUnrepaidBalanceUsd: number;
  interestShortfallYears: number[];
}

export interface DownsideResult {
  generationMwh: number[];
  revenueUsd: number[];
  cfadsUsd: number[];
  dscr: Array<number | null>;
  minimumDscr: number | null;
  minimumDscrYear: number | null;
  cashSweep: DownsideCashSweepResult;
}

export interface ReconciliationResult {
  sourcesUsesDifferenceUsd: number;
  sourcesUsesReconciled: boolean;
  debtReconciliationDifferenceUsd: number;
  debtReconciled: boolean;
  finalDebtBalanceUsd: number;
}

export interface ProjectFinanceMetadata {
  calculationEngineVersion: string;
  analysisType: typeof ANALYSIS_TYPE;
  underwritingPolicyId?: string;
  underwritingPolicyVersion?: string;
}

export interface ProjectFinanceResult {
  metadata: ProjectFinanceMetadata;
  inputSnapshot: ProjectFinanceInputs;
  annualProjectCashflows: AnnualOperatingRow[];
  annualDebtSchedule: AnnualDebtScheduleRow[];
  taxCreditResult: TaxCreditResult;
  debtSizing: DebtSizingResult;
  financingSummary: FinancingSummary;
  capitalStack: CapitalStackResult;
  sponsorReturns: SponsorReturnsResult;
  downsideResults: DownsideResult | null;
  warnings: CalculationWarning[];
  reconciliation: ReconciliationResult;
  formulaTrace: FormulaTrace[];
  yearOneCfadsUsd: number;
  operatingForecast: AnnualOperatingRow[];
  taxCredit: TaxCreditResult;
}

export interface SensitivityPoint {
  inputValue: number;
  permanentDebtUsd: number;
  debtToCapex: number;
  sponsorEquityUsd: number;
  minimumDscr: number | null;
  sponsorCashIrr: number | null;
  bindingConstraint: DebtBindingConstraint;
}

function cloneInput(input: ProjectFinanceInputs): ProjectFinanceInputs {
  return {
    ...input,
    annualGenerationOverrideMwh: input.annualGenerationOverrideMwh
      ? [...input.annualGenerationOverrideMwh]
      : undefined,
    explicitDownsideGenerationMwh: input.explicitDownsideGenerationMwh
      ? [...input.explicitDownsideGenerationMwh]
      : undefined,
    taxModule: input.taxModule ? { ...input.taxModule } : undefined,
  };
}

function fail(code: ValidationErrorCode, message: string): never {
  throw new ProjectFinanceValidationError(code, message);
}

function requireFinite(code: ValidationErrorCode, name: string, value: number): void {
  if (!Number.isFinite(value)) fail(code, `${name} must be a finite number`);
}

function requireRange(
  code: ValidationErrorCode,
  name: string,
  value: number,
  min: number,
  max: number,
  minInclusive = true,
  maxInclusive = true,
): void {
  requireFinite(code, name, value);
  const below = minInclusive ? value < min : value <= min;
  const above = maxInclusive ? value > max : value >= max;
  if (below || above) fail(code, `${name} is outside the permitted mathematical range`);
}

function effectiveCapex(input: ProjectFinanceInputs): number {
  if (input.capexIncludesContingency !== false) return input.totalProjectCapexUsd;
  return input.totalProjectCapexUsd * (1 + (input.contingencyRate ?? 0));
}

export function validateProjectFinanceInputs(input: ProjectFinanceInputs): void {
  requireRange("INVALID_CAPACITY", "capacityMwAc", input.capacityMwAc, 0, Number.MAX_VALUE, false);
  requireRange("INVALID_CAPACITY_FACTOR", "p50CapacityFactor", input.p50CapacityFactor, 0, 1, false, true);
  requireRange("INVALID_DEGRADATION", "annualDegradationRate", input.annualDegradationRate, 0, 1, true, false);
  requireRange("INVALID_PROJECT_LIFE", "projectLifeYears", input.projectLifeYears, 1, 200);
  requireRange("INVALID_PPA_TERM", "ppaTermYears", input.ppaTermYears, 1, 200);
  requireRange("INVALID_PPA_PRICE", "yearOnePpaPricePerMwh", input.yearOnePpaPricePerMwh, 0, Number.MAX_VALUE, true);
  requireRange("INVALID_ESCALATION", "annualPpaEscalationRate", input.annualPpaEscalationRate, -1, 10, false);
  requireRange("INVALID_CAPEX", "totalProjectCapexUsd", input.totalProjectCapexUsd, 0, Number.MAX_VALUE, false);
  requireRange("INVALID_OPEX", "yearOneOpexUsd", input.yearOneOpexUsd, 0, Number.MAX_VALUE, true);
  requireRange("INVALID_ESCALATION", "annualOpexEscalationRate", input.annualOpexEscalationRate, -1, 10, false);
  requireRange("INVALID_ITC_RATE", "itcRate", input.itcRate, 0, 1);
  requireRange("INVALID_ITC_BASIS", "itcEligibleBasisPercent", input.itcEligibleBasisPercent, 0, 1);
  requireFinite("INVALID_TRANSFER_PRICE", "itcTransferPrice", input.itcTransferPrice);
  if (input.itcTransferPrice < 0) fail("INVALID_TRANSFER_PRICE", "itcTransferPrice must be non-negative");
  requireFinite("INVALID_INTEREST_RATE", "debtInterestRate", input.debtInterestRate);
  if (input.debtInterestRate <= -1) fail("INVALID_INTEREST_RATE", "debtInterestRate must be greater than -1");
  requireRange("INVALID_AMORTIZATION", "debtAmortizationYears", input.debtAmortizationYears, 1, 200);
  requireRange("INVALID_DSCR", "targetP50Dscr", input.targetP50Dscr, 0, Number.MAX_VALUE, false);
  requireRange("INVALID_LTC", "maximumLtc", input.maximumLtc, 0, 1);
  requireRange("INVALID_TRANSACTION_COST", "upfrontFeePercent", input.upfrontFeePercent, 0, 10);
  requireRange("INVALID_RESERVE", "dsraMonths", input.dsraMonths, 0, 120);

  if (!Number.isInteger(input.projectLifeYears)) fail("INVALID_PROJECT_LIFE", "projectLifeYears must be an integer");
  if (!Number.isInteger(input.ppaTermYears)) fail("INVALID_PPA_TERM", "ppaTermYears must be an integer");
  if (!Number.isInteger(input.debtAmortizationYears)) fail("INVALID_AMORTIZATION", "debtAmortizationYears must be an integer");
  if (input.debtAmortizationYears > input.projectLifeYears) {
    fail("INVALID_AMORTIZATION", "debtAmortizationYears cannot exceed projectLifeYears");
  }

  const maturity = input.debtMaturityYears ?? input.debtAmortizationYears;
  requireRange("INVALID_MATURITY", "debtMaturityYears", maturity, 1, input.debtAmortizationYears);
  if (!Number.isInteger(maturity)) fail("INVALID_MATURITY", "debtMaturityYears must be an integer");

  for (const [name, value] of [
    ["closingCostsUsd", input.closingCostsUsd ?? 0],
    ["otherFinancingUsesUsd", input.otherFinancingUsesUsd ?? 0],
    ["otherPermanentSourcesUsd", input.otherPermanentSourcesUsd ?? 0],
    ["itcTransferTransactionCostsUsd", input.itcTransferTransactionCostsUsd ?? 0],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      fail("INVALID_TRANSACTION_COST", `${name} must be a non-negative finite number`);
    }
  }

  if (input.annualGenerationOverrideMwh) {
    if (input.annualGenerationOverrideMwh.length !== input.projectLifeYears) {
      fail("INVALID_GENERATION_OVERRIDE", "annualGenerationOverrideMwh must contain exactly projectLifeYears entries");
    }
    if (input.annualGenerationOverrideMwh.some((value) => !Number.isFinite(value) || value < 0)) {
      fail("INVALID_GENERATION_OVERRIDE", "annualGenerationOverrideMwh cannot contain negative or non-finite values");
    }
  }

  if (input.explicitDownsideGenerationMwh) {
    if (input.explicitDownsideGenerationMwh.length !== input.projectLifeYears) {
      fail("INVALID_GENERATION_OVERRIDE", "explicitDownsideGenerationMwh must contain exactly projectLifeYears entries");
    }
    if (input.explicitDownsideGenerationMwh.some((value) => !Number.isFinite(value) || value < 0)) {
      fail("INVALID_GENERATION_OVERRIDE", "explicitDownsideGenerationMwh cannot contain negative or non-finite values");
    }
  }

  if (input.downsideGenerationMultiplier !== undefined) {
    requireRange("INVALID_CAPACITY_FACTOR", "downsideGenerationMultiplier", input.downsideGenerationMultiplier, 0, 1);
  }

  if (input.capexIncludesContingency === false) {
    requireRange("INVALID_CAPEX", "contingencyRate", input.contingencyRate ?? 0, 0, 10);
  }

  if (input.taxModule?.enabled) {
    requireRange("INVALID_ITC_BASIS", "bonusDepreciationPct", input.taxModule.bonusDepreciationPct, 0, 1);
    requireRange("INVALID_ITC_BASIS", "federalTaxRate", input.taxModule.federalTaxRate, 0, 1);
    requireRange("INVALID_ITC_BASIS", "sponsorTaxAppetitePct", input.taxModule.sponsorTaxAppetitePct, 0, 1);
  }
}

export function buildOperatingForecast(input: ProjectFinanceInputs): AnnualOperatingRow[] {
  validateProjectFinanceInputs(input);
  const yearOneGenerationMwh = input.capacityMwAc * HOURS_PER_YEAR * input.p50CapacityFactor;

  return Array.from({ length: input.projectLifeYears }, (_, index) => {
    const year = index + 1;
    const generationMwh = input.annualGenerationOverrideMwh
      ? input.annualGenerationOverrideMwh[index]
      : yearOneGenerationMwh * Math.pow(1 - input.annualDegradationRate, index);
    const ppaPricePerMwh = input.yearOnePpaPricePerMwh * Math.pow(1 + input.annualPpaEscalationRate, index);
    const revenueUsd = year <= input.ppaTermYears ? generationMwh * ppaPricePerMwh : 0;
    const opexUsd = input.yearOneOpexUsd * Math.pow(1 + input.annualOpexEscalationRate, index);
    const cfadsUsd = revenueUsd - opexUsd;
    const allowableDebtServiceUsd = cfadsUsd / input.targetP50Dscr;

    return { year, generationMwh, ppaPricePerMwh, revenueUsd, opexUsd, cfadsUsd, allowableDebtServiceUsd };
  });
}

export function calculateTransferredItc(input: ProjectFinanceInputs): TaxCreditResult {
  validateProjectFinanceInputs(input);
  const capex = effectiveCapex(input);
  const transactionCostsUsd = input.itcTransferTransactionCostsUsd ?? 0;
  const eligibleBasisUsd = capex * input.itcEligibleBasisPercent;
  const itcFaceValueUsd = eligibleBasisUsd * input.itcRate;
  const grossTransferProceedsUsd = itcFaceValueUsd * input.itcTransferPrice;
  const netTransferProceedsUsd = Math.max(0, grossTransferProceedsUsd - transactionCostsUsd);

  const result: TaxCreditResult = {
    eligibleBasisUsd,
    itcRate: input.itcRate,
    itcFaceValueUsd,
    transferPrice: input.itcTransferPrice,
    grossTransferProceedsUsd,
    transactionCostsUsd,
    netTransferProceedsUsd,
  };

  if (input.taxModule?.enabled) {
    const depreciableBasisUsd = eligibleBasisUsd - 0.5 * itcFaceValueUsd;
    const bonusDepreciationUsd = depreciableBasisUsd * input.taxModule.bonusDepreciationPct;
    const immediateTaxShieldUsd =
      bonusDepreciationUsd * input.taxModule.federalTaxRate * input.taxModule.sponsorTaxAppetitePct;
    result.depreciableBasisUsd = depreciableBasisUsd;
    result.bonusDepreciationUsd = bonusDepreciationUsd;
    result.immediateTaxShieldUsd = immediateTaxShieldUsd;
  }

  return result;
}

function maximumAllowableDebtService(forecast: AnnualOperatingRow[], years: number): number[] {
  return forecast.slice(0, years).map((row) => row.allowableDebtServiceUsd);
}

function debtPv(debtService: readonly number[], rate: number): number {
  return debtService.reduce((sum, payment, index) => sum + payment / Math.pow(1 + rate, index + 1), 0);
}

interface SculptCheck {
  feasible: boolean;
  finalBalanceUsd: number;
  negativeAmortizationYear: number | null;
}

function checkDebtAgainstMaximumService(openingDebtUsd: number, rate: number, maxDebtService: readonly number[]): SculptCheck {
  let balance = openingDebtUsd;
  let negativeAmortizationYear: number | null = null;

  for (let index = 0; index < maxDebtService.length && balance > MONEY_TOLERANCE_USD; index += 1) {
    const interest = balance * rate;
    const service = Math.max(0, maxDebtService[index] ?? 0);
    if (service + 1e-8 < interest) {
      negativeAmortizationYear = index + 1;
      return { feasible: false, finalBalanceUsd: balance, negativeAmortizationYear };
    }
    const principal = Math.min(balance, Math.max(0, service - interest));
    balance -= principal;
  }

  return {
    feasible: balance <= MONEY_TOLERANCE_USD,
    finalBalanceUsd: balance,
    negativeAmortizationYear,
  };
}

function solveNonNegativeAmortizingDebt(rawPvUsd: number, rate: number, maxDebtService: readonly number[]): number {
  const direct = checkDebtAgainstMaximumService(rawPvUsd, rate, maxDebtService);
  if (direct.feasible) return rawPvUsd;

  let low = 0;
  let high = rawPvUsd;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const mid = (low + high) / 2;
    const check = checkDebtAgainstMaximumService(mid, rate, maxDebtService);
    if (check.feasible) low = mid;
    else high = mid;
  }
  return low;
}

export function calculateDebtSizing(
  input: ProjectFinanceInputs,
  forecast: AnnualOperatingRow[] = buildOperatingForecast(input),
): DebtSizingResult {
  validateProjectFinanceInputs(input);
  const sizingYears = Math.min(input.debtAmortizationYears, input.projectLifeYears, forecast.length);
  const maxService = maximumAllowableDebtService(forecast, sizingYears);

  if (maxService.every((value) => value <= 0)) {
    return {
      dscrSizedDebtUsd: 0,
      rawPvDebtCapacityUsd: 0,
      ltcMaximumDebtUsd: effectiveCapex(input) * input.maximumLtc,
      permanentDebtUsd: 0,
      bindingConstraint: "ZERO_CFADS",
      negativeAmortizationLimited: false,
    };
  }

  const nonNegativeService = maxService.map((value) => Math.max(0, value));
  const rawPvDebtCapacityUsd = debtPv(nonNegativeService, input.debtInterestRate);
  const dscrSizedDebtUsd = solveNonNegativeAmortizingDebt(
    rawPvDebtCapacityUsd,
    input.debtInterestRate,
    nonNegativeService,
  );
  const negativeAmortizationLimited = dscrSizedDebtUsd + CONSTRAINT_TOLERANCE_USD < rawPvDebtCapacityUsd;
  const ltcMaximumDebtUsd = effectiveCapex(input) * input.maximumLtc;
  const permanentDebtUsd = Math.max(0, Math.min(dscrSizedDebtUsd, ltcMaximumDebtUsd));

  let bindingConstraint: DebtBindingConstraint;
  if (permanentDebtUsd <= CONSTRAINT_TOLERANCE_USD) bindingConstraint = "ZERO_CFADS";
  else if (negativeAmortizationLimited && dscrSizedDebtUsd <= ltcMaximumDebtUsd + CONSTRAINT_TOLERANCE_USD) {
    bindingConstraint = "NEGATIVE_AMORTIZATION";
  } else if (dscrSizedDebtUsd < ltcMaximumDebtUsd - CONSTRAINT_TOLERANCE_USD) bindingConstraint = "DSCR";
  else if (ltcMaximumDebtUsd < dscrSizedDebtUsd - CONSTRAINT_TOLERANCE_USD) bindingConstraint = "LTC";
  else bindingConstraint = "OTHER";

  return {
    dscrSizedDebtUsd,
    rawPvDebtCapacityUsd,
    ltcMaximumDebtUsd,
    permanentDebtUsd,
    bindingConstraint,
    negativeAmortizationLimited,
  };
}

export function buildDebtSchedule(
  input: ProjectFinanceInputs,
  forecast: AnnualOperatingRow[],
  debtSizing: DebtSizingResult,
): AnnualDebtScheduleRow[] {
  const years = input.debtAmortizationYears;
  const maxService = maximumAllowableDebtService(forecast, years).map((value) => Math.max(0, value));
  const scale = debtSizing.dscrSizedDebtUsd > 0
    ? debtSizing.permanentDebtUsd / debtSizing.dscrSizedDebtUsd
    : 0;
  let balance = debtSizing.permanentDebtUsd;
  const rows: AnnualDebtScheduleRow[] = [];

  for (let index = 0; index < years; index += 1) {
    const year = index + 1;
    const openingBalanceUsd = balance;
    const interestUsd = openingBalanceUsd * input.debtInterestRate;
    const maximumService = maxService[index] ?? 0;
    const scheduledService = debtSizing.bindingConstraint === "NEGATIVE_AMORTIZATION"
      ? maximumService
      : maximumService * scale;
    const serviceAvailable = Math.max(0, scheduledService);
    const principalCapacity = Math.max(0, serviceAvailable - interestUsd);
    const principalUsd = Math.min(openingBalanceUsd, principalCapacity);
    const debtServiceUsd = openingBalanceUsd <= MONEY_TOLERANCE_USD ? 0 : interestUsd + principalUsd;
    balance = Math.max(0, openingBalanceUsd - principalUsd);
    if (balance <= MONEY_TOLERANCE_USD) balance = 0;
    const cfads = forecast[index]?.cfadsUsd ?? 0;
    const dscr = debtServiceUsd > 0 ? cfads / debtServiceUsd : null;

    rows.push({
      year,
      openingBalanceUsd,
      interestUsd: debtServiceUsd > 0 ? interestUsd : 0,
      principalUsd,
      debtServiceUsd,
      endingBalanceUsd: balance,
      dscr,
      downsideCfadsUsd: null,
      downsideDscr: null,
    });
  }

  return rows;
}

function minDscr(rows: readonly AnnualDebtScheduleRow[]): { value: number | null; year: number | null } {
  const withDebt = rows.filter((row) => row.debtServiceUsd > 0 && row.dscr !== null);
  if (withDebt.length === 0) return { value: null, year: null };
  let min = withDebt[0];
  for (const row of withDebt.slice(1)) {
    if ((row.dscr ?? Infinity) < (min.dscr ?? Infinity)) min = row;
  }
  return { value: min.dscr, year: min.year };
}

function calculateDsra(input: ProjectFinanceInputs, debtSchedule: readonly AnnualDebtScheduleRow[]): number {
  if (input.dsraMonths <= 0 || debtSchedule.length === 0) return 0;
  const method = input.dsraReferenceMethod ?? "YEAR_ONE";
  let referenceAnnualDebtServiceUsd = debtSchedule[0]?.debtServiceUsd ?? 0;
  if (method === "MAX_ANNUAL_DEBT_SERVICE") {
    referenceAnnualDebtServiceUsd = Math.max(0, ...debtSchedule.map((row) => row.debtServiceUsd));
  } else if (method === "CUSTOM") {
    referenceAnnualDebtServiceUsd = input.customDsraReferenceAnnualDebtServiceUsd ?? 0;
  }
  return referenceAnnualDebtServiceUsd * (input.dsraMonths / 12);
}

function calculateCapitalStack(
  input: ProjectFinanceInputs,
  debtSizing: DebtSizingResult,
  taxCredit: TaxCreditResult,
  lenderFeeUsd: number,
  dsraUsd: number,
  warnings: CalculationWarning[],
): CapitalStackResult {
  const capex = effectiveCapex(input);
  const totalClosingUsesUsd =
    capex +
    (input.closingCostsUsd ?? 0) +
    lenderFeeUsd +
    dsraUsd +
    (input.otherFinancingUsesUsd ?? 0);
  const otherPermanentSourcesUsd = input.otherPermanentSourcesUsd ?? 0;
  const preEquitySources = debtSizing.permanentDebtUsd + taxCredit.netTransferProceedsUsd + otherPermanentSourcesUsd;
  const rawEquity = totalClosingUsesUsd - preEquitySources;
  const sponsorEquityUsd = Math.max(0, rawEquity);
  if (rawEquity < -MONEY_TOLERANCE_USD) {
    warnings.push({ code: "SOURCES_EXCEED_USES", message: "Permanent non-sponsor sources exceed total closing uses." });
  }
  const totalSources = preEquitySources + sponsorEquityUsd;
  const sourcesUsesDifferenceUsd = totalSources - totalClosingUsesUsd;
  const pct = (value: number) => totalClosingUsesUsd > 0 ? value / totalClosingUsesUsd : 0;

  return {
    totalClosingUsesUsd,
    permanentDebtUsd: debtSizing.permanentDebtUsd,
    netItcProceedsUsd: taxCredit.netTransferProceedsUsd,
    sponsorEquityUsd,
    otherPermanentSourcesUsd,
    permanentDebtPctTotalUses: pct(debtSizing.permanentDebtUsd),
    itcProceedsPctTotalUses: pct(taxCredit.netTransferProceedsUsd),
    sponsorEquityPctTotalUses: pct(sponsorEquityUsd),
    otherSourcesPctTotalUses: pct(otherPermanentSourcesUsd),
    debtToCapex: capex > 0 ? debtSizing.permanentDebtUsd / capex : 0,
    sourcesUsesDifferenceUsd,
  };
}

export function npv(cashFlows: readonly number[], discountRate: number): number {
  return cashFlows.reduce((sum, value, index) => sum + value / Math.pow(1 + discountRate, index), 0);
}

function signChanges(cashFlows: readonly number[]): number {
  const nonZero = cashFlows.filter((value) => Math.abs(value) > 1e-12);
  let changes = 0;
  for (let index = 1; index < nonZero.length; index += 1) {
    if (Math.sign(nonZero[index]) !== Math.sign(nonZero[index - 1])) changes += 1;
  }
  return changes;
}

export function calculateIrr(cashFlows: readonly number[]): IrrResult {
  const hasNegative = cashFlows.some((value) => value < 0);
  const hasPositive = cashFlows.some((value) => value > 0);
  if (!hasNegative || !hasPositive) return { irr: null, status: "NO_SIGN_CHANGE" };

  const changes = signChanges(cashFlows);
  const multipleRisk = changes > 1;
  const f = (rate: number) => npv(cashFlows, rate);
  const scanPoints: number[] = [-0.9999];
  for (let rate = -0.95; rate <= 1; rate += 0.025) scanPoints.push(rate);
  for (let rate = 1.1; rate <= 10; rate += 0.1) scanPoints.push(rate);

  const brackets: Array<[number, number]> = [];
  let previousRate = scanPoints[0];
  let previousValue = f(previousRate);
  for (const rate of scanPoints.slice(1)) {
    const value = f(rate);
    if (Number.isFinite(previousValue) && Number.isFinite(value)) {
      if (previousValue === 0) brackets.push([previousRate, previousRate]);
      else if (Math.sign(previousValue) !== Math.sign(value)) brackets.push([previousRate, rate]);
    }
    previousRate = rate;
    previousValue = value;
  }
  if (brackets.length === 0) return { irr: null, status: "SOLVER_FAILED" };

  let [low, high] = brackets[0];
  if (low !== high) {
    let lowValue = f(low);
    for (let iteration = 0; iteration < 200; iteration += 1) {
      const mid = (low + high) / 2;
      const midValue = f(mid);
      if (Math.abs(midValue) < 1e-7) {
        low = high = mid;
        break;
      }
      if (Math.sign(lowValue) === Math.sign(midValue)) {
        low = mid;
        lowValue = midValue;
      } else {
        high = mid;
      }
    }
  }
  const irr = (low + high) / 2;
  if (multipleRisk || brackets.length > 1) {
    return {
      irr,
      status: "MULTIPLE_ROOT_RISK",
      warning: "Cash-flow pattern may admit more than one IRR. Inspect NPV directly.",
    };
  }
  return { irr, status: "VALID" };
}

function buildDownside(
  input: ProjectFinanceInputs,
  forecast: AnnualOperatingRow[],
  debtSchedule: AnnualDebtScheduleRow[],
  permanentDebtUsd: number,
  warnings: CalculationWarning[],
): DownsideResult | null {
  if (!input.explicitDownsideGenerationMwh && input.downsideGenerationMultiplier === undefined) return null;
  const generation = input.explicitDownsideGenerationMwh
    ? [...input.explicitDownsideGenerationMwh]
    : forecast.map((row) => row.generationMwh * (input.downsideGenerationMultiplier ?? 1));
  if (!input.explicitDownsideGenerationMwh) {
    warnings.push({
      code: "ILLUSTRATIVE_DOWNSIDE",
      message: "Downside production is an illustrative multiplier of P50, not an independent-engineer P90 estimate.",
    });
  }

  const revenue = generation.map((mwh, index) => {
    const row = forecast[index];
    return row && row.year <= input.ppaTermYears ? mwh * row.ppaPricePerMwh : 0;
  });
  const cfads = revenue.map((value, index) => value - (forecast[index]?.opexUsd ?? 0));
  const dscr = cfads.map((value, index) => {
    const service = debtSchedule[index]?.debtServiceUsd ?? 0;
    return service > 0 ? value / service : null;
  });
  const dscrPoints = dscr.map((value, index) => ({ value, year: index + 1 })).filter((item) => item.value !== null);
  let minimumDscr: number | null = null;
  let minimumDscrYear: number | null = null;
  for (const item of dscrPoints) {
    if (minimumDscr === null || (item.value as number) < minimumDscr) {
      minimumDscr = item.value as number;
      minimumDscrYear = item.year;
    }
  }

  let balance = permanentDebtUsd;
  let repaymentYear: number | null = balance <= MONEY_TOLERANCE_USD ? 0 : null;
  const shortfallYears: number[] = [];
  for (let index = 0; index < input.projectLifeYears && balance > MONEY_TOLERANCE_USD; index += 1) {
    const interest = balance * input.debtInterestRate;
    const cashAvailable = Math.max(0, cfads[index] ?? 0);
    if (cashAvailable + 1e-8 < interest) {
      shortfallYears.push(index + 1);
      warnings.push({ code: "INTEREST_SHORTFALL", message: "Downside CFADS is insufficient to pay annual interest under the cash-sweep test.", year: index + 1 });
      continue;
    }
    const principal = Math.min(balance, Math.max(0, cashAvailable - interest));
    balance -= principal;
    if (balance <= MONEY_TOLERANCE_USD) {
      balance = 0;
      repaymentYear = index + 1;
    }
  }

  for (let index = 0; index < debtSchedule.length; index += 1) {
    debtSchedule[index].downsideCfadsUsd = cfads[index] ?? null;
    debtSchedule[index].downsideDscr = dscr[index] ?? null;
  }

  return {
    generationMwh: generation,
    revenueUsd: revenue,
    cfadsUsd: cfads,
    dscr,
    minimumDscr,
    minimumDscrYear,
    cashSweep: {
      downsideFullRepayment: balance <= MONEY_TOLERANCE_USD,
      downsideRepaymentYear: repaymentYear,
      downsideUnrepaidBalanceUsd: balance,
      interestShortfallYears: shortfallYears,
    },
  };
}

function createFormulaTrace(
  input: ProjectFinanceInputs,
  forecast: AnnualOperatingRow[],
  debtSizing: DebtSizingResult,
  financing: FinancingSummary,
  tax: TaxCreditResult,
  stack: CapitalStackResult,
  sponsorIrr: IrrResult,
): FormulaTrace[] {
  const y1 = forecast[0];
  return [
    { metric: "year_1_generation_mwh", value: y1?.generationMwh ?? null, formulaId: FORMULA_IDS.generationYear1, dependencies: ["capacityMwAc", "p50CapacityFactor"] },
    { metric: "year_1_revenue_usd", value: y1?.revenueUsd ?? null, formulaId: FORMULA_IDS.revenueContracted, dependencies: ["generation", "ppa_price"] },
    { metric: "year_1_cfads_usd", value: y1?.cfadsUsd ?? null, formulaId: FORMULA_IDS.cfads, dependencies: ["revenue", "opex"] },
    { metric: "dscr_sized_debt_usd", value: debtSizing.dscrSizedDebtUsd, formulaId: FORMULA_IDS.dscrDebtCapacity, dependencies: ["cfads", "targetP50Dscr", "debtInterestRate", "debtAmortizationYears"] },
    { metric: "ltc_debt_limit_usd", value: debtSizing.ltcMaximumDebtUsd, formulaId: FORMULA_IDS.ltcLimit, dependencies: ["totalProjectCapexUsd", "maximumLtc"] },
    { metric: "permanent_debt_usd", value: debtSizing.permanentDebtUsd, formulaId: FORMULA_IDS.permanentDebt, dependencies: ["dscr_sized_debt", "ltc_limit"] },
    { metric: "dsra_required_usd", value: financing.dsraRequiredUsd, formulaId: FORMULA_IDS.dsra, dependencies: ["debt_service", "dsraMonths"] },
    { metric: "lender_upfront_fee_usd", value: financing.lenderUpfrontFeeUsd, formulaId: FORMULA_IDS.lenderFee, dependencies: ["permanent_debt", "upfrontFeePercent"] },
    { metric: "itc_eligible_basis_usd", value: tax.eligibleBasisUsd, formulaId: FORMULA_IDS.itcEligibleBasis, dependencies: ["project_capex", "itcEligibleBasisPercent"] },
    { metric: "itc_face_value_usd", value: tax.itcFaceValueUsd, formulaId: FORMULA_IDS.itcFaceValue, dependencies: ["eligible_basis", "itcRate"] },
    { metric: "itc_transfer_proceeds_usd", value: tax.netTransferProceedsUsd, formulaId: FORMULA_IDS.itcTransferProceeds, dependencies: ["itc_face_value", "itcTransferPrice", "itcTransferTransactionCostsUsd"] },
    { metric: "sponsor_equity_usd", value: stack.sponsorEquityUsd, formulaId: FORMULA_IDS.sponsorEquity, dependencies: ["total_closing_uses", "permanent_debt", "net_itc_proceeds", "other_sources"] },
    { metric: "levered_sponsor_cash_irr", value: sponsorIrr.irr, formulaId: FORMULA_IDS.sponsorCashIrr, dependencies: ["sponsor_equity", "annual_sponsor_cash_flows"] },
  ];
}

export function runProjectFinanceV0(input: ProjectFinanceInputs): ProjectFinanceResult {
  validateProjectFinanceInputs(input);
  const inputSnapshot = cloneInput(input);
  const warnings: CalculationWarning[] = [];
  const operatingForecast = buildOperatingForecast(inputSnapshot);

  for (const row of operatingForecast) {
    if (row.cfadsUsd < 0) warnings.push({ code: "NEGATIVE_CFADS", message: "Project CFADS is negative in this operating year.", year: row.year });
  }
  if (inputSnapshot.debtAmortizationYears > inputSnapshot.ppaTermYears) {
    warnings.push({ code: "PPA_TERM_WARNING", message: "Debt amortization extends beyond the contracted PPA term." });
  }
  if (inputSnapshot.ppaTermYears < inputSnapshot.projectLifeYears) {
    warnings.push({ code: "UNCONTRACTED_TAIL", message: "Revenue after PPA expiration is set to zero; no merchant tail or terminal value is modeled." });
  }

  const taxCreditResult = calculateTransferredItc(inputSnapshot);
  if (taxCreditResult.grossTransferProceedsUsd < taxCreditResult.transactionCostsUsd) {
    warnings.push({ code: "ITC_PROCEEDS_FLOORED_AT_ZERO", message: "ITC transaction costs exceed gross transfer proceeds; net proceeds were floored at zero." });
  }

  const debtSizing = calculateDebtSizing(inputSnapshot, operatingForecast);
  if (debtSizing.negativeAmortizationLimited) {
    warnings.push({ code: "NEGATIVE_AMORTIZATION_REQUIRED", message: "Raw PV debt capacity would require negative amortization; DSCR-sized debt was reduced." });
  }
  const annualDebtSchedule = buildDebtSchedule(inputSnapshot, operatingForecast, debtSizing);
  const debtMin = minDscr(annualDebtSchedule);
  const maturity = inputSnapshot.debtMaturityYears ?? inputSnapshot.debtAmortizationYears;
  const balloonBalanceAtMaturityUsd = annualDebtSchedule[maturity - 1]?.endingBalanceUsd ?? 0;
  const lenderUpfrontFeeUsd = debtSizing.permanentDebtUsd * inputSnapshot.upfrontFeePercent;
  const dsraRequiredUsd = calculateDsra(inputSnapshot, annualDebtSchedule);

  const financingSummary: FinancingSummary = {
    dscrSizedDebtUsd: debtSizing.dscrSizedDebtUsd,
    ltcDebtLimitUsd: debtSizing.ltcMaximumDebtUsd,
    permanentDebtUsd: debtSizing.permanentDebtUsd,
    bindingConstraint: debtSizing.bindingConstraint,
    debtToCapex: debtSizing.permanentDebtUsd / effectiveCapex(inputSnapshot),
    minimumDscr: debtMin.value,
    minimumDscrYear: debtMin.year,
    balloonBalanceAtMaturityUsd,
    lenderUpfrontFeeUsd,
    dsraRequiredUsd,
  };

  const capitalStack = calculateCapitalStack(
    inputSnapshot,
    debtSizing,
    taxCreditResult,
    lenderUpfrontFeeUsd,
    dsraRequiredUsd,
    warnings,
  );

  const annualSponsorOperatingCash = operatingForecast.map((row, index) => row.cfadsUsd - (annualDebtSchedule[index]?.debtServiceUsd ?? 0));
  const sponsorCashFlows = [-capitalStack.sponsorEquityUsd, ...annualSponsorOperatingCash];
  const sponsorCashIrr = calculateIrr(sponsorCashFlows);
  if (sponsorCashIrr.status === "MULTIPLE_ROOT_RISK") {
    warnings.push({ code: "MULTIPLE_IRR_ROOT_RISK", message: sponsorCashIrr.warning ?? "Sponsor cash flows have multiple IRR root risk." });
  }
  const projectUnleveredCashFlows = [-effectiveCapex(inputSnapshot), ...operatingForecast.map((row) => row.cfadsUsd)];
  const projectCashIrr = calculateIrr(projectUnleveredCashFlows);
  const sponsorReturns: SponsorReturnsResult = {
    annualSponsorCashFlowsUsd: sponsorCashFlows,
    leveredSponsorCashIrr: sponsorCashIrr,
    projectUnleveredCashIrrBeforeTaxAttributes: projectCashIrr,
  };

  if (taxCreditResult.immediateTaxShieldUsd !== undefined) {
    const afterTaxFlows = [...sponsorCashFlows];
    afterTaxFlows[1] = (afterTaxFlows[1] ?? 0) + taxCreditResult.immediateTaxShieldUsd;
    sponsorReturns.simplifiedSponsorAfterTaxIrr = calculateIrr(afterTaxFlows);
  }
  if (inputSnapshot.discountRate !== undefined) {
    sponsorReturns.sponsorNpvUsd = npv(sponsorCashFlows, inputSnapshot.discountRate);
    sponsorReturns.projectNpvUsd = npv(projectUnleveredCashFlows, inputSnapshot.discountRate);
  }

  const downsideResults = buildDownside(
    inputSnapshot,
    operatingForecast,
    annualDebtSchedule,
    debtSizing.permanentDebtUsd,
    warnings,
  );

  const finalDebtBalanceUsd = annualDebtSchedule.at(-1)?.endingBalanceUsd ?? 0;
  const principalPaid = annualDebtSchedule.reduce((sum, row) => sum + row.principalUsd, 0);
  const debtReconciliationDifferenceUsd = debtSizing.permanentDebtUsd - principalPaid - finalDebtBalanceUsd;
  const reconciliation: ReconciliationResult = {
    sourcesUsesDifferenceUsd: capitalStack.sourcesUsesDifferenceUsd,
    sourcesUsesReconciled: Math.abs(capitalStack.sourcesUsesDifferenceUsd) <= MONEY_TOLERANCE_USD,
    debtReconciliationDifferenceUsd,
    debtReconciled: Math.abs(debtReconciliationDifferenceUsd) <= MONEY_TOLERANCE_USD && finalDebtBalanceUsd <= MONEY_TOLERANCE_USD,
    finalDebtBalanceUsd,
  };
  if (!reconciliation.debtReconciled) {
    warnings.push({ code: "DEBT_SCULPTING_RECONCILIATION_ERROR", message: "Debt schedule did not fully reconcile within the $1 tolerance." });
  }

  const formulaTrace = createFormulaTrace(
    inputSnapshot,
    operatingForecast,
    debtSizing,
    financingSummary,
    taxCreditResult,
    capitalStack,
    sponsorCashIrr,
  );

  return {
    metadata: {
      calculationEngineVersion: CALCULATION_ENGINE_VERSION,
      analysisType: ANALYSIS_TYPE,
      underwritingPolicyId: inputSnapshot.underwritingPolicyId,
      underwritingPolicyVersion: inputSnapshot.underwritingPolicyVersion,
    },
    inputSnapshot,
    annualProjectCashflows: operatingForecast,
    annualDebtSchedule,
    taxCreditResult,
    debtSizing,
    financingSummary,
    capitalStack,
    sponsorReturns,
    downsideResults,
    warnings,
    reconciliation,
    formulaTrace,
    yearOneCfadsUsd: operatingForecast[0]?.cfadsUsd ?? 0,
    operatingForecast,
    taxCredit: taxCreditResult,
  };
}

export type SensitivityKind = "PPA_PRICE" | "INTEREST_RATE" | "CAPEX" | "CAPACITY_FACTOR" | "ITC_RATE";

export function runSensitivity(
  baseInput: ProjectFinanceInputs,
  kind: SensitivityKind,
  values: readonly number[],
): SensitivityPoint[] {
  return values.map((inputValue) => {
    const variant = cloneInput(baseInput);
    switch (kind) {
      case "PPA_PRICE":
        variant.yearOnePpaPricePerMwh = inputValue;
        break;
      case "INTEREST_RATE":
        variant.debtInterestRate = inputValue;
        break;
      case "CAPEX":
        variant.totalProjectCapexUsd = inputValue;
        break;
      case "CAPACITY_FACTOR":
        variant.p50CapacityFactor = inputValue;
        variant.annualGenerationOverrideMwh = undefined;
        break;
      case "ITC_RATE":
        variant.itcRate = inputValue;
        break;
    }
    const result = runProjectFinanceV0(variant);
    return {
      inputValue,
      permanentDebtUsd: result.financingSummary.permanentDebtUsd,
      debtToCapex: result.financingSummary.debtToCapex,
      sponsorEquityUsd: result.capitalStack.sponsorEquityUsd,
      minimumDscr: result.financingSummary.minimumDscr,
      sponsorCashIrr: result.sponsorReturns.leveredSponsorCashIrr.irr,
      bindingConstraint: result.financingSummary.bindingConstraint,
    };
  });
}
