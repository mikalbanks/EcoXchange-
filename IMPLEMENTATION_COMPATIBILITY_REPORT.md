# EcoXchange Project Finance Engine — Implementation Compatibility Report

**Ticket:** CODEX TICKET 01 — Repository Audit & Implementation Compatibility Report  
**Audit branch:** `feature/project-finance-ticket01-repo-audit`  
**Base:** `feature/project-finance-engine-spec08-validation`  
**Audit posture:** Inspection/documentation only. No finance formulas, underwriting rules, database migrations, UI features, AI provider integration, dependencies, or deployment configuration were added by this ticket.

## 1. Executive Summary

**Repository compatibility: YES, WITH MINOR CHANGES.**

The Project Finance Engine fits the current EcoXchange application without a major rearchitecture. The root application is already a TypeScript modular monolith: React/Vite in the browser, Express on the server, PostgreSQL/Drizzle plus selective Supabase access, Zod validation, Vitest tests, and REST-style JSON endpoints. Those choices are compatible with SPEC 01–08 and are the right V0 runtime for 25-year annual project-finance calculations and ordinary sensitivities.

The important compatibility issue is persistence and tenancy, not compute. The legacy application still treats most product state through `MemStorage`, while some subsystems query PostgreSQL/Supabase directly. Authentication is application-session based (`express-session`) and the legacy user record has `orgName` text rather than a stable organization foreign key. Existing developer project authorization is developer-owner based (`project.developerId === req.user.id`), not organization-tenant based. Therefore SPEC 04's organization boundary must remain an isolated project-finance persistence concern until it is validated and deliberately integrated.

A second important finding is that this branch is **not actually greenfield** even though Ticket 01 says implementation status is not started. Earlier project-finance work already exists under `server/services/project-finance-engine/`, `server/routes/project-finance.ts`, `client/src/pages/developer/project-finance-underwriting.tsx`, and migrations `0015+`. This audit does not extend that implementation. Subsequent tickets should inspect and validate the existing implementation rather than create a second parallel engine.

**Recommended architectural stance:** keep the finance engine and policy engine as pure server TypeScript domain modules; keep project-finance persistence in the dedicated `project_finance` PostgreSQL schema; expose it through versioned Express APIs; use existing React Query/Wouter/Shadcn-style UI patterns; keep legacy distribution/verification modules separate; and do not introduce Python, microservices, or an LLM dependency for deterministic V0.

## 2. Baseline / Repository Inspection

### Baseline branch state

The audit branch was created directly from `feature/project-finance-engine-spec08-validation` before this report was written. The GitHub connector does not expose a local working tree, so a literal `git status` cannot be recorded from the remote-only environment. An attempted isolated local clone also could not resolve GitHub from the execution sandbox, so no user working tree was touched or overwritten. The remote branch began at the exact base commit and this report is the only Ticket 01 product-repository change.

### Repository shape observed

The repository is a multi-area monorepo-like repository with a primary root web application plus specialized engines/apps such as verification/reconciliation/dashboard components. The root app relevant to Project Finance uses:

- `client/src/` — primary React frontend.
- `server/` — Express backend, routes, services, auth/session handling, direct DB access.
- `shared/` — Drizzle schemas, shared types and validation schemas.
- `migrations/` — root SQL migration history.
- `.github/workflows/ci.yml` — repository CI.
- `verification-engine/`, `ecoxchange-reconciliation-engine/`, `ecoxchange-dashboard/` — separate specialized subsystems that should not be pulled into the V0 project-finance dependency graph.

The repository's `AGENTS.md` explicitly states that the primary app is a single-package full-stack TypeScript application (Express + React/Vite), that much product state currently uses `MemStorage`, and that existing SCADA/backtest/SGT modules should be extended rather than reimplemented where relevant.

## 3. Current Stack

