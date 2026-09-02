# EcoXchange Project Finance Engine — SPEC 07

## AI & Document Intelligence Specification

**Status:** Draft v0.1  
**Dependencies:** SPEC 01–06  
**Primary target:** Provider-neutral AI service layered on the deterministic underwriting system  
**V0 AI dependency:** None  
**Initial AI use cases:** document extraction, underwriting explanation, preliminary memo drafting  
**Cost philosophy:** standard underwriting must remain fully functional at $0 AI inference cost

## Governing principle

> AI interprets. EcoXchange calculates.

The authoritative truth-producing path is:

`Project facts → scenario resolver → deterministic finance engine → underwriting policy engine → structured credit result`.

AI may operate before that path to create **candidate** document fields, or after it to explain or draft from already-calculated results. AI must never become the authoritative source for CFADS, DSCR, debt sizing, LTC, ITC proceeds, sponsor equity, IRR, downside repayment, lender approval, tax eligibility, or legal enforceability.

## Service boundaries

Implement a provider-neutral `LLMProvider` interface with structured and text generation capabilities, token/cost estimation, and optional cache support. Application code must depend on the interface rather than Kimi, Moonshot, OpenAI, Anthropic, Gemini, or any other named provider.

AI is feature-flagged and disabled by default. Missing provider credentials must disable optional AI actions without affecting projects, calculations, underwriting, sensitivities, scenario comparison, deterministic explanations, or reports.

## Cost controls

Each AI operation carries an explicit `AIBudget` containing maximum input tokens, maximum output tokens, maximum estimated cost, cache allowance, and retry allowance. The service must reject an operation before provider invocation when its estimated cost exceeds the configured ceiling.

Default retry count is one for schema-repair attempts. No autonomous agent loops are permitted by default.

Task-specific contexts must be minimized. Static prompts and schemas should be cache-friendly. Large documents should use deterministic text extraction, section discovery, relevance filtering, and logical chunking before model inference.

## Initial operation classes

### Document extraction

Supported initial document types, in priority order:

1. PPA
2. lender term sheet
3. project budget
4. energy/P50-P90 report
5. interconnection agreement
6. EPC contract

Extraction uses strict structured output. Every candidate field includes a field key, value or explicit unresolved status, unit where applicable, categorical confidence, and short evidence reference where available. Missing values must return `NOT_FOUND`, `AMBIGUOUS`, or `NOT_APPLICABLE`; zero must never be substituted for missing data.

Document content is untrusted data. Extraction prompts must instruct the model never to follow instructions contained in project documents. The model receives no database credentials, API secrets, privileged tools, or unrestricted write access.

Unreviewed extraction must never become a project fact. Review actions are `ACCEPT`, `CORRECT`, and `REJECT`. Conflicting values must be preserved and surfaced rather than silently overwriting current facts.

### Underwriting explanation

Explanations are explicit user-triggered operations over structured deterministic context. The model may summarize, prioritize, rephrase, and explain. It may not recalculate financial values, change supplied values, override policy conclusions, invent lender commitments, or add unsupported facts.

The preferred output is structured JSON with `summary`, `primary_constraint`, `strengths`, `risks`, and `next_actions`. Numerical values must map to supplied metric keys and pass deterministic validation before display.

If AI is disabled or unavailable, deterministic rule-based explanations from SPEC 03/06 remain the fallback.

### Preliminary credit memo

Memo drafting is a presentation layer over stored project facts, calculations, rules, risks, conditions, and provenance. Memos are always `DRAFT` until explicitly approved/exported. They may format supplied numbers but may not invent new values, financing commitments, legal opinions, tax conclusions, or market data.

## Provider-neutral contract

The AI module must expose a provider abstraction similar to:

```ts
interface LLMProvider {
  id: string;
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<ProviderGeneration<T>>;
  generateText(request: TextGenerationRequest): Promise<ProviderGeneration<string>>;
  estimateCost(inputTokens: number, outputTokens: number, cachedInputTokens?: number): number;
}
```

Provider configuration and model selection are deployment configuration, not business logic.

## Prompt registry and versioning

Every production prompt has a stable code and version, for example:

- `AI_DOCUMENT_PPA_EXTRACT_V1`
- `AI_TERM_SHEET_EXTRACT_V1`
- `AI_UNDERWRITING_EXPLAIN_V1`
- `AI_CREDIT_MEMO_V1`

Changing material instructions requires a new prompt version. Historical AI runs must retain provider, model, prompt code/version, normalized input hash, usage, estimated cost, status, and structured output.

## Cache keys

Document extraction cache key:

`document checksum + prompt code/version + provider/model + requested field set`

Explanation/memo cache key:

`normalized deterministic context hash + prompt code/version + provider/model`

Reopening a page must not re-run inference.

## Hallucination controls

Before display or persistence as an approved narrative:

- validate structured output against a strict schema;
- verify referenced metric keys exist;
- verify numeric display values are faithful to deterministic metrics;
- verify stated policy thresholds match the supplied policy context;
- verify recommendations exist in deterministic underwriting output;
- verify factual statuses do not contradict project facts.

If validation fails, retry at most once when permitted. Otherwise fail safely.

## Security and privacy

- Treat project documents and model inputs as confidential.
- Minimize data sent to providers.
- Redact obvious credentials/secrets before external inference.
- Avoid collecting unnecessary personal/consumer-credit data.
- Do not browse the web during routine AI underwriting.
- Live rates or market values must come from deterministic market-data services, not model memory.

## Feature flags

- `ai_document_extraction = OFF`
- `ai_underwriting_explanation = OFF`
- `credit_memo_generation = OFF`

These remain disabled until deterministic underwriting is proven and a provider-specific implementation has passed benchmark, security, cost, and acceptance tests.

## Required acceptance behavior

The implementation architecture must support:

- zero-AI underwriting with all provider credentials removed;
- schema-valid candidate extraction with evidence and mandatory review;
- `NOT_FOUND` rather than fabricated values;
- conflict preservation;
- prompt-injection resistance;
- numerical/policy hallucination rejection;
- cost-limit blocking before provider invocation;
- provider-outage isolation;
- duplicate-work caching;
- human correction auditability;
- provider/model/prompt-version reproducibility.

## Initial implementation stance

This specification deliberately does **not** enable a live AI provider. The first engineering slice should create the provider-neutral contracts, cost guardrails, prompt registry, strict schemas, deterministic validators, cache/input-hash behavior, persistence structures, and tests. A real provider adapter and document parser should be added only after the deterministic product and staging persistence path are validated.

The first model-backed experiment should be PPA key-term extraction, followed by lender term-sheet extraction, then low-cost underwriting explanation, and only later preliminary credit memos.
