import { z } from "zod";

/**
 * Ticket 02 — pure project-finance domain contracts.
 *
 * Rules:
 * - percentages/rates are decimals (0.30 = 30%; 0.065 = 6.5%);
 * - monetary values are unformatted USD numbers;
 * - no underwriting-policy defaults are inserted here;
 * - mathematical validity is separate from EcoXchange credit-policy validity;
 * - this module has no database, auth, HTTP, frontend, network, or AI dependency.
 */

export const CANONICAL_PROJECT_FINANCE_UNITS = [
  "USD",
  "USD_PER_MWH",
  "MW_AC",
  "MWH",
  "RATIO",
  "PERCENT_DECIMAL",
  "YEARS",
  "MONTHS",
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

export const inputProvenanceSourceSchema = z.enum([
  "USER_FACT",
  "DOCUMENT_FACT",
  "LENDER_QUOTE",
  "ECOXCHANGE_POLICY",
  "USER_ASSUMPTION",
]);
export type InputProvenanceSource = z.infer<typeof inputProvenanceSourceSchema>;

export const inputProvenanceSchema = z.object({
  source: inputProvenanceSourceSchema,
  source_label: z.string().min(1).optional(),
  source_reference: z.string().min(1).optional(),
}).strict();
export type InputProvenance = z.infer<typeof inputProvenanceSchema>;

export const generationSourceTypeSchema = z.enum([
  "CAPACITY_FACTOR_MODEL",
  "USER_SUPPLIED",
  "INDEPENDENT_ENGINEER",
  "PYSAM",
]);
export type GenerationSourceType = z.infer<typeof generationSourceTypeSchema>;

export const downsideTypeSchema = z.enum([
  "NONE",
  "ILLUSTRATIVE_MULTIPLIER",
  "EXPLICIT_GENERATION",
]);
export type DownsideType = z.infer<typeof downsideTypeSchema>;

export const downsideGenerationSourceTypeSchema = z.enum([
  "INDEPENDENT_ENGINEER_P90",
  "USER_SUPPLIED_P90",
  "ILLUSTRATIVE_PERCENT_OF_P50",
]);
export type DownsideGenerationSourceType = z.infer<typeof downsideGenerationSourceTypeSchema>;

export const dsraReferenceMethodSchema = z.enum([
  "YEAR_ONE",
  "MAX_ANNUAL_DEBT_SERVICE",
  "NEXT_TWELVE_MONTHS",
  "CUSTOM",
]);
export type DsraReferenceMethod = z.infer<typeof dsraReferenceMethodSchema>;

export const bindingDebtConstraintSchema = z.enum([
  "DSCR",
  "LTC",
  "ZERO_CFADS",
  "NEGATIVE_AMORTIZATION",
  "AMORTIZATION_TERM",
  "OTHER",
]);
export type BindingDebtConstraint = z.infer<typeof bindingDebtConstraintSchema>;

export const irrStatusSchema = z.enum([
  "VALID",
  "NO_SIGN_CHANGE",
  "MULTIPLE_ROOT_RISK",
  "SOLVER_FAILED",
]);
export type IrrStatus = z.infer<typeof irrStatusSchema>;

export const warningSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export type WarningSeverity = z.infer<typeof warningSeveritySchema>;

const finite = z.number().finite();
const nonNegativeFinite = finite.gte(0);
const positiveFinite = finite.gt(0);
const fraction = finite.gte(0).lte(1);
const escalation = finite.gt(-1);
const positiveIntegerYears = z.number().int().gte(1).lte(200);

export const projectInputSchema = z.object({
  capacity_mw_ac: positiveFinite,
  project_life_years: positiveIntegerYears,
  technology: z.literal("SOLAR_PV").optional(),
  country_code: z.string().length(2).optional(),
  state_code: z.string().min(2).max(3).optional(),
}).strict();
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const generationInputSchema = z.object({
  capacity_factor_p50: finite.gt(0).lte(1),
  annual_degradation_rate: finite.gte(0).lt(1),
  annual_generation_override_mwh: z.array(nonNegativeFinite).optional(),
  generation_source_type: generationSourceTypeSchema.optional(),
}).strict();
export type GenerationInput = z.infer<typeof generationInputSchema>;

export const revenueInputSchema = z.object({
  ppa_price_year_1_per_mwh: nonNegativeFinite,
  ppa_escalation_rate: escalation,
  ppa_term_years: positiveIntegerYears,
}).strict();
export type RevenueInput = z.infer<typeof revenueInputSchema>;

export const operatingCostInputSchema = z.object({
  opex_year_1: nonNegativeFinite,
  opex_escalation_rate: escalation,
  category_detail: z.record(z.string(), nonNegativeFinite).optional(),
}).strict();
export type OperatingCostInput = z.infer<typeof operatingCostInputSchema>;

export const taxCreditInputSchema = z.object({
  itc_rate: nonNegativeFinite,
  itc_eligible_basis_pct: fraction,
  itc_transfer_price: nonNegativeFinite,
  itc_transaction_costs: nonNegativeFinite,
  bonus_depreciation_pct: fraction.optional(),
  federal_tax_rate: fraction.optional(),
  sponsor_tax_appetite_pct: fraction.optional(),
}).strict();
export type TaxCreditInput = z.infer<typeof taxCreditInputSchema>;

export const financingInputSchema = z.object({
  annual_interest_rate: finite.gt(-1),
  target_dscr: positiveFinite,
  max_ltc: fraction,
  amortization_years: positiveIntegerYears,
  debt_maturity_years: positiveIntegerYears,
  lender_fee_rate: nonNegativeFinite,
}).strict();
export type FinancingInput = z.infer<typeof financingInputSchema>;

export const reserveInputSchema = z.object({
  dsra_months: nonNegativeFinite,
  dsra_reference_method: dsraReferenceMethodSchema.optional(),
  custom_dsra_reference_annual_debt_service: nonNegativeFinite.optional(),
}).strict();
export type ReserveInput = z.infer<typeof reserveInputSchema>;

export const transactionCostInputSchema = z.object({
  project_capex: positiveFinite,
  closing_costs: nonNegativeFinite,
  other_financing_uses: nonNegativeFinite,
  other_permanent_sources: nonNegativeFinite.optional(),
  capex_includes_contingency: z.boolean().optional(),
  contingency_rate: nonNegativeFinite.optional(),
  bridge_eligible_amount: nonNegativeFinite.optional(),
  bridge_advance_percent: fraction.optional(),
}).strict();
export type TransactionCostInput = z.infer<typeof transactionCostInputSchema>;

export const downsideInputSchema = z.object({
  downside_type: downsideTypeSchema,
  downside_generation_multiplier: fraction.optional(),
  annual_downside_generation_mwh: z.array(nonNegativeFinite).optional(),
  generation_source_type: downsideGenerationSourceTypeSchema.optional(),
}).strict().superRefine((input, ctx) => {
  if (input.downside_type === "ILLUSTRATIVE_MULTIPLIER" && input.downside_generation_multiplier === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["downside_generation_multiplier"], message: "A downside generation multiplier is required for ILLUSTRATIVE_MULTIPLIER." });
  }
  if (input.downside_type === "EXPLICIT_GENERATION" && !input.annual_downside_generation_mwh) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["annual_downside_generation_mwh"], message: "An explicit downside generation array is required for EXPLICIT_GENERATION." });
  }
});
export type DownsideInput = z.infer<typeof downsideInputSchema>;