| Area | Observed implementation | Project-finance recommendation |
|---|---|---|
| Language | TypeScript/JavaScript in root app; Python exists in verification subsystem | Keep V0 finance in TypeScript |
| Frontend | React 18 + Vite | Reuse |
| Client routing | Wouter | Reuse existing `/developer/...` convention |
| Client data/state | TanStack React Query plus local React state | Reuse |
| Backend | Express 5 / Node | Reuse |
| API style | REST-like JSON routes under `/api/...` | Reuse; project finance remains `/api/v1/...` |
| Validation | Zod + drizzle-zod | Reuse Zod |
| Database | PostgreSQL via `pg` + Drizzle; selective direct Supabase clients | Keep server-mediated Postgres access for finance |
| Auth | `express-session`, application user lookup, role middleware | Reuse session auth; add project-finance tenant mapping deliberately |
| Session store | PostgreSQL when healthy, memory fallback | Compatible but production persistence should be monitored |
| Package manager | npm (`package-lock.json`, `npm ci`) | Reuse |
| Build | Vite + esbuild/custom build script | Reuse |
| Tests | Vitest in root app; Pytest in verification subsystem | Finance unit/golden/API tests fit Vitest |
| UI primitives | Radix/shadcn-style components, Tailwind, Lucide | Reuse |
| Charts | Recharts | Reuse for DSCR/sensitivity/capital stack views |
| Logging | console plus JSON `audit()` helper; request IDs in root server | Extend structured fields, do not create new logging stack |
| Deployment | Node Docker image; Replit deployment config; existing cloud deployment processes elsewhere in repo | No new V0 infrastructure required |

### TypeScript/build details

Root `tsconfig.json` uses strict TypeScript, ESNext modules, ES2020 target and bundler resolution. It includes `client/src`, `shared`, `server` and `scripts`; `*.test.ts` files are excluded from root `tsc` and executed by Vitest. Path aliases are `@/*` for client and `@shared/*` for shared code.

Root Vite config builds the React application into `dist/public`. The server build produces the Node entry used by the Docker/Replit deployment.

## 4. Current Runtime Architecture / Request Lifecycle

### Normal root-app path

Observed pattern:

`React page/component`  
→ `TanStack React Query` / `apiRequest()` using cookie credentials  
→ `Express REST route`  
→ session/role middleware  
→ `storage` (`MemStorage`) **or** a direct service/Drizzle/Supabase access path  
→ result JSON  
→ React Query cache/UI.

`client/src/lib/queryClient.ts` centralizes fetch behavior and cookie credentials. `server/routes.ts` installs `express-session`, sets `req.session.userId`, provides `requireAuth` / `requireRole`, and performs the majority of application route orchestration.

Project finance should follow the cleaner variant already introduced by the project-finance branch:

`React`  
→ `/api/v1/...`  
→ route contract validation  
→ application service  
→ scenario resolver / pure finance / policy domain service  
→ repository layer  
→ project-finance PostgreSQL schema.

This is compatible with the existing application while reducing the amount of business logic in `server/routes.ts`.

## 5. Authentication and Tenancy

### Current identity

The legacy `users` table contains:

- varchar UUID-like `id`;
- email/password hash;
- role (`ADMIN`, `DEVELOPER`, `INVESTOR`);
- name;
- nullable `orgName` text;
- Persona state.

Authentication is **not Supabase Auth** in the primary root application. Login validates a locally stored password hash, then writes `session.userId`. Authorization middleware looks up the user from application storage.

### Current project ownership

Legacy `dev_projects` has `developerId`. The developer detail route explicitly checks `project.developerId === req.user.id`. This is a user-owner boundary, not an organization tenant model.

### Compatibility with SPEC 04

**Material but manageable gap:** SPEC 04 requires a stable `organization_id` tenant boundary and organization-scoped RLS. The legacy `orgName` string is not a sufficient security principal and should not be promoted into one implicitly.

Recommendation:

- Keep the new `project_finance.organizations` and `project_finance.users` mapping as a separate tenancy layer.
- Map authenticated root users to project-finance organization membership in a trusted server service.
- Never accept `organization_id` from the browser as authority.
- Do not retrofit every legacy table into organization tenancy as a prerequisite to Project Finance.
- Prove API authorization and PostgreSQL RLS independently before persistent finance routes are enabled.

## 6. Database / Supabase Audit

### Observed access patterns

There are multiple persistence patterns today:

