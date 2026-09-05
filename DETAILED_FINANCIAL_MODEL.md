# Detailed Financial Model & Formula Trace

## Purpose

Ticket 16 provides the read-only audit layer behind the underwriting results dashboard. It answers: exactly which immutable inputs and persisted financial outputs produced a selected calculation result?

**The Detailed Model displays authoritative persisted calculation outputs. It does not recreate the financial model in the browser.**

**Formula Trace explains which approved formula and dependencies produced a metric; it is not AI reasoning.**

## Route

`/developer/project-finance/projects/:projectId/scenarios/:scenarioId/model/:calculationRunId`

The route is bound to one immutable `calculation_run_id`. It never resolves the current scenario and never calls `/calculate` or `/analyze` merely to render the page.

## Data source

The screen uses Ticket 13 `GET /api/v1/calculation-runs/{runId}` plus project/scenario identity reads. The calculation-run response already exposes:

- immutable `input_snapshot_json` with `finance_input`, provenance, policy context and resolver version;
- annual project cash-flow rows;
- annual debt schedule rows;
- financing result;
- tax-credit result;
- capital-stack result;
- return result;
- downside result;
- downside cash-sweep rows;
- reconciliation result;
- deterministic calculation warnings;
- persisted metric/formula traces.

No database access occurs from the browser.

## Page sections

1. Calculation Run Header and historical context
2. Input Snapshot
3. Operating Model
4. Debt Model
5. Sources & Uses / Capital Stack
6. Tax Credit Detail
7. Sponsor Cash Flows & Returns
8. Downside Analysis and Cash Sweep
9. Formula Trace
10. Calculation Warnings
11. Calculation Metadata

The tables are semantic and read-only. No spreadsheet editing is provided.

## Immutable-run behavior

Current project facts or scenario assumptions may change after a calculation. Those edits do not change this page. If the scenario is stale or a newer calculation exists, the page labels the selected run as historical and continues displaying the exact stored snapshot/result.

Only `SUCCESS` runs expose authoritative model tables. Failed/running records show execution state rather than partial finance output.

## Input snapshot and provenance

Inputs are grouped from the frozen Ticket 10 snapshot and include the stored value plus, where available:

- unit;
- resolution source;
- verification state;
- whether a policy default supplied the value;
- whether a registered policy override supplied the value;
- override reason.

A scenario assumption is never displayed as if it modified the underlying project fact.

## Annual operating model

The annual table displays persisted values only:

- Year;
- Generation MWh;
- PPA Price USD/MWh;
- Revenue;
- Operating Costs;
- CFADS;
- Sponsor Operating Cash Flow.

The frontend does not calculate capacity-factor generation, degradation, PPA escalation, revenue, opex escalation or CFADS. Zero post-PPA revenue and negative CFADS are displayed exactly as persisted.

## Debt model

The debt section displays the persisted sizing summary and annual debt schedule:

- DSCR-sized debt;
- LTC debt limit;
- final permanent debt;
- binding constraint;
- resolved interest rate;
- resolved target DSCR;
- amortization;
- maturity;
- balloon balance;
- annual opening balance, interest, principal, debt service, ending balance and DSCR;
- backend-defined minimum DSCR and year.

The browser does not call `min()`, scan the schedule for minimum DSCR, sculpt debt, or decide whether a balloon creates a credit issue.

## Sources & uses

The sources/uses tables use persisted Ticket 11 results. Sponsor equity and capital-stack percentages are never recomputed client-side. Reconciliation status is displayed from the persisted reconciliation record. A failed reconciliation is treated as a data-integrity state rather than normal results.

## Tax-credit detail

The section displays persisted eligible basis, modeled ITC rate, face value, transfer price, gross proceeds, transaction costs and net proceeds. Optional simplified sponsor tax value is shown only when the frozen calculation input has the tax module enabled.

Tax-credit values are modeled assumptions and do not constitute tax advice or confirmation of eligibility.

## Sponsor returns

Cash-only sponsor IRR remains separate from simplified after-tax sponsor IRR. The UI displays persisted solver status and preserves null values as unavailable rather than converting them to zero.

Sponsor operating cash flows are read from the annual persisted rows. The frontend does not reconstruct a Year-0 signed cash-flow array or run an IRR solver.

## Downside and cash sweep

The screen displays the persisted downside type, provenance, multiplier if applicable, minimum downside DSCR/year, repayment result, unrepaid balance, interest shortfall and cash-sweep schedule.

`ILLUSTRATIVE_PERCENT_OF_P50` is always labeled as an illustrative 90%-of-P50 case and explicitly **not** an independent-engineer P90. `INDEPENDENT_ENGINEER_P90` is used only when backend provenance says so.

The cash-sweep helper text documents the approved methodology but does not execute it in the browser.

## Formula Trace

Each persisted trace can show:

- metric key;
- persisted metric value;
- actual backend formula ID;
- stable human-readable formula description where known;
- symbolic documentation where useful;
- persisted dependency list;
- persisted trace metadata.

Known descriptions are presentation templates only. They are not executable formulas. Historical engines may not contain every trace; the UI shows an unavailable state rather than reconstructing one.

Dependency links point to related persisted traces or frozen input fields where possible.

## Warning separation

`Calculation Warnings` are Ticket 11 deterministic finance-engine/model warnings. They remain separate from Ticket 15 underwriting risks and conditions. The frontend does not reclassify warning severity.

## Numeric handling

Values remain authoritative API values. Presentation may round money, percent, DSCR and MWh for readability. Null is rendered as unavailable/dash and is not converted to zero. Formula trace metadata retains the raw persisted payload.

## Accessibility and responsiveness

- semantic tables with captions and column headers;
- keyboard-accessible section links and native trace `details/summary` controls;
- text status in addition to icons/color;
- horizontal table scrolling on small screens where the detailed model legitimately requires width;
- no chart-only presentation is required in Ticket 16.

## Explicit non-goals

Ticket 16 adds no:

- frontend finance formulas;
- underwriting rule execution;
- hard-coded underwriting thresholds;
- direct Supabase/database access;
- scenario comparison;
- sensitivity controls;
- AI calls;
- PDF/Excel reporting engine;
- database schema changes.