export const calculationOptionsSchema = z.object({
  tax_module_enabled: z.boolean(),
  discount_rate: finite.gt(-1).optional(),
}).strict();
export type CalculationOptions = z.infer<typeof calculationOptionsSchema>;

/**
 * Authoritative Ticket 02 scenario input contract.
 * Values are explicit. This schema deliberately supplies no finance-policy defaults.
 */
export const projectFinanceInputSchema = z.object({
  project: projectInputSchema,
  generation: generationInputSchema,
  revenue: revenueInputSchema,
  operating_costs: operatingCostInputSchema,
  tax_credit: taxCreditInputSchema,
  financing: financingInputSchema,
  reserves: reserveInputSchema,
  transaction_costs: transactionCostInputSchema,
  downside: downsideInputSchema,
  calculation_options: calculationOptionsSchema,
  provenance: z.record(z.string(), inputProvenanceSchema).optional(),
}).strict().superRefine((input, ctx) => {
  if (input.financing.amortization_years > input.project.project_life_years) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["financing", "amortization_years"], message: "Amortization years cannot exceed project life years." });
  }
  if (input.financing.debt_maturity_years > input.financing.amortization_years) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["financing", "debt_maturity_years"], message: "Debt maturity years cannot exceed amortization years." });
  }
  if (input.generation.annual_generation_override_mwh && input.generation.annual_generation_override_mwh.length !== input.project.project_life_years) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["generation", "annual_generation_override_mwh"], message: "Annual generation override must contain exactly project_life_years entries." });
  }
  if (input.downside.annual_downside_generation_mwh && input.downside.annual_downside_generation_mwh.length !== input.project.project_life_years) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["downside", "annual_downside_generation_mwh"], message: "Annual downside generation must contain exactly project_life_years entries." });
  }
  if (input.reserves.dsra_reference_method === "CUSTOM" && input.reserves.custom_dsra_reference_annual_debt_service === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reserves", "custom_dsra_reference_annual_debt_service"], message: "Custom DSRA reference debt service is required when dsra_reference_method is CUSTOM." });
  }
});
export type ProjectFinanceInput = z.infer<typeof projectFinanceInputSchema>;

