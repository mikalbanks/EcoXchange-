# EcoXchange Project Finance Engine — Implementation Compatibility Report

Date: 2026-09-02
Branch audited: `feature/project-finance-engine-spec07-ai`
Purpose: SPEC 08 Phase A repository audit and implementation checkpoint.

## Existing application architecture

- Root application: full-stack TypeScript modular monolith.
- Server: Express 5, Node/TypeScript, served from `server/index.ts` / `server/routes.ts`.
- Frontend: React 18 + Vite, Wouter routing, TanStack Query.
- Validation: Zod is already installed and used.
- Component system: existing reusable UI primitives under `client/src/components/ui`.
- Database: PostgreSQL/Supabase dependencies exist, but legacy root application persistence still includes in-memory `MemStorage` behavior and direct DB paths for selected modules.
- Authentication: existing session/auth middleware and protected frontend routes.
- Test framework: Vitest at root; CI also runs Python verification-engine and separate dashboard/reconciliation packages.
- CI: `.github/workflows/ci.yml` already runs root `npm run check` and `npm test` on pull requests.
- Deployment: single root application process serving API and Vite/static assets; repository also contains separate dashboard/verification/reconciliation packages that must not be destabilized by project-finance work.

## Compatibility with SPEC 05

The existing stack is compatible with the required modular-monolith architecture. No microservice rewrite is necessary. The project-finance domain can remain an isolated server module invoked by versioned Express routes, with React consuming server-authoritative results.

The least-disruptive persistence path is the dedicated `project_finance` PostgreSQL schema introduced by SPEC 04 migrations rather than trying to reuse incompatible legacy `public.projects`/`public.users` tables.

## Existing project-finance implementation checkpoint

Work is already beyond a fresh Ticket 01/Ticket 02 state:

- Deterministic finance core exists at `server/services/project-finance-engine/core.ts`.
- Golden fixtures exist for 1 MW, 5 MW, and 20 MW.
- Finance regression tests cover benchmark CFADS, debt sizing, LTC/DSCR binding, debt reconciliation, transferred ITC, DSRA, sponsor equity, downside, sensitivities, guarded IRR, and deterministic repeat behavior.
- Versioned underwriting policy exists at `policy.ts` with policy tests.
- Scenario-resolution service exists.
- SPEC 04 migrations are present as an incremental `0015`–`0025` series in a dedicated `project_finance` schema.
- API/service architecture exists, including non-persistent preview routes.
- A protected first underwriting frontend exists and uses server-side calculation rather than React financial formulas.
- Provider-neutral AI scaffolding exists but feature flags are disabled and no live provider is required.

Therefore SPEC 08 should not restart implementation from zero. It should convert the existing work into gated validation, repair missing acceptance coverage, and only then complete persistence-backed endpoints and UX.

## Current hard gates / known gaps

1. **Canonical SPEC 02 markdown is absent from `docs/specs/project-finance/`.** The implemented finance core and golden tests exist, but repository governance should eventually include the approved SPEC 02 source document rather than reconstructing it from code. Do not invent or rewrite that specification from memory merely to fill the filename.
2. **SPEC 04 migrations have not yet passed a clean non-production PostgreSQL/Supabase reset + RLS integration test.** SQL contract tests alone are not sufficient.
3. **Persistence-backed `/calculate`, `/underwrite`, `/analyze`, history, comparison, and sensitivity APIs remain gated on database validation.**
4. **The first SPEC 06 UI is primarily a non-persistent preview.** It is not the final saved-project/scenario workflow.
5. **Root `npm run check` has documented pre-existing TypeScript errors in unrelated legacy modules.** Project-finance changes must not add new type errors, but the repository needs a deliberate baseline/repair plan before a strict whole-repo type-check merge gate can be treated as clean.
6. **Project-finance tests have been authored, but this checkpoint must use CI execution rather than assuming they pass.** No test should be reported as passed until a runner confirms it.
7. **RLS, historical reproducibility, failure atomicity, and cross-tenant integration tests require a real test database.** Current schema-contract tests inspect SQL text and do not prove runtime database behavior.
8. **No real-project pilot comparison has occurred yet.** Output must remain `Indicative underwriting`.

## Minimal migration path from current state

1. Freeze financial behavior and run focused finance/policy/architecture/AI contract tests in CI.
2. Resolve any finance/policy failures before touching broader UI.
3. Build a disposable/staging Postgres/Supabase test environment and apply migrations `0015`–`0025` from zero.
4. Add runtime database tests for tenancy, immutability, staleness, fact supersession, run completeness, and policy reproducibility.
5. Implement repository adapters against the validated `project_finance` schema.
6. Wire persistence-backed calculation and underwriting services.
7. Expose `/calculate`, `/underwrite`, `/analyze`, history, comparison, trace, and sensitivity routes.
8. Upgrade the frontend from preview to saved projects/scenarios/history using those APIs.
9. Run the 5 MW browser golden journey and historical-integrity E2E.
10. Begin real-project pilot validation only after no P0/P1 defects remain.
11. Keep all AI flags off until deterministic pilot validation; then test PPA extraction as the first AI experiment.

## Phase A conclusion

No architecture rewrite is required. The correct next engineering work is validation and persistence integration, not rebuilding the deterministic finance engine or adding more product scope.