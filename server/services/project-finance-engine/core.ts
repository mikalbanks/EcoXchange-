export type AssumptionSource =
  | "USER_FACT"
  | "DOCUMENT_FACT"
  | "ECOXCHANGE_ASSUMPTION"
  | "DERIVED";

export interface ProjectFinanceInputs {
  projectName: string;
  capacityMwAc: number;
  p50CapacityFactor: number;
  annualDegradationRate: number;
  projectLifeYears: number;
  ppaTermYears: number;
  yearOnePpaPricePerMwh: number;
  annualPpaEscalationRate: number;
  totalProjectCapexUsd: number;
  yearOneOpexUsd: number;
  annualOpexEscalationRate: number;
  itcRate: number;
  itcEligibleBasisPercent: number;
  itcTransferPrice: number;
  itcTransferTransactionCostsUsd?: number;
  debtInterestRate: number;
  debtAmortizationYears: number;
  targetP50Dscr: number;
  maximumLtc: number;
  upfrontFeePercent: number;
  dsraMonths: number;
}

export interface AnnualOperatingRow {
  year: number;
  generationMwh: number;
  ppaPricePerMwh: number;
  revenueUsd: number;
  opexUsd: number;
  cfadsUsd: number;
  allowableDebtServiceUsd: number;
}

export interface TaxCreditResult {
  eligibleBasisUsd: number;
  itcFaceValueUsd: number;
  grossTransferProceedsUsd: number;
  transactionCostsUsd: number;
  netTransferProceedsUsd: number;
}

export type DebtBindingConstraint = "DSCR" | "LTC" | "NONE";

export interface DebtSizingResult {
  dscrSizedDebtUsd: number;
  ltcMaximumDebtUsd: number;
  permanentDebtUsd: number;
  bindingConstraint: DebtBindingConstraint;
}

export interface ProjectFinanceResult {
  operatingForecast: AnnualOperatingRow[];
  yearOneCfadsUsd: number;
  taxCredit: TaxCreditResult;
  debtSizing: DebtSizingResult;
}

const HOURS_PER_YEAR = 8_760;

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function requirePositive(name: string, value: number): void {
  requireFinite(name, value);
  if (value <= 0) throw new Error(`${name} must be greater than zero`);
}

function requireRate(name: string, value: number, options?: { allowOne?: boolean }): void {
  requireFinite(name, value);
  const upperBoundAllowed = options?.allowOne ?? true;
  if (value < 0 || (upperBoundAllowed ? value > 1 : value >= 1)) {
    throw new Error(`${name} must be between 0 and ${upperBoundAllowed ? "1" : "less than 1"}`);
  }
}

export function validateProjectFinanceInputs(input: ProjectFinanceInputs): void {
  requirePositive("capacityMwAc", input.capacityMwAc);
  requireRate("p50CapacityFactor", input.p50CapacityFactor, { allowOne: false });
  requireRate("annualDegradationRate", input.annualDegradationRate, { allowOne: false });
  requirePositive("projectLifeYears", input.projectLifeYears);
  requirePositive("ppaTermYears", input.ppaTermYears);
  requirePositive("yearOnePpaPricePerMwh", input.yearOnePpaPricePerMwh);
  requireRate("annualPpaEscalationRate", input.annualPpaEscalationRate, { allowOne: false });
  requirePositive("totalProjectCapexUsd", input.totalProjectCapexUsd);
  requirePositive("yearOneOpexUsd", input.yearOneOpexUsd);
  requireRate("annualOpexEscalationRate", input.annualOpexEscalationRate, { allowOne: false });
  requireRate("itcRate", input.itcRate);
  requireRate("itcEligibleBasisPercent", input.itcEligibleBasisPercent);
  requireRate("itcTransferPrice", input.itcTransferPrice);
  requireRate("debtInterestRate", input.debtInterestRate, { allowOne: false });
  requirePositive("debtAmortizationYears", input.debtAmortizationYears);
  requirePositive("targetP50Dscr", input.targetP50Dscr);
  requireRate("maximumLtc", input.maximumLtc);
  requireRate("upfrontFeePercent", input.upfrontFeePercent);
  requireFinite("dsraMonths", input.dsraMonths);
  if (input.dsraMonths < 0) throw new Error("dsraMonths must be zero or greater");

  if (!Number.isInteger(input.projectLifeYears)) throw new Error("projectLifeYears must be an integer");
  if (!Number.isInteger(input.ppaTermYears)) throw new Error("ppaTermYears must be an integer");
  if (!Number.isInteger(input.debtAmortizationYears)) throw new Error("debtAmortizationYears must be an integer");

  if (input.ppaTermYears > input.projectLifeYears) {
    throw new Error("ppaTermYears cannot exceed projectLifeYears in V0");
  }
}

