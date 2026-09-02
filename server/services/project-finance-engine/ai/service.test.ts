import { describe, expect, it, vi } from "vitest";
import type {
  LLMProvider,
  ProviderGeneration,
  StructuredGenerationRequest,
  TextGenerationRequest,
} from "./contracts";
import {
  AIServiceError,
  documentExtractionResultSchema,
} from "./contracts";
import {
  DEFAULT_AI_FEATURE_FLAGS,
  enforceBudget,
  extractDocumentFields,
  hashAIInput,
  redactObviousSecrets,
  validateExplanationAgainstTruth,
} from "./service";
import { DEFAULT_AI_BUDGETS, PROMPTS } from "./prompts";

class FakeProvider implements LLMProvider {
  readonly id = "fake";
  public structuredCalls = 0;
  public nextOutput: unknown = {
    document_type: "PPA",
    fields: [],
  };

  estimateCost(inputTokens: number, outputTokens: number): number {
    return inputTokens * 0.000001 + outputTokens * 0.000001;
  }

  estimateTokens(input: unknown): number {
    return Math.ceil(JSON.stringify(input).length / 4);
  }

  async generateStructured<T>(_request: StructuredGenerationRequest<T>): Promise<ProviderGeneration<T>> {
    this.structuredCalls += 1;
    return {
      output: this.nextOutput as T,
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20, estimatedCostUsd: 0.00012 },
    };
  }

  async generateText(_request: TextGenerationRequest): Promise<ProviderGeneration<string>> {
    throw new Error("not used");
  }
}

describe("Spec 07 AI boundaries", () => {
  it("keeps every AI feature disabled by default", () => {
    expect(DEFAULT_AI_FEATURE_FLAGS).toEqual({
      documentExtraction: false,
      underwritingExplanation: false,
      creditMemoGeneration: false,
    });
  });

  it("blocks disabled extraction before any provider call", async () => {
    const provider = new FakeProvider();
    await expect(extractDocumentFields({
      enabled: false,
      provider,
      model: "cheap-model",
      request: {
        documentType: "PPA",
        requestedFields: ["ppa_price_year_1_per_mwh"],
        sanitizedText: "Price is $58/MWh",
        documentChecksum: "abc",
      },
    })).rejects.toMatchObject({ code: "AI_FEATURE_DISABLED" });
    expect(provider.structuredCalls).toBe(0);
  });

  it("blocks cost overruns before provider execution", () => {
    const provider = new FakeProvider();
    expect(() => enforceBudget(provider, {
      estimatedInputTokens: 30_000,
      estimatedOutputTokens: 1_500,
      estimatedCachedInputTokens: 0,
      estimatedCostUsd: 0.0315,
    }, {
      ...DEFAULT_AI_BUDGETS.DOCUMENT_EXTRACTION,
      maxEstimatedCostUsd: 0.01,
    })).toThrowError(AIServiceError);
  });

  it("requires NOT_FOUND instead of fabricated values for unresolved extraction", () => {
    expect(documentExtractionResultSchema.safeParse({
      document_type: "PPA",
      fields: [{
        field_key: "ppa_escalation_rate",
        resolution: "NOT_FOUND",
        value: 0,
        confidence: "LOW",
        review_status: "UNREVIEWED",
      }],
    }).success).toBe(false);
  });

  it("leaves valid extracted fields unreviewed", () => {
    const parsed = documentExtractionResultSchema.parse({
      document_type: "PPA",
      fields: [{
        field_key: "ppa_price_year_1_per_mwh",
        resolution: "FOUND",
        value: 58,
        unit: "USD_PER_MWH",
        confidence: "HIGH",
        evidence: { page: 14, quote: "$58 per MWh" },
      }],
    });
    expect(parsed.fields[0].review_status).toBe("UNREVIEWED");
  });

  it("uses stable hashes independent of object-key order", () => {
    expect(hashAIInput({ b: 2, a: 1 })).toBe(hashAIInput({ a: 1, b: 2 }));
  });

  it("redacts obvious credentials before provider context is built", () => {
    const redacted = redactObviousSecrets("api_key=secret123 password=hunter2 Authorization: Bearer token.value");
    expect(redacted).not.toContain("secret123");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("token.value");
  });

  it("prompt registry explicitly treats document instructions as untrusted", () => {
    expect(PROMPTS.PPA_EXTRACTION.system.toLowerCase()).toContain("untrusted");
    expect(PROMPTS.PPA_EXTRACTION.system).toContain("NOT_FOUND");
  });

  it("rejects numerical hallucinations in underwriting explanations", () => {
    expect(() => validateExplanationAgainstTruth({
      summary: "Debt is about $4.1 million.",
      primary_constraint: "DSCR",
      strengths: [],
      risks: [],
      next_actions: [],
      metric_references: [{
        metric_key: "permanent_debt",
        metric_value: 4_100_000,
        display_text: "$4.1 million",
      }],
      recommendation_codes: [],
    }, {
      metrics: { permanent_debt: 3_364_000 },
      policyThresholds: { target_dscr: 1.30 },
      recommendationCodes: [],
      facts: {},
      risks: [],
      conditions: [],
    })).toThrowError(AIServiceError);
  });

  it("rejects recommendation codes not produced by deterministic underwriting", () => {
    expect(() => validateExplanationAgainstTruth({
      summary: "Summary",
      primary_constraint: "DSCR",
      strengths: [],
      risks: [],
      next_actions: [],
      metric_references: [],
      recommendation_codes: ["INVENTED_MEZZANINE_STRUCTURE"],
    }, {
      metrics: {},
      policyThresholds: {},
      recommendationCodes: ["PORTFOLIO_AGGREGATION_RECOMMENDED"],
      facts: {},
      risks: [],
      conditions: [],
    })).toThrowError(AIServiceError);
  });
});