1. `server/storage.ts` — large `MemStorage`-based application abstraction used by much of the root application.
2. `server/db.ts` — `pg.Pool` + Drizzle using `DATABASE_URL`, with managed-Postgres/Supabase TLS handling.
3. Select services create Supabase clients directly, frequently with `SUPABASE_SERVICE_ROLE_KEY` for server-only write paths.
4. Separate sub-apps have their own Supabase clients and migration histories.

This is existing technical debt, but it does not require a new architecture for Project Finance. The finance subsystem should choose one controlled server persistence path and not add a fourth pattern.

### Migration architecture

The root `migrations/` directory is already authoritative for root application SQL history and contains legacy migrations plus the staged Project Finance migration series (`0015+`). Deployment documentation also references Drizzle schema pushes/transactional guards in existing workflows, so migration ownership requires care: project-finance custom-schema SQL should not be silently replaced by a `drizzle-kit push` representation unless the schema is deliberately modeled in Drizzle.

### Supabase technical debt relevant to Project Finance

- Primary product state is not uniformly persisted through Supabase/Postgres yet.
- Service-role Supabase clients exist in server subsystems; they bypass RLS by design and therefore require application authorization.
- The primary auth model is not Supabase Auth even though SPEC 04's original conceptual model referenced `auth.users`.
- Multiple historical schemas/projects have already produced table-name collisions (`projects` vs `dev_projects`).
- Root `dev_projects` uses varchar IDs and legacy semantics incompatible with the proposed project-finance canonical project table.

**Recommendation:** retain the dedicated `project_finance` schema rather than overloading `public.dev_projects` or the reconciliation engine's physical-installation `projects` table.

## 7. Database Compatibility Matrix

| SPEC 04 entity | Existing equivalent | Classification | Recommendation |
|---|---|---|---|
| organizations | `users.orgName` only | POTENTIAL CONFLICT | Create stable project-finance organization entity; do not use orgName as key |
| users | legacy `public.users` | POTENTIAL CONFLICT | Map/reuse identity at application boundary; keep project-finance membership record separate |
| projects | `dev_projects` plus separate reconciliation `projects` | POTENTIAL CONFLICT | Keep canonical project-finance project identity in dedicated schema and link legacy ID if needed |
| project_facts | no historical fact ledger | CREATE NEW | Project-finance owned |
| project_documents | legacy `documents` metadata | EXTEND/CREATE NEW | Preserve legacy docs; project-finance document metadata needs status/provenance/storage controls |
| project_document_fields | none | CREATE NEW | Project-finance owned |
| scenarios | none equivalent | CREATE NEW | Project-finance owned |
| scenario_assumptions | none | CREATE NEW | Project-finance owned |
| underwriting_policies | none equivalent | CREATE NEW | Project-finance owned/versioned |
| policy_overrides | none | CREATE NEW | Project-finance owned |
| calculation_runs | none | CREATE NEW | Project-finance owned/immutable |
| annual cash flows | no authoritative finance schedule | CREATE NEW | Project-finance owned |
| annual debt schedules | no authoritative debt schedule | CREATE NEW | Project-finance owned |
| financing/tax/capital-stack/return/downside results | legacy `capital_stacks` is simplified and incompatible | POTENTIAL CONFLICT | New result tables; do not reuse legacy simplified capital stack as authoritative finance output |
| underwriting_runs/rules/risks/conditions/missing info | legacy readiness score/checklist are different semantics | CREATE NEW / POTENTIAL CONFLICT | Keep separate; no conversion to a single numeric readiness score |
| audit_events | JSON console `audit()` + project approval logs | EXTEND/CREATE NEW | Persist project-finance business audit records; keep operational logs separate |
| model_usage_events / ai_runs | partial staged support | CREATE/EXTEND | Keep optional/server-only |

## 8. Existing Project Model

The legacy development project model (`dev_projects`) already contains useful identity/development data:

- developer ID and optional SPV ID;
- project name;
- technology;
- stage;
- country/state/county;
- lat/long;
- capacity MW/kW;
- project status;
- offtaker type;
- interconnection/permitting/site-control status;
- PPA rate;
- monthly debt service/opex placeholders;
- validation and EIA mapping data;
- market PPA benchmark/source;
- imagery and commercial-operation metadata.

Separate tables also exist for PPAs, energy production, capital stacks, documents, readiness scores/checklists, SPVs and investor interests.