export type FinanceValidationErrorCode =
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
  | "INVALID_MATURITY"
  | "INVALID_ITC_RATE"
  | "INVALID_ITC_BASIS"
  | "INVALID_TRANSFER_PRICE"
  | "INVALID_DSRA"
  | "INVALID_DOWNSIDE"
  | "INVALID_GENERATION_OVERRIDE"
  | "INVALID_DISCOUNT_RATE"
  | "INVALID_TRANSACTION_COST"
  | "MISSING_REQUIRED_INPUT"
  | "INVALID_INPUT";

export interface FinanceValidationError {
  code: FinanceValidationErrorCode;
  field: string;
  message: string;
  value?: unknown;
  details?: Record<string, unknown>;
}

export class FinanceValidationException extends Error {
  constructor(public readonly errors: FinanceValidationError[]) {
    super("Project finance input validation failed.");
    this.name = "FinanceValidationException";
  }
}

function codeForPath(path: readonly PropertyKey[], issueCode: z.ZodIssueCode): FinanceValidationErrorCode {
  const field = path.join(".");
  if (issueCode === z.ZodIssueCode.invalid_type) return "MISSING_REQUIRED_INPUT";
  if (field.includes("capacity_mw_ac")) return "INVALID_CAPACITY";
  if (field.includes("project_capex")) return "INVALID_CAPEX";
  if (field.includes("capacity_factor_p50")) return "INVALID_CAPACITY_FACTOR";
  if (field.includes("annual_degradation_rate")) return "INVALID_DEGRADATION";
  if (field.includes("ppa_price_year_1_per_mwh")) return "INVALID_PPA_PRICE";
  if (field.includes("escalation_rate")) return "INVALID_ESCALATION";
  if (field.includes("project_life_years")) return "INVALID_PROJECT_LIFE";
  if (field.includes("ppa_term_years")) return "INVALID_PPA_TERM";
  if (field.includes("opex_year_1")) return "INVALID_OPEX";
  if (field.includes("annual_interest_rate")) return "INVALID_INTEREST_RATE";
  if (field.includes("target_dscr")) return "INVALID_DSCR";
  if (field.includes("max_ltc")) return "INVALID_LTC";
  if (field.includes("amortization_years")) return "INVALID_AMORTIZATION";
  if (field.includes("debt_maturity_years")) return "INVALID_MATURITY";
  if (field.includes("itc_rate")) return "INVALID_ITC_RATE";
  if (field.includes("itc_eligible_basis_pct")) return "INVALID_ITC_BASIS";
  if (field.includes("itc_transfer_price")) return "INVALID_TRANSFER_PRICE";
  if (field.includes("dsra")) return "INVALID_DSRA";
  if (field.includes("downside")) return "INVALID_DOWNSIDE";
  if (field.includes("generation_override")) return "INVALID_GENERATION_OVERRIDE";
  if (field.includes("discount_rate")) return "INVALID_DISCOUNT_RATE";
  if (field.includes("closing_costs") || field.includes("financing_uses") || field.includes("contingency") || field.includes("bridge")) return "INVALID_TRANSACTION_COST";
  return "INVALID_INPUT";
}

