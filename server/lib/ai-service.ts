import OpenAI from "openai";

type GeminiClient = {
  models: {
    generateContent: (args: {
      model: string;
      contents: string;
      config?: { maxOutputTokens?: number; temperature?: number };
    }) => Promise<{ text: string }>;
  };
};

type AnyAIClient = OpenAI | GeminiClient | null;

export type AIProviderName = "openai" | "gemini" | "mock";

export interface AIProvider {
  provider: AIProviderName;
  client: AnyAIClient;
  modelDefaults: {
    /** Primary backend/tool-calling model family */
    primaryWorkhorse: string;
    /** Large-context technical auditing model family */
    technicalAuditing: string;
  };
  warning?: string;
}

let openAIInstance: OpenAI | null = null;
let geminiInstance: GeminiClient | null = null;
let missingKeyWarned = false;

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}

function hasGeminiKey(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

function initOpenAIClient(): OpenAI {
  if (openAIInstance) return openAIInstance;
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  openAIInstance = new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  return openAIInstance;
}

async function getGeminiClient(): Promise<GeminiClient> {
  if (geminiInstance) return geminiInstance;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");

  // Lazy dynamic import to avoid module-level initialization/crashes.
  const mod = await import("@google/genai");
  const client = new mod.GoogleGenAI({ apiKey });
  geminiInstance = client as GeminiClient;
  return geminiInstance;
}

/**
 * Multi-model router:
 * - Prefer OpenAI for primary backend/data-updating workloads.
 * - Fall back to Gemini when OpenAI is unavailable.
 * - Return mock provider if no keys exist (never crash server startup).
 */
export async function getAIProvider(): Promise<AIProvider> {
  if (hasOpenAIKey()) {
    return {
      provider: "openai",
      client: initOpenAIClient(),
      modelDefaults: {
        primaryWorkhorse: "gpt-5",
        technicalAuditing: "gpt-5",
      },
    };
  }

  if (hasGeminiKey()) {
    return {
      provider: "gemini",
      client: await getGeminiClient(),
      modelDefaults: {
        primaryWorkhorse: "gemini-2.5-pro",
        technicalAuditing: "gemini-2.5-pro",
      },
    };
  }

  if (!missingKeyWarned) {
    missingKeyWarned = true;
    console.warn(
      "[ai-service] No OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY configured. Using mock provider.",
    );
  }

  return {
    provider: "mock",
    client: null,
    modelDefaults: {
      primaryWorkhorse: "mock",
      technicalAuditing: "mock",
    },
    warning: "No AI API keys configured.",
  };
}

export async function getOpenAIOrNull(): Promise<OpenAI | null> {
  const provider = await getAIProvider();
  if (provider.provider !== "openai") return null;
  return provider.client as OpenAI;
}

export function getOpenAIClientOrThrow(): OpenAI {
  return initOpenAIClient();
}

export function getOpenAIClient(): OpenAI {
  return getOpenAIClientOrThrow();
}
