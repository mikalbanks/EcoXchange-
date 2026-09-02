import crypto from "node:crypto";
import { z } from "zod";
import {
  AIServiceError,
  type AIBudget,
  type CostEstimate,
  type DocumentExtractionResult,
  type LLMProvider,
  type ProviderGeneration,
  type UnderwritingExplanation,
  documentExtractionResultSchema,
  underwritingExplanationSchema,
} from "./contracts";
import { DEFAULT_AI_BUDGETS, PROMPTS } from "./prompts";

export interface AIFeatureFlags {
  documentExtraction: boolean;
  underwritingExplanation: boolean;
  creditMemoGeneration: boolean;
}

export const DEFAULT_AI_FEATURE_FLAGS: AIFeatureFlags = Object.freeze({
  documentExtraction: false,
  underwritingExplanation: false,
  creditMemoGeneration: false,
});

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  }
  return value;
}

export function hashAIInput(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export function enforceBudget(provider: LLMProvider, estimate: CostEstimate, budget: AIBudget): void {
  if (estimate.estimatedInputTokens > budget.maxInputTokens) {
    throw new AIServiceError("AI_CONTEXT_TOO_LARGE", "AI input exceeds the configured token budget.", {
      estimatedInputTokens: estimate.estimatedInputTokens,
      maxInputTokens: budget.maxInputTokens,
    });
  }
  if (estimate.estimatedOutputTokens > budget.maxOutputTokens) {
    throw new AIServiceError("AI_CONTEXT_TOO_LARGE", "AI output budget exceeds the configured token ceiling.", {
      estimatedOutputTokens: estimate.estimatedOutputTokens,
      maxOutputTokens: budget.maxOutputTokens,
    });
  }
  const cost = provider.estimateCost(
    estimate.estimatedInputTokens,
    estimate.estimatedOutputTokens,
    estimate.estimatedCachedInputTokens,
  );
  if (cost > budget.maxEstimatedCostUsd + 1e-12) {
    throw new AIServiceError("AI_COST_LIMIT_EXCEEDED", "AI request exceeds the configured cost limit.", {
      estimatedCostUsd: cost,
      maxEstimatedCostUsd: budget.maxEstimatedCostUsd,
    });
  }
}

export function redactObviousSecrets(text: string): string {
  return text
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(password\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, "$1[REDACTED]");
}

export function estimateWithProvider(
  provider: LLMProvider,
  input: unknown,
  maxOutputTokens: number,
  cachedInputTokens = 0,
): CostEstimate {
  const estimatedInputTokens = provider.estimateTokens
    ? provider.estimateTokens(input)
    : Math.ceil(JSON.stringify(input).length / 4);
  return {
    estimatedInputTokens,
    estimatedOutputTokens: maxOutputTokens,
    estimatedCachedInputTokens: cachedInputTokens,
    estimatedCostUsd: provider.estimateCost(estimatedInputTokens, maxOutputTokens, cachedInputTokens),
  };
}

export async function runStructuredAI<T>(args: {
  provider: LLMProvider;
  model: string;
  schema: z.ZodType<T>;
  prompt: { code: string; version: string; system: string };
  input: unknown;
  budget: AIBudget;
  operation: "DOCUMENT_EXTRACTION" | "UNDERWRITING_EXPLANATION" | "CREDIT_MEMO";
  cacheKey?: string;
}): Promise<ProviderGeneration<T>> {
  const estimate = estimateWithProvider(args.provider, args.input, args.budget.maxOutputTokens);
  enforceBudget(args.provider, estimate, args.budget);

  const generated = await args.provider.generateStructured({
    operation: args.operation,
    model: args.model,
    prompt: { code: args.prompt.code, version: args.prompt.version },
    system: args.prompt.system,
    input: args.input,
    outputSchema: args.schema,
    budget: args.budget,
    cacheKey: args.cacheKey,
    temperature: 0,
  });

  const parsed = args.schema.safeParse(generated.output);
  if (!parsed.success) {
    throw new AIServiceError("AI_OUTPUT_SCHEMA_INVALID", "AI output failed strict schema validation.", {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  return { ...generated, output: parsed.data };
}

export interface DocumentExtractionRequest {
  documentType: DocumentExtractionResult["document_type"];
  requestedFields: string[];
  sanitizedText: string;
  documentChecksum: string;
}

export async function extractDocumentFields(args: {
  enabled: boolean;
  provider: LLMProvider;
  model: string;
  request: DocumentExtractionRequest;
}): Promise<ProviderGeneration<DocumentExtractionResult>> {
  if (!args.enabled) throw new AIServiceError("AI_FEATURE_DISABLED", "AI document extraction is disabled.");
  const prompt = args.request.documentType === "LENDER_TERM_SHEET"
    ? PROMPTS.TERM_SHEET_EXTRACTION
    : PROMPTS.PPA_EXTRACTION;
  const input = {
    document_type: args.request.documentType,
    requested_fields: [...args.request.requestedFields].sort(),
    document_text: redactObviousSecrets(args.request.sanitizedText),
  };
  const cacheKey = hashAIInput({
    checksum: args.request.documentChecksum,
    prompt: `${prompt.code}:${prompt.version}`,
    provider: args.provider.id,
    model: args.model,
    fields: input.requested_fields,
  });
  return runStructuredAI({
    provider: args.provider,
    model: args.model,
    schema: documentExtractionResultSchema,
    prompt,
    input,
    budget: DEFAULT_AI_BUDGETS.DOCUMENT_EXTRACTION,
    operation: "DOCUMENT_EXTRACTION",
    cacheKey,
  });
}

export interface ExplanationTruthContext {
  metrics: Record<string, number | string | boolean | null>;
  policyThresholds: Record<string, number | string | boolean | null>;
  recommendationCodes: string[];
  facts: Record<string, unknown>;
  risks: unknown[];
  conditions: unknown[];
}

export function validateExplanationAgainstTruth(
  explanation: UnderwritingExplanation,
  truth: ExplanationTruthContext,
): void {
  for (const ref of explanation.metric_references) {
    if (!(ref.metric_key in truth.metrics)) {
      throw new AIServiceError("AI_OUTPUT_CONTRADICTS_TRUTH", "AI explanation referenced an unknown metric.", {
        metricKey: ref.metric_key,
      });
    }
    if (!Object.is(ref.metric_value, truth.metrics[ref.metric_key])) {
      throw new AIServiceError("AI_OUTPUT_CONTRADICTS_TRUTH", "AI explanation changed a deterministic metric value.", {
        metricKey: ref.metric_key,
        supplied: truth.metrics[ref.metric_key],
        generated: ref.metric_value,
      });
    }
  }
  const allowedRecommendations = new Set(truth.recommendationCodes);
  for (const code of explanation.recommendation_codes) {
    if (!allowedRecommendations.has(code)) {
      throw new AIServiceError("AI_OUTPUT_CONTRADICTS_TRUTH", "AI explanation invented an underwriting recommendation.", {
        recommendationCode: code,
      });
    }
  }
}

export async function explainUnderwriting(args: {
  enabled: boolean;
  provider: LLMProvider;
  model: string;
  truth: ExplanationTruthContext;
}): Promise<ProviderGeneration<UnderwritingExplanation>> {
  if (!args.enabled) throw new AIServiceError("AI_FEATURE_DISABLED", "AI underwriting explanation is disabled.");
  const input = {
    metrics: args.truth.metrics,
    policy_thresholds: args.truth.policyThresholds,
    recommendation_codes: args.truth.recommendationCodes,
    facts: args.truth.facts,
    risks: args.truth.risks,
    conditions: args.truth.conditions,
  };
  const cacheKey = hashAIInput({
    prompt: `${PROMPTS.UNDERWRITING_EXPLANATION.code}:${PROMPTS.UNDERWRITING_EXPLANATION.version}`,
    provider: args.provider.id,
    model: args.model,
    input,
  });
  const result = await runStructuredAI({
    provider: args.provider,
    model: args.model,
    schema: underwritingExplanationSchema,
    prompt: PROMPTS.UNDERWRITING_EXPLANATION,
    input,
    budget: DEFAULT_AI_BUDGETS.UNDERWRITING_EXPLANATION,
    operation: "UNDERWRITING_EXPLANATION",
    cacheKey,
  });
  validateExplanationAgainstTruth(result.output, args.truth);
  return result;
}