### Authority recommendation

- **Legacy project/development system remains authoritative for its existing marketplace/development workflow.**
- Project Finance should not mutate legacy `monthlyDebtService`, `ppaRate`, `financialApyPct`, or `capital_stacks` as if those are authoritative underwriting outputs.
- Where a legacy field is useful, ingest/link it into a project-finance fact with explicit provenance.
- Project Finance owns scenario assumptions, immutable calculation snapshots, debt schedules, tax-credit finance results and credit assessments.
- Distribution/ownership/verification remain downstream or adjacent product domains, not internal finance formulas.

## 9. Existing Financial Logic Audit

### `server/scoring-engine.ts`

**`computeCapitalStack(totalCapex, taxCreditEstimated)`**  
Current purpose: legacy intake/readiness helper.  
Behavior: `equityNeeded = max(totalCapex - taxCreditEstimated, 0)` and debt placeholder = zero.  
Relationship to SPEC 02: **incompatible as an authoritative capital-stack engine**. It ignores DSCR sizing, LTC, reserves, fees, debt proceeds and transferred-credit mechanics. Keep it legacy-only.

**`computeRevenue(production, ppa)`**  
Current purpose: legacy yield/distribution flow.  
Behavior: production × PPA price, then assumes operating expenses equal 15% of gross revenue.  
Relationship to SPEC 02: **incompatible** with SPEC 02's explicit Opex input/escalation. Do not reuse for underwriting CFADS.

**`computeDistribution(netRevenue, platformFeeRate)`**  
Current purpose: investor distribution calculation.  
Behavior: subtracts a platform fee and returns investor share.  
Relationship to SPEC 02: separate downstream distribution concern. Do not couple into project-finance debt sizing.

### Legacy AI ROI predictions

`server/lib/ai-predictions.ts` asks an OpenAI model to return projected revenue, IRR, payback, returns, yield and recommendations. That behavior is **not compatible with SPEC 02/07 as authoritative underwriting**. It may remain a legacy feature, but it must not be called by the Project Finance Engine. SPEC 07's provider-neutral optional explanation/extraction layer is the correct future architecture.

### Existing project-finance implementation discovered

The branch already contains a pure deterministic implementation under `server/services/project-finance-engine/core.ts`, tests/fixtures, policy logic, scenario-resolution/application/API scaffolding and a non-persistent preview route. Ticket 01 does not assess those results as “passed”; it records that they already occupy the correct architectural location and must be validated rather than duplicated.

## 10. Distribution / Ownership / Verification Boundary

EcoXchange contains substantial existing downstream economics and verification functionality, including SPV/distribution waterfall, production, verification and reconciliation modules.

Potential shared primitives:

- stable project/SPV identifiers;
- PPA/production facts;
- ownership records;
- actual operating-period financial data;
- verification evidence.

Boundary recommendation:

- Finance underwriting models expected/contracted project economics.
- Distribution logic allocates actual available proceeds to holders.
- Verification/reconciliation validates operating evidence.
- Do not import distribution waterfall logic into the deterministic debt-sizing engine.
- Future monitoring may compare actual distribution/production data to an immutable underwriting run.

## 11. Testing Architecture

### Existing root test setup

- Vitest is the root TypeScript test framework (`npm test` → `vitest run`).
- Root CI uses `npm ci`, `npm run check`, and `npm test`.
- Specialized subsystems use their own test commands (including Pytest in verification-engine).
- No dedicated browser E2E framework such as Playwright/Cypress is present in the root package dependencies observed.
- Project-finance fixtures/tests already fit naturally in `server/services/project-finance-engine/`.

Recommended finance golden-test location:

`server/services/project-finance-engine/fixtures/`  
`server/services/project-finance-engine/core.test.ts` or a focused `golden.test.ts` if separation improves readability.

Recommended DB integration test location:

`server/services/project-finance-engine/db/*.integration.test.ts` or `tests/project-finance-db/`, executed only against an explicitly disposable database.

### Baseline health-check status

Root scripts expose:

- typecheck: `npm run check`;
- tests: `npm test`;
- build: `npm run build`;
- **no root `lint` script** is defined in `package.json` (there is a specialized vocabulary check, not a general linter).

