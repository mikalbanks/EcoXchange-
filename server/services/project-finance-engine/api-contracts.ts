import { z } from "zod";

export const PROJECT_FINANCE_API_VERSION = "v1" as const;

export type ProjectFinanceErrorCode =
  | "PROJECT_OUT_OF_SCOPE"
  | "SCENARIO_NOT_READY"
  | "MISSING_REQUIRED_INPUT"
  | "INVALID_FINANCIAL_INPUT"
  | "POLICY_NOT_FOUND"
  | "POLICY_CALCULATION_MISMATCH"
  | "CALCULATION_FAILED"
  | "DEBT_SCULPTING_RECONCILIATION_ERROR"
  | "IRR_SOLVER_FAILED"
  | "UNDERWRITING_FAILED"
  | "STALE_SCENARIO"
  | "FORBIDDEN"
  | "NOT_FOUND";

export class ProjectFinanceDomainError extends Error {
  constructor(
    public readonly code: ProjectFinanceErrorCode,
    message: string,
    public readonly status: number = 422,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProjectFinanceDomainError";
  }
}

export interface ApiErrorEnvelope {
  error: {
    code: ProjectFinanceErrorCode | "INVALID_REQUEST" | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown>;
    request_id: string;
  };
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export const previewProjectSchema = z.object({
  technology: z.string().default("SOLAR_PV"),
  capacity_mw_ac: z.number().positive(),
}).strict();

export const previewInputsSchema = z.object({
  project_name: z.string().default("Preview"),
  capacity_factor_p50: z.number().gt(0).lte(1),
  annual_degradation_rate: z.number().gte(0).lt(1),
  project_life_years: z.number().int().positive(),
  ppa_price_year_1_per_mwh: z.number().gte(0),
  ppa_escalation_rate: z.number().gt(-1),
  ppa_term_years: z.number().int().positive(),
  project_capex: z.number().positive(),
  opex_year_1: z.number().gte(0),
  opex_escalation_rate: z.number().gt(-1),
  itc_rate: z.number().gte(0).lte(1),
  itc_eligible_basis_pct: z.number().gte(0).lte(1),
  itc_transfer_price: z.number().gte(0),
  itc_transaction_costs: z.number().gte(0).default(0),
  debt_interest_rate: z.number().gt(-1),
  target_dscr: z.number().positive(),
  max_ltc: z.number().gte(0).lte(1),
  amortization_years: z.number().int().positive(),
  debt_maturity_years: z.number().int().positive().optional(),
  lender_fee_rate: z.number().gte(0),
  dsra_months: z.number().gte(0),
  closing_costs: z.number().gte(0).default(0),
  downside_generation_multiplier: z.number().gte(0).lte(1).optional(),
}).strict();

export const previewRequestSchema = z.object({
  project: previewProjectSchema,
  inputs: previewInputsSchema,
}).strict();

export const calculateRequestSchema = z.object({
  force_recalculate: z.boolean().default(false),
  run_sensitivities: z.boolean().default(false),
}).strict();

export const underwriteRequestSchema = z.object({
  policy_code: z.string().default("ECOXCHANGE_SOLAR_BASE"),
  policy_version: z.string().default("0.1.0"),
}).strict();

export const sensitivityRequestSchema = z.object({
  variable: z.enum([
    "ppa_price_year_1_per_mwh",
    "debt_interest_rate",
    "project_capex",
    "capacity_factor_p50",
    "itc_rate",
  ]),
  values: z.array(z.number()).min(1).max(25),
}).strict();
