# EcoXchange Project & Underwriting Input Workspace

Ticket 14 implements the sponsor-facing input workflow for the Project Finance Engine. The workspace is a guided project-finance analyst workbook. It is not a spreadsheet clone, lender-approval portal, or chatbot.

## Routes

- `/developer/project-finance` — project-finance projects landing page
- `/developer/project-finance/projects` — projects list
- `/developer/project-finance/projects/new` — lightweight project creation
- `/developer/project-finance/projects/:projectId` — project overview and scenarios
- `/developer/project-finance/projects/:projectId/scenarios/:scenarioId/inputs` — primary underwriting input workspace
- `/developer/project-finance/projects/:projectId/scenarios/:scenarioId/results/:underwritingRunId` — Ticket 14 result handoff only; Ticket 15 owns the full results dashboard
- `/developer/project-finance/preview` — legacy non-persistent preview retained for comparison/migration only

## Authoritative boundary

All project-finance execution uses the Ticket 13 `/api/v1` API. The browser never computes generation, revenue, CFADS, debt sizing, DSCR, ITC proceeds, sponsor equity, IRR, or underwriting status. It only formats values, validates ordinary form syntax, converts explicit percentage display values to decimal API values, and organizes backend-provided state.

`Run Underwriting` calls `POST /api/v1/scenarios/{scenarioId}/analyze`. The browser does not separately orchestrate calculation and underwriting.

## Fact vs scenario editing

Project facts and scenario assumptions have deliberately different write paths.

- **Edit project fact** writes through `/api/v1/projects/{projectId}/facts`. Ticket 14 creates ordinary user-supplied facts as `USER_ASSERTION` / `UNVERIFIED`; it cannot self-assert backend verification.
- **Use different value in this scenario** writes through `/api/v1/scenarios/{scenarioId}/assumptions` and remains scenario-specific.
- Project identity such as technology, country, state, capacity, development state, and revenue structure stays on the project identity model where the Ticket 13 contract defines it.

A scenario value never rewrites the underlying project fact.

## Provenance

The resolved-input endpoint is authoritative for finance-field provenance. `SourceBadge` maps structured resolver source enums into display labels:

- `VERIFIED_PROJECT_FACT` / `PROJECT_FACT` → Fact
- `DOCUMENT_FACT` → Document
- `USER_ASSERTION` → User Provided
- `SCENARIO_ASSUMPTION` → Custom Scenario
- `POLICY_DEFAULT` → EcoXchange Assumption
- `POLICY_OVERRIDE` → Override
- `LENDER_QUOTE` → Lender Quote

Source details expose verification state, policy value where applicable, and override reason. Labels are derived from provenance enums, not from the numeric value itself.

## Policy defaults and overrides

Policy-controlled finance fields are not ordinary editable text fields. The workspace shows the effective value and its source, then requires the explicit **Override policy value** interaction.

The override form requires:

1. original/effective policy value display;
2. new scenario-only value;
3. reason;
4. selected immutable policy version.

Saving the override calls the Ticket 13 policy-override endpoint. The UI explicitly states that the scenario override does not modify EcoXchange's policy.

Reset-to-policy is deferred because Ticket 13 currently exposes append-only override creation but no explicit safe override supersession/reset contract. The UI does not fake reset by silently replacing history.

## Missing data

Finance-critical missing fields come directly from Ticket 10 resolved-input `missing_fields`. These control whether `Run Underwriting` can be initiated.

Readiness fields are shown separately from finance-critical fields. Readiness selections are current underwriting facts such as PPA status, offtaker credit, independent engineer status, interconnection, EPC, permits, site control, O&M, insurance, tax-credit evidence, and sponsor support. Unknown readiness facts do **not** automatically disable analysis because Ticket 12 can legitimately return conditions or `INSUFFICIENT_INFORMATION`.

The readiness list is an input/data-availability registry only. It contains no credit thresholds or frontend underwriting decisions.

## V0 model scope

The UI repeats the backend product boundary before users invest time in data entry:

- U.S.
- Solar PV
- 1–20 MW AC
- Fully contracted revenue

Unsupported projects can remain stored if the backend permits it, but Ticket 14 does not pretend they can be analyzed by the validated V0 contracted-solar model.

## Downside terminology

When the scenario uses an illustrative percentage-of-P50 downside, the workspace displays:

> Illustrative downside only — not an independent-engineer P90.

`INDEPENDENT_ENGINEER_P90` is shown distinctly when that provenance exists. A percentage value is never relabeled as lender-grade P90 merely because it is 90% of P50.

## Stale scenarios and history

A `STALE` scenario shows a persistent banner explaining that inputs changed after the last calculation. Prior persisted runs remain historical and are not deleted or rewritten. Running the current scenario creates new authoritative history through Ticket 13.

Ticket 14 does not infer whether readiness-only changes can reuse an old calculation. The primary UX remains `Run Underwriting` through `/analyze`; specialized re-underwriting can be surfaced later when the backend provides an explicit safe action state.

## Save-before-analyze behavior

Input field changes are saved explicitly/immediately through the API. The workspace tracks pending writes and disables authoritative analysis while a save is in flight. After successful fact, assumption, or override writes, project facts, scenario state, and resolved-input queries are invalidated/refetched so provenance and readiness reflect the server state before analysis.

## Execution outcomes

A successful HTTP analysis is navigated to the result handoff regardless of whether the credit conclusion is `PASS`, `PASS_WITH_CONDITIONS`, `REVIEW_REQUIRED`, `FAIL`, `INSUFFICIENT_INFORMATION`, or `OUT_OF_SCOPE`. A credit `FAIL` is not shown as a technical execution error.

If calculation succeeds but underwriting fails technically, Ticket 13 may return `calculation_run_id` in the structured error. The workspace tells the user that the financial calculation survived and preserves the run ID for retry/recovery.

## Numeric conventions

- Money: raw USD domain value, displayed as currency
- PPA: USD/MWh
- Capacity: MW AC
- Energy: MWh
- Percentages: displayed as percent, explicitly converted to/from decimal API representation
- DSCR: ratio displayed with `x`, e.g. `1.30x`

No formatted strings are submitted as authoritative financial values.

## Security

The frontend sends no service-role credential and performs no direct privileged database writes. Tenant authorization remains the server/API responsibility. User-entered names, facts, and override reasons render through normal React text escaping; no raw HTML rendering is used.
