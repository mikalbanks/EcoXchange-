import { z } from "zod";

export const PROJECT_FINANCE_API_VERSION = "v1" as const;
export const INDICATIVE_UNDERWRITING_DISCLAIMER = "Preliminary lender-style decision support; subject to lender, legal, tax, and engineering diligence.";

export const uuidSchema = z.string().uuid();
export const idempotencyKeySchema = z.string().trim().min(1).max(128);

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  technology: z.string().trim().min(1).max(64),
  country_code: z.string().trim().length(2).default("US"),
  state_code: z.string().trim().max(8).nullable().optional(),
  capacity_mw_ac: z.number().finite().positive().nullable().optional(),
  development_status: z.enum(["DEVELOPMENT","READY_TO_BUILD","CONSTRUCTION","OPERATING","RETIRED","UNKNOWN"]).nullable().optional(),
  revenue_structure: z.enum(["FULLY_CONTRACTED","PARTIALLY_CONTRACTED","MERCHANT","UNKNOWN"]).nullable().optional(),
}).strict();

export const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  state_code: z.string().trim().max(8).nullable().optional(),
  capacity_mw_ac: z.number().finite().positive().nullable().optional(),
  development_status: z.enum(["DEVELOPMENT","READY_TO_BUILD","CONSTRUCTION","OPERATING","RETIRED","UNKNOWN"]).nullable().optional(),
  revenue_structure: z.enum(["FULLY_CONTRACTED","PARTIALLY_CONTRACTED","MERCHANT","UNKNOWN"]).nullable().optional(),
}).strict().refine(v => Object.keys(v).length > 0, "At least one field is required");

// Client-facing fact writes cannot self-assert VERIFIED. Verification is a trusted review action,
// not a request-body flag. Internal/document workflows can promote confidence separately later.
export const projectFactCreateSchema = z.object({
  field_key: z.string().trim().min(1).max(200),
  value: z.unknown(),
  unit: z.string().trim().max(64).nullable().optional(),
  source_type: z.enum(["USER_ASSERTION","EXECUTED_DOCUMENT","SPONSOR_DOCUMENT","INDEPENDENT_ENGINEER_REPORT","LENDER_QUOTE","ECOXCHANGE_ASSUMPTION","SYSTEM_DERIVED","UNKNOWN"]),
  confidence_status: z.enum(["REPORTED","UNVERIFIED","DISPUTED","UNKNOWN"]).default("UNKNOWN"),
  source_document_id: uuidSchema.nullable().optional(),
}).strict();

export const scenarioCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  scenario_type: z.enum(["BASE","CUSTOM","SENSITIVITY_BASE","LENDER_CASE","DOWNSIDE"]).default("CUSTOM"),
  parent_scenario_id: uuidSchema.nullable().optional(),
}).strict();

export const scenarioPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
}).strict().refine(v => Object.keys(v).length > 0, "At least one field is required");

export const scenarioAssumptionsSchema = z.object({
  assumptions: z.array(z.object({
    field_key: z.string().trim().min(1).max(200),
    value: z.unknown(),
    unit: z.string().trim().max(64).nullable().optional(),
    source_type: z.enum(["USER_ASSERTION","PROJECT_FACT","LENDER_QUOTE","ECOXCHANGE_POLICY","USER_ASSUMPTION","SYSTEM_DERIVED"]).default("USER_ASSUMPTION"),
    provenance_type: z.string().trim().max(128).nullable().optional(),
  }).strict()).min(1).max(100),
}).strict();

export const policyOverrideCreateSchema = z.object({
  field_key: z.string().trim().min(1).max(200),
  override_value: z.unknown(),
  reason: z.string().trim().min(1).max(1000),
  policy_id: uuidSchema,
  source_type: z.enum(["USER_ASSUMPTION","LENDER_QUOTE","EXECUTED_TERM_SHEET","OTHER"]).default("OTHER"),
}).strict();

export const policySelectorSchema = z.object({
  policy_id: uuidSchema.optional(),
  policy_code: z.string().trim().min(1).max(128).optional(),
  policy_version: z.string().trim().min(1).max(64).optional(),
}).strict();

export const analyzeBodySchema = policySelectorSchema;
export const calculateBodySchema = policySelectorSchema;
export const underwriteBodySchema = policySelectorSchema;

export type ApiErrorEnvelope = { error: { code: string; message: string; details?: Record<string, unknown> } };
export type ApiSuccessEnvelope<T> = { data: T; meta?: Record<string, unknown> };