The GitHub Actions run created from the preceding Spec 08 PR attempted all CI jobs, but every job ended before executing any workflow step (`runner_id: 0`, empty steps). Therefore there is **no trustworthy pass/fail result for typecheck/tests/build from that run**. This is recorded as an infrastructure/baseline limitation, not a product failure.

No unrelated failures were fixed by this audit.

## 12. Numeric Library Audit

No dedicated decimal/financial math library such as `decimal.js`, `big.js`, `finance.js`, NumPy or SciPy is part of the root finance runtime observed. Drizzle's `decimal` type is a database column definition, not a calculation library.

Recommendation for the next finance-validation ticket: keep native JavaScript `number` unless golden/reconciliation tests demonstrate tolerance failure. The modeled values are ordinary project-finance magnitudes and current formulas do not justify introducing decimal arithmetic before evidence requires it. Database persistence should continue using PostgreSQL `numeric` for money/rates.

## 13. Validation Architecture

Zod is the established validation convention and is already used in shared schemas and project-finance API contracts. `drizzle-zod` generates schemas from legacy DB tables.

**Recommendation:** use Zod for API/input/domain shape validation. Do not introduce Yup/Joi/class-validator.

## 14. Frontend Architecture

Observed frontend conventions:

- Wouter declarative route table in `client/src/App.tsx`.
- Role-protected route wrapper.
- TanStack React Query for server state.
- local React state for page/form interactions.
- UI primitives under `client/src/components/ui/` (Radix/shadcn pattern).
- Tailwind design utilities.
- Lucide icons.
- Recharts available for project-finance charts.
- Existing developer project pages under `client/src/pages/developer/`.

### Recommended eventual project-finance route map

Fit the existing `/developer` convention rather than introduce a second top-level routing system:

- `/developer/projects` — existing developer project list.
- `/developer/projects/:id` — existing project detail/overview.
- `/developer/projects/:id/underwriting` — project underwriting workspace.
- `/developer/projects/:id/underwriting/:scenarioId` — scenario input/result workspace if URL-addressable scenarios are useful.
- `/developer/projects/:id/underwriting/compare` — scenario comparison.
- `/developer/projects/:id/underwriting/runs/:runId` — immutable historical result/detailed model.

The current `/developer/project-finance` preview route can remain a development harness until persistent project-scoped routing is validated.

## 15. API / Server Architecture

The root application already uses REST-like Express APIs, so SPEC 05's `/api/v1` design is compatible and preferable for Project Finance.

Recommendation:

- Keep `server/routes/project-finance.ts` as the versioned router entry.
- Avoid growing `server/routes.ts` with project-finance business logic.
- Keep request validation/error envelopes in project-finance API contracts.
- Application services orchestrate; repositories persist; domain modules calculate/evaluate.
- Do not expose direct browser writes to financial run tables.

## 16. Recommended Module Placement / Dependency Boundaries

### Pure finance engine

**Recommended location:**

`server/services/project-finance-engine/core.ts` and, as it grows, submodules under `server/services/project-finance-engine/finance/`.

Why: it is already server TypeScript, colocated with related domain services, testable by Vitest, and does not require creating a new top-level architecture.

Acceptance boundary must remain:

```ts
calculateProjectFinance(input) -> result
```

with no database, session, HTTP, frontend or AI construction.

### Policy engine

**Recommended location:**

`server/services/project-finance-engine/policy.ts` or `server/services/project-finance-engine/underwriting/` if split by rule family.

It should consume facts + calculation result + versioned policy and remain network/UI independent.

### Scenario resolver

**Recommended location:**

`server/services/project-finance-engine/scenario-resolver.ts`.

The pure resolution algorithm can remain independent, while a higher application service/repository loads the facts, assumptions and policy values.

### Application orchestration

**Recommended location:**

`server/services/project-finance-engine/application.ts` plus repository modules under `server/services/project-finance-engine/repositories/`.

### API

`server/routes/project-finance.ts` mounted at `/api/v1`.

### Database

Root `migrations/` using the dedicated PostgreSQL `project_finance` schema; repository access should be server-mediated.

### Frontend

`client/src/pages/developer/project-finance-*` plus reusable components under `client/src/components/project-finance/`.

