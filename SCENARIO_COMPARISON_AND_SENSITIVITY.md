# Scenario Comparison & Sensitivity Analysis

## Purpose

Ticket 17 turns the immutable single-scenario Project Finance Engine into a deterministic decision workspace. It adds two distinct product concepts:

- **Scenario comparison** compares already-calculated, persisted project scenarios such as Base Case, Custom Case, and Lender Case.
- **Sensitivity analysis** clones one immutable Base Calculation input, changes exactly one approved variable, reruns the full deterministic finance engine, and persists each point as a child Calculation Run.

These concepts are intentionally separate. A sensitivity point does not mutate or become a project scenario.

## Authoritative rule

**A sensitivity point is a complete deterministic rerun of the Project Finance Engine with one approved input changed. It is not an interpolation of the Base Case result.**

The browser does not calculate generation, revenue, CFADS, debt capacity, sponsor equity, DSCR, IRR, binding constraint, ITC proceeds, or downside repayment. The frontend displays persisted results returned by the API.

## Supported variables

V0 exposes only the Ticket 06 registry:

- `PPA_PRICE`
- `INTEREST_RATE`
- `PROJECT_CAPEX`
- `CAPACITY_FACTOR`
- `ITC_RATE`

No arbitrary executable sensitivity field is accepted.

## Full-rerun behavior

The service starts from `calculation_runs.input_snapshot_json.finance_input`, validates it as a Ticket 02 `ProjectFinanceInput`, clones it, changes one approved field, then calls the same `calculateProjectFinanceCore()` engine used by ordinary calculations.

Expected mechanical behavior remains Ticket 06 behavior:

- PPA price reruns revenue, CFADS, debt sizing, schedule, DSRA, fee, sponsor equity, returns, and downside.
- Interest rate leaves operating CFADS unchanged but reruns debt sizing/schedule and downstream financing/returns.
- Project capex leaves operating CFADS unchanged while rerunning LTC, ITC basis/proceeds, closing uses, sponsor equity, and any debt change caused by LTC becoming binding.
- Capacity factor reruns production, revenue, CFADS, debt, equity, returns, and downside.
- ITC rate reruns ITC proceeds, sponsor equity, and tax/return values while permanent senior debt remains invariant when operating and debt assumptions are unchanged.

If the Base Calculation uses an explicit annual generation profile, `CAPACITY_FACTOR` sensitivity returns `SENSITIVITY_NOT_APPLICABLE` rather than overwriting that profile.

## Base-run reproduction

The service automatically includes the immutable Base input as a sensitivity point. Before persistence, the Base rerun result hash must exactly match the Base Calculation Run result hash. A mismatch raises `SENSITIVITY_BASE_MISMATCH` and no sensitivity run is committed.

For `ITC_RATE`, the service additionally checks the permanent-debt invariance required by Ticket 06. A violation raises `SENSITIVITY_INVARIANT_FAILED`.

## Persistence and history

Ticket 08 already defined:

- `sensitivity_runs`
- `sensitivity_points`
- `base_calculation_run_id`
- `child_calculation_run_id`

Ticket 17 uses those tables without a schema migration.

A sensitivity run and every child Calculation Run are committed in one PostgreSQL transaction. Child calculations are written while `RUNNING`, their normalized financial rows are inserted, and then the child run is finalized to `SUCCESS`. This preserves Ticket 08 successful-run immutability without changing the scenario's `latest_calculation_run_id`.

The Base Scenario is not mutated. Historical sensitivity runs remain tied to their original `base_calculation_run_id` even after the scenario is later recalculated.

## Child input provenance

Each child snapshot preserves the Base snapshot and replaces only the changed field with provenance equivalent to:

- `resolution_source = SENSITIVITY_ENGINE`
- `source_record_type = SENSITIVITY_POINT`
- Base Calculation Run ID
- Base value
- sensitivity variable
- sensitivity input value

This makes every point drillable through Ticket 16.

## Stale behavior

A new sensitivity cannot be started when the selected scenario is `STALE`. The user must first create a current calculation through the Ticket 11/13 workflow. Historical sensitivity runs remain readable.

## Scenario comparison

The comparison page uses the Ticket 13 scenario-comparison read model plus the exact immutable Calculation Runs and available completed Underwriting Runs. Opening comparison is GET/read-only and does not calculate.

It supports 2–4 scenarios and displays:

- Permanent Senior Debt
- Debt / Capex
- Sponsor Equity and sponsor-equity share
- Net ITC proceeds
- Minimum P50 DSCR
- Cash-Only Sponsor IRR
- Binding Constraint
- Overall underwriting status where available
- resolved inputs and their provenance

If selected runs use different policy or calculation-engine versions, the page discloses that difference rather than pretending they are perfectly comparable.

## Financeability Margin

**Financeability Margin presents individual financial and policy dimensions. EcoXchange does not combine them into an opaque bankability score.**

The V0 panel displays authoritative Base-run values such as:

- minimum P50 DSCR alongside the effective target DSCR;
- Debt / Capex alongside the effective maximum LTC;
- persisted sponsor-equity share;
- downside DSCR, repayment, and provenance;
- current binding constraint.

The frontend does not subtract these values to create an authoritative headroom score when the backend has not explicitly persisted a headroom metric.

**Higher ITC proceeds reduce sponsor-equity requirements but do not increase permanent senior debt when project operating cash flow and debt assumptions are unchanged.**

## API

Ticket 17 adds only the sensitivity routes Ticket 13 intentionally deferred:

- `POST /api/v1/scenarios/:scenarioId/sensitivities`
- `GET /api/v1/scenarios/:scenarioId/sensitivity-runs`
- `GET /api/v1/sensitivity-runs/:runId`

The existing `GET /api/v1/projects/:projectId/scenario-comparison` remains the scenario comparison read boundary.

No direct browser database access is introduced.

## UI execution behavior

Sensitivity values are discrete candidate inputs. Results are produced only after the explicit **Run Sensitivity** action. Slider movement or editing point values never creates fake live financial results.

The chart connects only calculated points. The result table remains the text/table equivalent and each point links to the exact Ticket 16 Detailed Model route using its `child_calculation_run_id`.

## Explicit exclusions

Ticket 17 does not add:

- Monte Carlo or stochastic simulation;
- probability of funding;
- weighted bankability score;
- named-lender logic;
- underwriting-rule execution for each sensitivity point;
- AI interpretation;
- finance formulas in the frontend;
- finance formula changes in the backend.

## Validation status

The implementation remains stacked behind Tickets 07–16. GitHub Actions has repeatedly created jobs without allocating a runner or executing steps, so no regression/test/build suite is claimed as passing until executable validation actually occurs.
