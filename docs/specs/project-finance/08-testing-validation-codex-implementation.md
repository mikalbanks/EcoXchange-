# SPEC 08 — Testing, Validation & Codex Implementation Specification

Status: Draft v0.1
Dependencies: SPEC 01 through SPEC 07
Primary implementation target: Codex-driven implementation against the existing EcoXchange codebase
Primary objective: Convert the approved product, financial, underwriting, persistence, API, UX, and AI specifications into controlled work packages with measurable acceptance criteria.

## Governing rule

Codex may implement approved behavior. It must not invent financial formulas, underwriting thresholds, tax-credit assumptions, unsupported asset behavior, persistence semantics, or AI authority that is absent from the approved specifications.

If specifications materially conflict, implementation stops. The conflict must be identified by specification/section, options proposed, and a human decision obtained before behavior changes.

Priority for behavioral conflicts:
1. Most recent explicit user-approved change.
2. SPEC 02 for financial mathematics.
3. SPEC 03 for underwriting policy.
4. SPEC 04 for persistence.
5. SPEC 05 for service/API boundaries.
6. SPEC 06 for UX behavior.
7. SPEC 07 for AI behavior.
8. SPEC 01 for general scope.

## Work-package sequence

1. Repository compatibility audit.
2. Shared finance domain types and validation.
3. Generation, revenue, opex, and CFADS.
4. Debt sizing and sculpting.
5. ITC, reserves, sources and uses.
6. Returns, downside, cash sweep, and sensitivities.
7. Immutable golden-reference suite for 1 MW, 5 MW, and 20 MW.
8. Database migrations and tenant controls.
9. Versioned underwriting-policy rules.
10. Scenario resolver.
11. Calculation service.
12. Underwriting service.
13. Versioned API routes.
14. Project/input UI.
15. Results UI.
16. Detailed-model UI and formula traces.
17. Scenarios and sensitivities.
18. Audit/history/staleness UX.
19. End-to-end validation only; no new feature work.
20. Optional AI scaffolding only after deterministic acceptance.

Each ticket must state OBJECTIVE, FILES TO INSPECT, GOVERNING SPECS, IMPLEMENTATION REQUIREMENTS, NON-GOALS, TESTS REQUIRED, ACCEPTANCE CRITERIA, and STOP CONDITIONS. Each ticket checkpoint reports files changed, behavior implemented, tests added, tests actually executed, known gaps, and spec deviations.

## Golden financial gates

The permanent fixtures are REFERENCE_SOLAR_1MW, REFERENCE_SOLAR_5MW, and REFERENCE_SOLAR_20MW. Fixture expectations are tests, never runtime constants.

Reference 1 MW: 1 MW, $1.90M capex, 24% P50 capacity factor, 0.5% degradation, $55/MWh year-1 PPA, 1% PPA escalation, 25-year life, $38K year-1 opex, 2.5% opex escalation, 30% ITC, 95% eligible basis, 0.92 transfer price, 1.30x target DSCR, 7.25% debt rate, 15-year amortization, 65% LTC. Expected approximately: $0.517M permanent debt, 27.2% debt/capex, $0.498M ITC proceeds, $77.6K year-1 CFADS.

Reference 5 MW: 5 MW, $8.00M capex, same operating assumptions, $150K year-1 opex, 6.50% debt rate, 18-year amortization, 70% LTC. Expected approximately: $3.364M permanent debt, 42.1% debt/capex, $2.280M ITC face, $2.098M ITC proceeds, $428.2K year-1 CFADS, $329.4K year-1 debt service, $164.7K DSRA. Binding constraint: DSCR.

Reference 20 MW: 20 MW, $29.00M capex, same operating assumptions, $480K year-1 opex, 5.80% debt rate, 20-year amortization, 70% LTC. Expected approximately: $16.296M permanent debt, 56.2% debt/capex, $7.604M ITC proceeds, $1.833M year-1 CFADS, $1.410M year-1 debt service.

Initial tolerances: simple arithmetic <=0.01%; debt <=0.25%; DSRA <=0.25%; sponsor equity <=0.25%; IRR <=10 bps. Tolerances must not be loosened merely to make a failing implementation pass.

Golden failure process: print expected, actual, and variance; trace the first material divergence; stop downstream feature work until resolved. No frontend build is accepted while the three reference cases fail.

## Finance-engine gates

Every approved formula receives direct tests, including generation, degradation, PPA escalation, contracted revenue, opex escalation, CFADS, allowable debt service, DSCR debt capacity, LTC, permanent debt, debt sculpting, DSRA, ITC eligible basis/face/transfer proceeds, sponsor equity, and sponsor cash IRR.

Debt schedules must satisfy final balance <= $1 and opening debt minus total principal minus final balance <= $1. Negative amortization may not be hidden by increasing debt balances. LTC-binding and DSCR-binding cases must both be tested. Downside uses the base debt schedule and must not resize debt. Cash-sweep full-repayment and non-repayment cases are required. Every V0 sensitivity must rerun the full deterministic engine.

Runtime reconciliation outside tolerance is fatal: the run fails rather than presenting a warning as a valid result.