function issueToDomainError(issue: z.ZodIssue, rawInput: unknown): FinanceValidationError {
  const field = issue.path.join(".");
  let value: unknown;
  if (rawInput && typeof rawInput === "object") {
    value = issue.path.reduce<unknown>((current, key) => {
      if (current && typeof current === "object") return (current as Record<PropertyKey, unknown>)[key];
      return undefined;
    }, rawInput);
  }
  return { code: codeForPath(issue.path, issue.code), field, message: issue.message, value };
}

export type ProjectFinanceValidationResult =
  | { success: true; data: ProjectFinanceInput; errors: [] }
  | { success: false; errors: FinanceValidationError[] };

export function validateProjectFinanceInput(input: unknown): ProjectFinanceValidationResult {
  const result = projectFinanceInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data, errors: [] };
  return { success: false, errors: result.error.issues.map((issue) => issueToDomainError(issue, input)) };
}

export function parseProjectFinanceInput(input: unknown): ProjectFinanceInput {
  const result = validateProjectFinanceInput(input);
  if (!result.success) throw new FinanceValidationException(result.errors);
  return result.data;
}

// Result contracts for later calculation tickets. These types contain no formulas.
export interface AnnualProjectCashFlow {
  year: number;
  generation_mwh: number;
  ppa_price_per_mwh: number;
  revenue: number;
  opex: number;
  cfads: number;
  depreciation?: number;
  tax_shield?: number;
}

export interface AnnualDebtScheduleRow {
  year: number;
  opening_balance: number;
  interest: number;
  principal: number;
  debt_service: number;
  ending_balance: number;
  dscr: number | null;
  downside_cfads?: number | null;
  downside_dscr?: number | null;
}

export interface FinancingSummary {
  dscr_sized_debt: number;
  ltc_debt_limit: number;
  permanent_debt: number;
  binding_constraint: BindingDebtConstraint;
  debt_to_capex: number;
  minimum_dscr: number | null;
  minimum_dscr_year: number | null;
  balloon_balance: number;
  lender_fee: number;
  dsra: number;
}

export interface TaxCreditResult {
  eligible_basis: number;
  itc_rate: number;
  itc_face_value: number;
  transfer_price: number;
  gross_transfer_proceeds: number;
  transaction_costs: number;
  net_transfer_proceeds: number;
  depreciable_basis?: number;
  bonus_depreciation?: number;
  tax_shield?: number;
}

export interface CapitalStackResult {
  total_closing_uses: number;
  permanent_debt: number;
  net_itc_proceeds: number;
  sponsor_equity: number;
  other_sources: number;
  permanent_debt_pct_total_uses: number;
  itc_proceeds_pct_total_uses: number;
  sponsor_equity_pct_total_uses: number;
  other_sources_pct_total_uses?: number;
  debt_to_capex: number;
}

export interface ReturnResult {
  levered_sponsor_cash_irr: number | null;
  simplified_sponsor_after_tax_irr?: number | null;
  project_unlevered_cash_irr_before_tax_attributes?: number | null;
  sponsor_npv?: number;
  project_npv?: number;
  irr_status: IrrStatus;
  irr_warning?: string;
}

export interface DownsideResult {
  downside_type: DownsideType;
  generation_source_type?: DownsideGenerationSourceType;
  generation_multiplier?: number;
  minimum_downside_dscr?: number | null;
  full_repayment?: boolean;
  repayment_year?: number | null;
  unrepaid_balance?: number;
  interest_shortfall: boolean;
}

export interface ReconciliationResult {
  sources_uses_difference: number;
  sources_uses_reconciled: boolean;
  debt_reconciliation_difference: number;
  debt_reconciled: boolean;
}

export interface CalculationWarning {
  code: string;
  severity: WarningSeverity;
  message: string;
  metric_key?: string;
  year?: number;
  metadata?: Record<string, unknown>;
}

export interface MetricTrace {
  metric_key: string;
  value: number | null;
  formula_id: string;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

export interface ProjectFinanceResult {
  annual_project_cash_flows: AnnualProjectCashFlow[];
  annual_debt_schedule: AnnualDebtScheduleRow[];
  financing_summary: FinancingSummary;
  tax_credit_result: TaxCreditResult;
  capital_stack_result: CapitalStackResult;
  return_result: ReturnResult;
  downside_result: DownsideResult | null;
  warnings: CalculationWarning[];
  reconciliation: ReconciliationResult;
  metric_traces: MetricTrace[];
}