### AI/document intelligence

`server/services/project-finance-engine/ai/` behind provider-neutral interfaces; optional and feature-flagged.

## 17. Documents Audit

Legacy schema includes `documents` with project ID, type, filename, file path, uploader and created timestamp. Existing developer flows can create document metadata records; CSV operational uploads use Multer separately. This is not yet the confidential project-finance document lifecycle required by SPEC 04/07.

Compatibility recommendation:

- Do not repurpose the simple legacy metadata row as the entire underwriting document system.
- Use private Supabase Storage / signed URLs for project-finance documents.
- Store document status, checksum, supersession and extraction-review metadata in the project-finance schema.
- Keep AI extraction explicit and review-gated.
- Existing file upload code can provide implementation examples for size/MIME middleware, but underwriting documents need tighter authorization and storage handling.

## 18. Existing AI Integration

Existing root AI integration is OpenAI-specific (`server/lib/ai-predictions.ts`), lazy-initialized and optional. It directly asks the model for finance-like numbers and recommendations. That is unsuitable for authoritative Project Finance under SPEC 07.

Recommendation:

- Do not reuse `generateROIPrediction()` inside the Project Finance Engine.
- Keep the staged provider-neutral `LLMProvider` abstraction under `server/services/project-finance-engine/ai/`.
- Standard underwriting must not import OpenAI/Kimi clients or require an AI key.
- If legacy AI remains elsewhere in the product, label it as separate behavior and do not allow its output into deterministic calculation snapshots.

## 19. Environment Configuration

Relevant existing variable names (names only):

- `NODE_ENV`
- `PORT`
- `SESSION_SECRET`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `PVLIB_SERVICE_URL`
- `IRRADIANCE_MCP_URL`
- `NREL_API_KEY`
- `EIA_API_KEY`
- `SOLCAST_API_KEY`
- Persona, GridStatus and Polymesh/PCP variables.

Future project-finance configuration should follow server environment conventions. `CALCULATION_ENGINE_VERSION` can either remain a code constant (preferred for reproducible builds) or be asserted against an environment deployment marker; the environment must not be able to silently change formula behavior. Future AI provider keys stay server-only and feature flags default off.

## 20. Deployment / Infrastructure Compatibility

The root app builds and runs as a normal Node service. Docker uses `npm ci`, `npm run build`, then runs `dist/index.cjs`. `.replit` similarly builds and runs the root Node app. Vite serves the browser bundle.

**V0 deterministic project finance requires no new infrastructure.** Annual 25-year modeling, IRR root solving and 5–20 point sensitivities are trivial workloads for the existing Node runtime relative to normal application/database/network work.

Future PySAM path, if required:

`TypeScript application`  
→ optional `GenerationModelService` adapter  
→ future Python/PySAM service  
→ annual generation array  
→ unchanged deterministic TypeScript finance engine.

Do not install PySAM for V0.

## 21. Security Compatibility Review

Relevant findings:

1. Legacy authentication is session/user based; project-finance organization tenancy is not yet native to the root identity model.
2. Service-role Supabase clients exist server-side. They are acceptable for trusted backend work but bypass RLS, so application authorization remains mandatory.
3. Existing developer project reads check `developerId`, which is good for legacy ownership but not equivalent to organization tenancy.
4. Legacy document metadata is not enough to establish private signed document access.
5. `.env.example` correctly warns not to expose service-role credentials in Vite variables.
6. The root global error handler currently returns a generic message object, while project-finance routes have their own structured error envelope. The finance router should keep its stricter error contract and avoid raw stack traces.
7. Project-finance financial writes should be server-mediated even if some existing sub-apps perform direct Supabase reads.

## 22. Technical Debt Classification

### BLOCKS PERSISTENT PROJECT FINANCE

- Organization tenancy is not native to legacy users/projects; the project-finance mapping/RLS layer must be validated.
- Project-finance migrations have not yet been proven from zero in a clean disposable Postgres/Supabase environment.
- Runtime RLS/immutability/staleness/atomicity tests are not yet demonstrated.
- Current CI runner execution is unavailable/failing before steps, so tests do not yet have an observed green baseline.