/**
 * V0 deterministic operating forecast.
 *
 * Generation follows Spec 01: MW AC × 8,760 × P50 capacity factor, with annual
 * degradation. Revenue exists only during the contracted PPA term. No merchant
 * terminal value is assumed in V0.
 */
export function buildOperatingForecast(input: ProjectFinanceInputs): AnnualOperatingRow[] {
  validateProjectFinanceInputs(input);

  const yearOneGenerationMwh = input.capacityMwAc * HOURS_PER_YEAR * input.p50CapacityFactor;

  return Array.from({ length: input.projectLifeYears }, (_, index) => {
    const year = index + 1;
    const generationMwh = yearOneGenerationMwh * Math.pow(1 - input.annualDegradationRate, index);
    const ppaPricePerMwh = input.yearOnePpaPricePerMwh * Math.pow(1 + input.annualPpaEscalationRate, index);
    const contracted = year <= input.ppaTermYears;
    const revenueUsd = contracted ? generationMwh * ppaPricePerMwh : 0;
    const opexUsd = input.yearOneOpexUsd * Math.pow(1 + input.annualOpexEscalationRate, index);
    const cfadsUsd = revenueUsd - opexUsd;
    const allowableDebtServiceUsd = Math.max(0, cfadsUsd / input.targetP50Dscr);

    return {
      year,
      generationMwh,
      ppaPricePerMwh,
      revenueUsd,
      opexUsd,
      cfadsUsd,
      allowableDebtServiceUsd,
    };
  });
}

export function calculateTransferredItc(input: ProjectFinanceInputs): TaxCreditResult {
  validateProjectFinanceInputs(input);

  const transactionCostsUsd = Math.max(0, input.itcTransferTransactionCostsUsd ?? 0);
  const eligibleBasisUsd = input.totalProjectCapexUsd * input.itcEligibleBasisPercent;
  const itcFaceValueUsd = eligibleBasisUsd * input.itcRate;
  const grossTransferProceedsUsd = itcFaceValueUsd * input.itcTransferPrice;
  const netTransferProceedsUsd = Math.max(0, grossTransferProceedsUsd - transactionCostsUsd);

  return {
    eligibleBasisUsd,
    itcFaceValueUsd,
    grossTransferProceedsUsd,
    transactionCostsUsd,
    netTransferProceedsUsd,
  };
}

/**
 * Present value of the maximum debt service permitted by CFADS / target DSCR.
 * Only the lesser of the amortization period, PPA term, and modeled life is used
 * for V0 debt capacity so that debt is not implicitly supported by merchant value.
 */
export function calculateDebtSizing(
  input: ProjectFinanceInputs,
  forecast: AnnualOperatingRow[] = buildOperatingForecast(input),
): DebtSizingResult {
  validateProjectFinanceInputs(input);

  const sizingYears = Math.min(
    input.debtAmortizationYears,
    input.ppaTermYears,
    input.projectLifeYears,
    forecast.length,
  );

  let dscrSizedDebtUsd = 0;
  for (let index = 0; index < sizingYears; index += 1) {
    const allowable = Math.max(0, forecast[index]?.allowableDebtServiceUsd ?? 0);
    dscrSizedDebtUsd += allowable / Math.pow(1 + input.debtInterestRate, index + 1);
  }

  const ltcMaximumDebtUsd = input.totalProjectCapexUsd * input.maximumLtc;
  const permanentDebtUsd = Math.min(dscrSizedDebtUsd, ltcMaximumDebtUsd);

  let bindingConstraint: DebtBindingConstraint = "NONE";
  if (permanentDebtUsd > 0) {
    bindingConstraint = dscrSizedDebtUsd <= ltcMaximumDebtUsd ? "DSCR" : "LTC";
  }

  return {
    dscrSizedDebtUsd,
    ltcMaximumDebtUsd,
    permanentDebtUsd,
    bindingConstraint,
  };
}

export function runProjectFinanceV0(input: ProjectFinanceInputs): ProjectFinanceResult {
  const operatingForecast = buildOperatingForecast(input);
  const taxCredit = calculateTransferredItc(input);
  const debtSizing = calculateDebtSizing(input, operatingForecast);

  return {
    operatingForecast,
    yearOneCfadsUsd: operatingForecast[0]?.cfadsUsd ?? 0,
    taxCredit,
    debtSizing,
  };
}
