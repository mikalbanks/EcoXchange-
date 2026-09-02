import { z } from "zod";

/**
 * Ticket 02 domain contracts.
 *
 * This module defines runtime-safe shapes and shared identifiers only. It does
 * not calculate finance, apply underwriting policy, access persistence, or
 * depend on HTTP/frontend state.
 */

export const CANONICAL_PROJECT_FINANCE_UNITS = [
  "USD",
  "USD_PER_MWH",
  "MW_AC",
  "MWH",
  "PERCENT_DECIMAL",
  "YEARS",
  "MONTHS",
  "RATIO",
] as const;

export type ProjectFinanceUnit = (typeof CANONICAL_PROJECT_FINANCE_UNITS)[number];

export const projectFinanceUnitSchema = z.enum(CANONICAL_PROJECT_FINANCE_UNITS);

export const projectIdSchema = z.string().uuid().brand<"ProjectId">();
export const scenarioIdSchema = z.string().uuid().brand<"ScenarioId">();
export const calculationRunIdSchema = z.string().uuid().brand<"CalculationRunId">();
export const underwritingRunIdSchema = z.string().uuid().brand<"UnderwritingRunId">();
export const policyVersionSchema = z.string().min(1).brand<"PolicyVersion">();

export type ProjectId = z.infer<typeof projectIdSchema>;
export type ScenarioId = z.infer<typeof scenarioIdSchema>;
export type CalculationRunId = z.infer<typeof calculationRunIdSchema>;
export type UnderwritingRunId = z.infer<typeof underwritingRunIdSchema>;
export type PolicyVersion = z.infer<typeof policyVersionSchema>;

export const assumptionSourceSchema = z.enum([
  "USER_FACT",
  "DOCUMENT_FACT",
  "ECOXCHANGE_ASSUMPTION",
  "DERIVED",
]);

export type AssumptionSource = z.infer<typeof assumptionSourceSchema>;

export const dsraReferenceMethodSchema = z.enum([
  "YEAR_ONE",
  "MAX_ANNUAL_DEBT_SERVICE",
  "NEXT_TWELVE_MONTHS",
  "CUSTOM",
]);

export type DscrReferenceMethod = z.infer<typeof dsraReferenceMethodSchema>;

export const taxModuleInputSchema = z.object({
  enabled: z.boolean(),
  bonusDepreciationPct: z.number().finite().gte(0).lte(1),
  federalTaxRate: z.number().finite().gte(0).lte(1),
  sponsorTaxAppetitePct: z.number().finite().gte(0).lte(1),
}).strict();

export type TaxModuleInput = z.infer<typeof taxModuleInputSchema>;

const nonNegativeFinite = z.number().finite().gte(0);
const positiveFinite = z.number().finite().gt(0);
const decimalRate = z.number().finite().gte(0).lte(1);
const escalationRate = z.number().finite().gt(-1).lt(10);
const positiveIntegerYears = z.number().int().gte(1).lte(200);

/**
 * Runtime shape for the deterministic Spec 02 finance engine input.
 *
 * This intentionally mirrors the already-approved ProjectFinanceInputs contract
 * in core.ts. The schema exists so application/API code can reject malformed or
 * ambiguous payloads before invoking the calculation module.
 */
export const projectFinanceInputSchema = z.object({
  projectName: z.string().min(1),
  capacityMwAc: positiveFinite,
  p50CapacityFactor: z.number().finite().gt(0).lte(1),
  annualGenerationOverrideMwh: z.array(nonNegativeFinite).readonly().optional(),
  annualDegradationRate: z.number().finite().gte(0).lt(1),
  projectLifeYears: positiveIntegerYears,
  ppaTermYears: positiveIntegerYears,
  yearOnePpaPricePerMwh: nonNegativeFinite,
  annualPpaEscalationRate: escalationRate,
  totalProjectCapexUsd: positiveFinite,
  capexIncludesContingency: z.boolean().optional(),
  contingencyRate: z.number().finite().gte(0).lt(10).optional(),
  yearOneOpexUsd: nonNegativeFinite,
  annualOpexEscalationRate: escalationRate,
  itcRate: decimalRate,
  itcEligibleBasisPercent: decimalRate,
  itcTransferPrice: nonNegativeFinite,
  itcTransferTransactionCostsUsd: nonNegativeFinite.optional(),
  debtInterestRate: z.number().finite().gt(-1),
  debtAmortizationYears: positiveIntegerYears,
  debtMaturityYears: positiveIntegerYears.optional(),
  targetP50Dscr: positiveFinite,
  maximumLtc: decimalRate,
  upfrontFeePercent: z.number().finite().gte(0).lte(10),
  dsraMonths: z.number().finite().gte(0).lte(120),
  dsraReferenceMethod: dsraReferenceMethodSchema.optional(),
  customDsraReferenceAnnualDebtServiceUsd: nonNegativeFinite.optional(),
  closingCostsUsd: nonNegativeFinite.optional(),
  otherFinancingUsesUsd: nonNegativeFinite.optional(),
  otherPermanentSourcesUsd: nonNegativeFinite.optional(),
  bridgeEligibleAmountUsd: nonNegativeFinite.optional(),
  bridgeAdvancePercent: decimalRate.optional(),
  downsideGenerationMultiplier: decimalRate.optional(),
  explicitDownsideGenerationMwh: z.array(nonNegativeFinite).readonly().optional(),
  discountRate: z.number().finite().gt(-1).optional(),
  taxModule: taxModuleInputSchema.optional(),
  underwritingPolicyId: z.string().min(1).optional(),
  underwritingPolicyVersion: z.string().min(1).optional(),
}).strict().superRefine((input, ctx) => {
  if (input.debtAmortizationYears > input.projectLifeYears) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["debtAmortizationYears"],
      message: "debtAmortizationYears cannot exceed projectLifeYears",
    });
  }

  const maturity = input.debtMaturityYears ?? input.debtAmortizationYears;
  if (maturity > input.debtAmortizationYears) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["debtMaturityYears"],
      message: "debtMaturityYears cannot exceed debtAmortizationYears",
    });
  }

  if (
    input.annualGenerationOverrideMwh &&
    input.annualGenerationOverrideMwh.length !== input.projectLifeYears
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["annualGenerationOverrideMwh"],
      message: "annualGenerationOverrideMwh must contain exactly projectLifeYears entries",
    });
  }

  if (
    input.explicitDownsideGenerationMwh &&
    input.explicitDownsideGenerationMwh.length !== input.projectLifeYears
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["explicitDownsideGenerationMwh"],
      message: "explicitDownsideGenerationMwh must contain exactly projectLifeYears entries",
    });
  }

  if (
    input.dsraReferenceMethod === "CUSTOM" &&
    input.customDsraReferenceAnnualDebtServiceUsd === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customDsraReferenceAnnualDebtServiceUsd"],
      message: "customDsraReferenceAnnualDebtServiceUsd is required when dsraReferenceMethod is CUSTOM",
    });
  }

  if (
    input.capexIncludesContingency === false &&
    input.contingencyRate === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contingencyRate"],
      message: "contingencyRate is required when capexIncludesContingency is false",
    });
  }
});

export type ProjectFinanceInputContract = z.infer<typeof projectFinanceInputSchema>;

export function parseProjectFinanceInput(input: unknown): ProjectFinanceInputContract {
  return projectFinanceInputSchema.parse(input);
}

export interface MoneyValue {
  value: number;
  currency: "USD";
}

export interface RateValue {
  value: number;
  unit: "PERCENT_DECIMAL";
}

export interface RatioValue {
  value: number;
  unit: "RATIO";
}
