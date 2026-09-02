# ECOXCHANGE PROJECT FINANCE ENGINE
## SPEC 05 — API & SERVICE ARCHITECTURE

Status: Draft v0.1  
Dependencies: Specs 01–04  
V0: U.S. contracted solar PV, 1–20 MW  
AI dependency: none

## Architectural contract

EcoXchange Project Finance is a modular monolith. The browser talks only to versioned server APIs for authoritative project-finance operations. Server application services orchestrate domain services and repositories. The deterministic finance engine never knows about HTTP, sessions, Supabase, documents, or an LLM. The underwriting engine consumes project facts, a completed calculation result, and an explicit policy.

Dependency direction:

`UI -> API -> application services -> domain services -> repositories/database`

Authoritative finance is always server-side. The frontend may format and preview UX state but must not persist client-computed DSCR, debt capacity, IRR, reserves, ITC, or sponsor equity as authoritative results.

## V0 services

- ProjectService: stable project identity and append/supersede facts.
- ScenarioService: scenarios, assumptions, duplication, staleness, overrides.
- PolicyService: load/version/resolve immutable underwriting policy values.
- ScenarioResolver: facts + scenario assumptions + policy defaults + overrides -> complete resolved input with provenance.
- CalculationService: resolve, validate, hash/cache, execute Spec 02, reconcile, persist atomically.
- UnderwritingService: consume completed Spec 02 output + facts + policy and execute Spec 03.
- SensitivityService: clone inputs and call the same finance engine for approved variables.
- DocumentService: secure metadata/storage; no automatic fact acceptance in V0.
- ReportingService: render stored successful runs; never invisibly recalculate.
- AIService: future provider-neutral boundary only; zero calls on normal V0 underwriting.

## API namespace

All new contracts are `/api/v1/...`. Non-public endpoints require authenticated server context. Organization authority is derived server-side, never trusted from a request body.

Initial route surface:

- `GET /api/v1/policies/active`
- `POST /api/v1/calculations/preview`
- `POST /api/v1/scenarios/:scenarioId/calculate`
- `POST /api/v1/calculation-runs/:runId/underwrite`
- `POST /api/v1/scenarios/:scenarioId/analyze`
- read endpoints for calculation summaries, cash flows, debt schedules, metric traces, and scenario comparisons.

Persistence-backed mutation routes remain gated until Spec 04 migrations are validated in a non-production database.

## Scenario resolution precedence

1. Explicit scenario value / registered override.
2. Linked verified project fact.
3. Linked project fact.
4. Applicable underwriting-policy default.
5. Missing.

The resolver answers only which value is used and why. It performs no finance math.

## Deterministic preview

`POST /api/v1/calculations/preview` is permitted for unsaved form UX. It invokes the exact Spec 02 engine and returns `persisted: false`. Preview results can never be referenced as a formal underwriting run.

## Errors

Domain errors use a consistent envelope:

```json
{
  "error": {
    "code": "MISSING_REQUIRED_INPUT",
    "message": "Project capex is required.",
    "details": {"field": "project_capex"},
    "request_id": "..."
  }
}
```

Expected status mapping: 400 malformed input, 401 unauthenticated, 403 unauthorized, 404 missing resource, 409 conflict/staleness/idempotency conflict, 422 domain validation, 500 unexpected failure.

## Idempotency and caching

Persisted calculation cache key: normalized resolved input + calculation-engine version. Underwriting cache key additionally includes the calculation run, policy/version, and underwriting-input hash. `force_recalculate` creates a new historical run even for identical deterministic inputs.

## Security and confidentiality

RLS and server authorization are both required. Financial writes are server mediated. Service-role credentials are never exposed to clients. Private project documents use authenticated/signed access. Logs contain IDs, hashes, versions, durations, and events—not full confidential contracts or full finance payloads.

## Implementation rule

Business logic not defined by Specs 01–05 must not be invented. Formula conflicts defer to Spec 02; policy conflicts defer to Spec 03; persistence conflicts defer to Spec 04; this document controls only service/API organization.