### SHOULD FIX / HANDLE DURING IMPLEMENTATION

- Root application has mixed persistence (`MemStorage`, Drizzle/Postgres, direct Supabase services).
- `server/routes.ts` is large; new finance behavior should stay in dedicated routes/services rather than expanding it.
- Existing legacy financial/readiness helpers use intentionally simplified formulas that must remain isolated from underwriting.
- Existing OpenAI ROI prediction is incompatible with deterministic-authoritative finance semantics and should not be reused.
- Legacy `orgName` should not be mistaken for a tenant ID.
- There is no general root lint command; CI quality gates currently rely on typecheck/tests plus subsystem checks.

### UNRELATED / DEFER

- Verification-engine internal architecture unless future monitoring consumes underwriting outputs.
- Reconciliation-engine distribution mechanics except for future actual-vs-underwritten monitoring.
- Python/PySAM implementation.
- Lender matching, marketplace integration, autonomous AI, portfolio underwriting.

## 23. SPEC 01–08 Compatibility Matrix

| Spec | Compatibility | Key issue |
|---|---|---|
| SPEC 01 Product/Scope | Compatible | Existing app supports project/developer workflow; enforce 1–20 MW contracted solar scope in project-finance boundary |
| SPEC 02 Finance Engine | Compatible | TypeScript runtime/Vitest suitable; isolate from legacy simplified finance functions |
| SPEC 03 Policy | Compatible | Pure policy module fits services layer; must not reuse numeric legacy readiness score |
| SPEC 04 Data Model | Partial | Dedicated schema is appropriate because legacy user/project semantics and tenancy differ; migrations/RLS need runtime validation |
| SPEC 05 API/Services | Compatible | Existing Express REST architecture fits modular-monolith design |
| SPEC 06 UX | Compatible | React/Wouter/React Query/Radix/Tailwind/Recharts support required UX without new framework |
| SPEC 07 AI/Documents | Partial | Existing OpenAI ROI feature is provider-specific/incompatible, but optional provider-neutral service can coexist; document security needs expansion |
| SPEC 08 Testing/Validation | Partial | Vitest and CI structure fit; disposable DB/E2E harness and functioning runner execution remain gaps |

## 24. Concrete Recommended Architecture

```text
EcoXchange root TypeScript application
│
├── client/src/
│   ├── pages/developer/                 existing developer routing
│   └── components/project-finance/      future reusable finance UI
│
├── server/
│   ├── routes/project-finance.ts        /api/v1 project-finance boundary
│   └── services/project-finance-engine/
│       ├── core.ts                      pure deterministic finance
│       ├── policy.ts                    pure deterministic underwriting policy
│       ├── scenario-resolver.ts         precedence/provenance resolution
│       ├── application.ts               orchestration
│       ├── repositories/                server DB persistence only
│       ├── ai/                          optional provider-neutral AI
│       ├── fixtures/                    golden reference cases
│       └── *.test.ts                    unit/regression/contracts
│
├── migrations/
│   └── 0015+ project_finance schema     isolated from legacy public models
│
├── shared/
│   └── only cross-boundary API/domain types that truly need client sharing
│
└── existing verification/distribution/reconciliation modules
    └── remain separate; future integrations consume immutable run IDs/results
```

## 25. Exact Proposed File Map for Future Tickets

| Concern | Recommended path |
|---|---|
| Finance domain types / calculation core | `server/services/project-finance-engine/core.ts` initially; split to `finance/` only when cohesion warrants |
| Finance validation | same domain folder, Zod/typed domain errors |
| Golden fixtures | `server/services/project-finance-engine/fixtures/` |
| Golden/unit tests | `server/services/project-finance-engine/core.test.ts` and/or `golden.test.ts` |
| Policy engine | `server/services/project-finance-engine/policy.ts` → future `underwriting/` modules |
| Policy tests | `server/services/project-finance-engine/policy.test.ts` |
| Scenario resolver | `server/services/project-finance-engine/scenario-resolver.ts` |
| Calculation/underwriting orchestration | `server/services/project-finance-engine/application.ts` |
| Persistence repositories | `server/services/project-finance-engine/repositories/` |
| API contracts | `server/services/project-finance-engine/api-contracts.ts` |
| API router | `server/routes/project-finance.ts` |
| Database migrations | root `migrations/` with `project_finance` schema |
| DB integration tests | `server/services/project-finance-engine/db/*.integration.test.ts` or dedicated `tests/project-finance-db/` |
| Underwriting page(s) | `client/src/pages/developer/project-finance-*.tsx` |
| Reusable finance components | `client/src/components/project-finance/` |
| Client API hooks | `client/src/lib/` or `client/src/hooks/` following existing React Query conventions |
| Document intelligence | `server/services/project-finance-engine/ai/` plus project-finance document repository/service |
| Specification docs | `docs/specs/project-finance/` |

