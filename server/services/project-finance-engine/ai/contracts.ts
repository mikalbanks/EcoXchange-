import { z } from "zod";

export const aiOperationSchema = z.enum([
  "DOCUMENT_EXTRACTION",
  "UNDERWRITING_EXPLANATION",
  "CREDIT_MEMO",
]);
export type AIOperation = z.infer<typeof aiOperationSchema>;

export interface AIBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  allowCachedContext: boolean;
  allowRetry: boolean;
}

export interface AIUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  actualCostUsd?: number;
}

export interface PromptIdentity {
  code: string;
  version: string;
}

export interface ProviderModel {
  provider: string;
  model: string;
}

export interface StructuredGenerationRequest<T> {
  operation: AIOperation;
  model: string;
  prompt: PromptIdentity;
  system: string;
  input: unknown;
  outputSchema: z.ZodType<T>;
  budget: AIBudget;
  cacheKey?: string;
  temperature?: number;
}

export interface TextGenerationRequest {
  operation: AIOperation;
  model: string;
  prompt: PromptIdentity;
  system: string;
  input: unknown;
  budget: AIBudget;
  cacheKey?: string;
  temperature?: number;
}

export interface ProviderGeneration<T> {
  output: T;
  usage: AIUsage;
  providerRequestId?: string;
  cacheHit?: boolean;
}

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCachedInputTokens: number;
  estimatedCostUsd: number;
}

export interface LLMProvider {
  readonly id: string;
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<ProviderGeneration<T>>;
  generateText(request: TextGenerationRequest): Promise<ProviderGeneration<string>>;
  estimateCost(inputTokens: number, outputTokens: number, cachedInputTokens?: number): number;
  estimateTokens?(input: unknown): number;
}

export type AIErrorCode =
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_COST_LIMIT_EXCEEDED"
  | "AI_OUTPUT_SCHEMA_INVALID"
  | "AI_CONTEXT_TOO_LARGE"
  | "AI_EXTRACTION_AMBIGUOUS"
  | "AI_CONTENT_BLOCKED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_FEATURE_DISABLED"
  | "AI_OUTPUT_CONTRADICTS_TRUTH";

export class AIServiceError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export const extractionResolutionSchema = z.enum(["FOUND", "NOT_FOUND", "AMBIGUOUS", "NOT_APPLICABLE"]);
export const extractionConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const extractionReviewStatusSchema = z.enum(["UNREVIEWED", "ACCEPTED", "CORRECTED", "REJECTED"]);

export const extractionEvidenceSchema = z.object({
  page: z.number().int().positive().optional(),
  section: z.string().max(200).optional(),
  quote: z.string().max(300).optional(),
}).strict();

export const extractedFieldSchema = z.object({
  field_key: z.string().min(1).max(120),
  resolution: extractionResolutionSchema,
  value: z.unknown().optional(),
  unit: z.string().max(80).optional(),
  confidence: extractionConfidenceSchema,
  evidence: extractionEvidenceSchema.optional(),
  review_status: extractionReviewStatusSchema.default("UNREVIEWED"),
}).strict().superRefine((field, ctx) => {
  if (field.resolution === "FOUND" && field.value === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "FOUND extraction requires a value." });
  }
  if (field.resolution !== "FOUND" && field.value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unresolved extraction must not invent a value." });
  }
});

export const documentExtractionResultSchema = z.object({
  document_type: z.enum([
    "PPA",
    "LENDER_TERM_SHEET",
    "PROJECT_BUDGET",
    "ENERGY_YIELD_REPORT",
    "INTERCONNECTION_AGREEMENT",
    "EPC_CONTRACT",
  ]),
  fields: z.array(extractedFieldSchema).max(100),
}).strict();
export type DocumentExtractionResult = z.infer<typeof documentExtractionResultSchema>;

export const underwritingExplanationSchema = z.object({
  summary: z.string().max(3000),
  primary_constraint: z.string().max(1000),
  strengths: z.array(z.string().max(800)).max(10),
  risks: z.array(z.string().max(800)).max(10),
  next_actions: z.array(z.string().max(800)).max(10),
  metric_references: z.array(z.object({
    metric_key: z.string().min(1),
    display_text: z.string().max(160),
  }).strict()).max(20).default([]),
  recommendation_codes: z.array(z.string().min(1)).max(20).default([]),
}).strict();
export type UnderwritingExplanation = z.infer<typeof underwritingExplanationSchema>;

export const creditMemoSchema = z.object({
  status: z.literal("DRAFT"),
  sections: z.array(z.object({
    heading: z.string().max(120),
    body: z.string().max(8000),
  }).strict()).max(20),
  disclaimer: z.string().max(1200),
}).strict();
export type CreditMemoDraft = z.infer<typeof creditMemoSchema>;