## Policy gates

Each material SPEC 03 rule requires pass, fail, missing-data, and boundary tests where meaningful. 1.29x versus a 1.30x DSCR requirement fails; 1.30x and 1.31x pass. Independent-engineer P90 with full repayment passes; illustrative downside with repayment remains INDICATIVE_PASS; missing downside creates a condition/incomplete assessment; failed downside repayment is a critical failure.

Critical failures cannot be averaged away. Unsupported technologies and merchant structures must not inherit contracted-solar policy. Policy/calculation mismatch is a critical error unless a registered override explains the difference. Policy behavior changes require a new policy version.

## Persistence and security gates

All migrations must rebuild from an empty non-production PostgreSQL/Supabase environment without manual edits. Required tests include foreign keys, immutable completed runs, fact supersession, scenario staleness, historical reproducibility, policy-version reproducibility, result completeness, and Organization A versus Organization B RLS isolation.

No production migration is applied until the clean reset/rebuild and RLS suite passes. Destructive changes require an impact assessment and migration strategy. Completed financial and underwriting history is not physically mutated through normal product flows.

## API and integration gates

Versioned APIs must enforce authentication and server-derived organization authorization. Errors use the standard structured envelope and never expose raw stack traces. `/analyze` must execute resolve -> calculate -> persist -> underwrite -> persist and return both immutable run IDs. Idempotency, calculation caching by input hash + engine version, and underwriting invalidation by policy version must be tested.

The UI never owns authoritative finance formulas. Frontend results must equal server results. Historical results render from persisted output without recalculation.

## UX gates

The first-result hierarchy is permanent debt, debt/capex, binding constraint, sponsor equity, ITC proceeds, and credit status. The 5 MW case must explicitly show DSCR-sized debt below the 70% LTC ceiling and explain that LTC is a maximum rather than an entitlement.

Missing underwriting information is distinct from failed financial rules. Changing assumptions makes prior analysis stale rather than mutating it. Historical runs are read-only. Scenario comparison does not declare a generic BEST scenario. Accessibility includes labels, keyboard operation, status text independent of color, and accessible errors.

## AI gates

V0 deterministic release requires all AI feature flags OFF and must pass with no LLM credentials. AI scaffolding may not become a release dependency. Before any extraction pilot: strict schema validation, evidence linking, prompt-injection tests, human review, cost blocking, provider-outage fallback, no automatic fact overwrite, and numerical/recommendation truth validation must all pass.

## CI and regression requirements

Every project-finance PR must run root type checking and tests plus a focused project-finance suite. Any finance-engine change runs all three golden fixtures. Any policy change runs the complete policy suite. Any database change runs schema/migration and historical-integrity tests. Material finance bugs receive permanent regression tests.

Formula behavior changes require a new formula version, calculation-engine version increment, updated tests, preserved historical runs, and documented rationale. Policy behavior changes require a new policy version.

PRs do not merge when golden finance tests, financial reconciliation, RLS isolation, policy tests, type checks, or critical integration tests fail.

## Defect severity

P0: wrong financial amount/result presented as valid or cross-tenant disclosure. Disable affected path immediately.
P1: material underwriting conclusion wrong, such as failed downside shown as pass.
P2: important workflow failure while financial outputs remain correct.
P3: cosmetic/non-material UX defect.

## Release progression

0.1.0 internal deterministic alpha: manual inputs + deterministic calculations + policy + results, no AI.
0.2.0 internal UX alpha: scenario comparison, sensitivities, audit/history, improved readiness.
0.3.0 project pilot: real-project validation and calibration.
0.4.0 candidate: PPA/term-sheet extraction experiment if justified.
0.5.0 external pilot.
1.0.0 only after meaningful technical and commercial validation.

Controlled pilot gate: all three reference cases pass; schedules reconcile; policy/version/provenance/history controls work; tenant isolation passes; unsupported scope is blocked; zero-AI flow passes; no known P0/P1 defects; and at least one real project completes end-to-end. External accuracy claims remain `Indicative underwriting` until lender-calibrated.

## Real-project validation

For 3–10 pilot projects where possible, compare EcoXchange against sponsor models and lender quotes across CFADS, debt capacity, DSCR, tenor, sponsor equity, tax-credit assumptions, and major conditions. Record variance and explanation. Do not tune base policy merely to mimic one lender; preserve lender-specific terms as overrides or future verified lender profiles.

## Final Codex instruction block

DO:
- Follow approved specifications.
- Preserve deterministic finance logic.
- Add and execute tests before declaring completion.
- Reconcile financial outputs.
- Preserve history and provenance.
- Report ambiguity and contradictions.

DO NOT:
- Invent finance formulas or lender policy.
- Make AI authoritative.
- Move authoritative finance math into frontend code.
- Hard-code golden outputs.
- Modify historical results.
- Expand V0 scope without approval.
- Hide or relabel failed tests.

Target architecture remains: project data -> fact/assumption resolution -> deterministic finance engine -> reconciled financial results -> versioned underwriting policy -> traceable credit assessment -> project-finance UX -> optional AI assistance -> future capital-markets workflow.