## 26. Implementation Risk Notes

1. **Do not create a second engine.** Project-finance code already exists in this branch lineage. Future tickets should validate/refactor against approved specs.
2. **Do not reuse names as proof of semantic compatibility.** Legacy `capitalStacks`, PPA/revenue helpers and readiness scores have different definitions.
3. **Do not combine tenant migration with unrelated legacy persistence cleanup.** The project-finance schema can be safely isolated.
4. **Do not make Supabase Auth a hidden prerequisite.** Existing primary auth is application-session based; map it explicitly.
5. **Do not expose service-role keys to the browser or rely on RLS when using service role.** Use both server authorization and RLS for user-context paths.
6. **Do not allow migration tooling to rewrite the dedicated schema accidentally.** Establish whether root Drizzle metadata will model or intentionally ignore it before production deployment.
7. **Do not allow legacy AI prediction code into finance truth production.**

## 27. Ticket 02+ Order Recommendation

The conceptual order from SPEC 08 remains correct for a greenfield build:

1. Finance domain types/validation.
2. Generation/revenue/opex/CFADS.
3. Debt sizing/sculpting.
4. ITC/reserves/sources & uses.
5. Returns/downside/sensitivities.
6. Golden validation.

However, **the repository already contains these areas**. Therefore the next work should not blindly implement Ticket 02 from scratch. Ticket 02 should be interpreted as a bounded **compatibility/validation pass over the existing finance domain types and validation schemas**, followed by the later tickets only where gaps are demonstrated by tests. The hard milestone remains the golden 1/5/20 MW finance validation before persistence-backed UX expansion.

## 28. Ticket 01 Completion Statement

**TICKET 01 — COMPLETE**

**Repository compatibility:** YES, WITH MINOR CHANGES  
**Primary stack:** TypeScript; React 18 + Vite/Wouter/React Query frontend; Express 5 Node backend; PostgreSQL via pg/Drizzle with selective Supabase clients; Zod; Vitest; Tailwind/Radix-style UI; Recharts  
**Recommended finance-engine location:** `server/services/project-finance-engine/` (pure domain core; no DB/network/UI/AI dependencies)  
**Recommended policy-engine location:** `server/services/project-finance-engine/policy.ts` / future `underwriting/` submodules  
**Database approach:** dedicated `project_finance` PostgreSQL schema, server-mediated repositories, explicit mapping from session user to organization membership, RLS as defense-in-depth  
**Existing finance logic found:** legacy simplified capital-stack/revenue/distribution helpers; legacy OpenAI ROI prediction; plus already-existing staged deterministic Project Finance implementation in this branch lineage  
**Material conflicts:** legacy user/project model lacks stable organization tenancy; mixed persistence patterns; legacy simplified financial/readiness logic must not be reused as underwriting truth; legacy AI finance prediction violates SPEC 07 authority boundary  
**Pre-existing test/build failures:** no trustworthy baseline execution available from the most recent CI because jobs failed before acquiring/executing runner steps; root has no general lint script. No finance failure is inferred from that infrastructure result.  
**Files changed by Ticket 01:** `IMPLEMENTATION_COMPATIBILITY_REPORT.md` only  
**Product functionality added:** None.  
**Ready for Ticket 02:** YES, but as validation of the existing implementation rather than a duplicate greenfield implementation.  
**Ticket 02 recommendation:** inspect the existing `ProjectFinanceInputs`/result/domain error/validation contracts against SPEC 02 and Ticket 02; add or correct only missing type/validation behavior, run focused tests, and stop before adding new formulas that belong to Ticket 03.
