# EcoXchange Project Finance API v1

## Purpose

`/api/v1` is the authenticated application boundary for the deterministic EcoXchange Project Finance Engine. Route handlers validate shape, derive tenant context from the existing Express session, call Ticket 10–12 services, and serialize authoritative results. They do not calculate finance or execute credit rules.

The normal sponsor workflow is:

`Scenario -> POST /api/v1/scenarios/{scenarioId}/analyze -> CalculationService -> immutable Calculation Run -> UnderwritingService -> immutable Underwriting Run`.

`/analyze` is not one opaque model call. Calculation and underwriting remain two separate persisted records.

## Authentication and tenant isolation

Every route requires the existing session `userId`. The server looks up `public.users.organization_id`; client-supplied organization IDs are never authorization. All project-finance queries are additionally tenant-scoped, and PostgreSQL RLS remains defense in depth.

Cross-tenant resource IDs are treated as unavailable within the authorized tenant. No successful calculation or underwriting mutation/delete routes are exposed.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/projects` | List tenant projects |
| POST | `/api/v1/projects` | Create stable project identity |
| GET/PATCH | `/api/v1/projects/{projectId}` | Read/update project metadata |
| POST | `/api/v1/projects/{projectId}/archive` | Archive without destroying history |
| GET/POST | `/api/v1/projects/{projectId}/facts` | Read facts / append a current fact |
| POST | `/api/v1/projects/{projectId}/facts/{factId}/supersede` | Append replacement while retaining history |
| GET/POST | `/api/v1/projects/{projectId}/scenarios` | List/create scenarios |
| GET/PATCH | `/api/v1/scenarios/{scenarioId}` | Read/update scenario metadata |
| GET/PUT | `/api/v1/scenarios/{scenarioId}/assumptions` | Read/upsert non-policy-controlled scenario assumptions |
| POST | `/api/v1/scenarios/{scenarioId}/policy-overrides` | Register a version-bound policy override |
| GET | `/api/v1/scenarios/{scenarioId}/resolved-input` | Ticket 10 resolution/provenance preview; no calculation |
| POST | `/api/v1/scenarios/{scenarioId}/calculate` | Ticket 11 only |
| POST | `/api/v1/calculation-runs/{runId}/underwrite` | Ticket 12 only; supports readiness-only re-underwriting |
| POST | `/api/v1/scenarios/{scenarioId}/analyze` | Calculate current scenario, then underwrite that exact run |
| GET | `/api/v1/calculation-runs/{runId}` | Immutable calculation detail |
| GET | `/api/v1/scenarios/{scenarioId}/calculation-runs` | Calculation history, newest first |
| GET | `/api/v1/underwriting-runs/{runId}` | Immutable underwriting detail |
| GET | `/api/v1/scenarios/{scenarioId}/underwriting-runs` | Underwriting history, newest first |
| GET | `/api/v1/projects/{projectId}/scenario-comparison` | Persisted scenario comparison read model |
| GET | `/api/v1/underwriting-policies` | Read-only versioned policy discovery |

Persisted sensitivity write APIs are deferred because Ticket 06 has deterministic in-memory sensitivity logic but no production sensitivity orchestration service yet.

## Analyze semantics

`POST /api/v1/scenarios/{id}/analyze` first invokes Ticket 11. Only after a successful calculation run exists does it invoke Ticket 12 using that exact `calculation_run_id`.

If calculation fails, underwriting is not invoked. If calculation succeeds but underwriting has a technical failure, the API returns the underwriting error with `calculation_run_id` in error details; the successful calculation remains valid and may later be retried with `/calculation-runs/{id}/underwrite`.

A credit conclusion of `FAIL`, `INSUFFICIENT_INFORMATION`, or policy-level `OUT_OF_SCOPE` is a successfully executed assessment and therefore returns normal HTTP success when Ticket 12 completed successfully. It is not a server failure.

## Status separation

Three states are intentionally distinct:

- Calculation execution: `PENDING | RUNNING | SUCCESS | FAILED`
- Underwriting execution: `PENDING | RUNNING | SUCCESS | FAILED`
- Underwriting conclusion: `PASS | PASS_WITH_CONDITIONS | REVIEW_REQUIRED | FAIL | INSUFFICIENT_INFORMATION | OUT_OF_SCOPE`

A credit `FAIL` can accompany HTTP 200 and `underwriting.execution_status = SUCCESS`.

## Idempotency

`Idempotency-Key` is accepted by calculate, underwrite, and analyze. Analyze namespaces the supplied key into separate calculation and underwriting keys so each service preserves its own idempotency semantics. Reusing a key for materially different service input returns `409 IDEMPOTENCY_KEY_CONFLICT`.

## Response and error envelopes

Success:

```json
{ "data": {}, "meta": {} }
```

Error:

```json
{
  "error": {
    "code": "CALCULATION_INPUT_INCOMPLETE",
    "message": "Scenario does not resolve to a complete ProjectFinanceInput.",
    "details": { "missing_fields": [] }
  }
}
```

Known domain/application errors retain their stable Ticket 10–12 codes. Request-shape errors are `400`; unauthorized access is `401/403`; tenant-scoped absence is `404`; stale/idempotency/policy conflicts are generally `409`; complete but unprocessable calculation input is `422`; unexpected engine/persistence failures are `500`. Stack traces and raw SQL errors are not returned.

## Numeric conventions

- Money: USD numeric values
- Rates/percentages: decimal (`0.30` = 30%, `0.065` = 6.5%)
- DSCR: ratio (`1.30`)
- Capacity: MW AC
- Energy: MWh
- PPA: USD/MWh

The authoritative application engine uses JavaScript numeric calculation outputs; persistence uses PostgreSQL `NUMERIC`. API DTOs return raw numeric/domain values rather than formatted `$3.36M` strings. Null remains null for unavailable IRR, NPV, or DSCR rather than becoming zero.

## Provenance

The resolved-input endpoint exposes Ticket 10 structured provenance including resolution source, source record, source strength/verification status, policy-default use, override use and override reason. A calculation assumption may be usable while still unverified for underwriting.

## Terminology and scope

Responses use `permanent debt`, `sponsor equity`, `financial profile`, `financing readiness`, and `INDICATIVE_UNDERWRITING`. They never use `approved loan amount` or lender-approval language.

`ILLUSTRATIVE_PERCENT_OF_P50` remains explicitly illustrative and is never renamed to `P90`. Permanent senior debt remains distinct from any temporary construction or ITC bridge concept. Lender-fit outputs contain generic categories only, never named institutions.

Standard disclaimer: **Preliminary lender-style decision support; subject to lender, legal, tax, and engineering diligence.**

## Re-underwriting

Readiness-only fact changes may create a new underwriting run against an existing current calculation. Finance-affecting changes require a new Ticket 11 calculation first; Ticket 12 returns `CALCULATION_STALE` when the old financial run is no longer current.

## Immutable history

Historical calculation and underwriting detail endpoints return persisted records. There are deliberately no PATCH or DELETE endpoints for successful finance or underwriting runs. Current facts do not rewrite historical run snapshots.
