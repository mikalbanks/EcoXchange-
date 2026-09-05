# EcoXchange Underwriting Results Dashboard

## Purpose

The Ticket 15 dashboard is the executive underwriting view for one immutable Calculation Run and one immutable Underwriting Run.

It answers five questions:

1. How much permanent senior debt does the modeled project support?
2. How much sponsor equity remains required?
3. What financing constraint bound the debt result?
4. What financial profile and financing-readiness state did the selected underwriting policy produce?
5. Which risks, conditions, and missing information remain?

## Calculation and underwriting are separate

The dashboard intentionally preserves two authoritative records:

- **Calculation Run** — deterministic project economics, debt sizing, capital stack, returns, downside, warnings, reconciliations, and formula traces.
- **Underwriting Run** — deterministic policy evaluation of the persisted calculation plus the frozen underwriting fact snapshot.

The frontend never recalculates finance and never reruns underwriting rules. It reads the persisted Ticket 13 API resources.

A credit **FAIL** is a successfully completed underwriting assessment that does not meet the selected policy. It is not a technical application failure.

Permanent debt displayed by the dashboard is indicative model output, not a lender commitment.

## Financial Profile vs Financing Readiness

These are deliberately separate:

- **Financial Profile** reflects modeled project economics and financing structure under the selected policy.
- **Financing Readiness** reflects diligence and execution status such as offtake, engineering, interconnection, tax-credit evidence, construction readiness, insurance, and sponsor support.

A project can therefore be `ACCEPTABLE` financially while still being `DEVELOPING` from a readiness perspective.

## Dashboard hierarchy

The page is organized as:

1. historical analysis header and overall underwriting status;
2. headline permanent debt, sponsor equity, ITC proceeds, DSCR, debt/capex, constraint and cash IRR;
3. Financial Profile and Financing Readiness;
4. debt-capacity comparison and binding constraint;
5. capital stack and sources/uses reconciliation;
6. DSCR and downside summary;
7. sponsor economics;
8. policy override disclosure;
9. credit rule groups;
10. risks, conditions and missing information;
11. deterministic model warnings;
12. generic financing-channel fit and recommendations;
13. immutable analysis history and run metadata;
14. tax-credit detail.

Ticket 16 owns the 25-year annual model and full formula-trace inspection.

## Capital stack presentation

The dashboard displays only backend-supplied authoritative amounts and percentages:

- permanent senior debt;
- transferred ITC proceeds;
- sponsor equity;
- other permanent sources;
- total closing uses;
- debt / ITC / sponsor / other percentages of total uses.

The stacked visual uses persisted percentages for presentation. The text table is the accessible equivalent and remains the authoritative readable representation.

No frontend minimum, sponsor-equity calculation, or sources-and-uses equation is used to create the result.

## Binding financing constraint

The dashboard renders the backend `binding_constraint` and backend values for:

- DSCR-sized debt;
- LTC debt limit;
- final permanent debt.

Stable UI copy can explain the meaning of `DSCR` or `LTC`, but the browser never determines which constraint binds.

## Downside terminology

`ILLUSTRATIVE_PERCENT_OF_P50` is always labeled as an illustrative downside and explicitly **not** an independent-engineer P90.

`INDEPENDENT_ENGINEER_P90` is labeled Independent Engineer P90 only when that exact backend provenance is present.

Minimum downside DSCR, full repayment and interest shortfall are displayed independently. The frontend does not infer repayment from DSCR.

## Status language

Approved top-level statuses are displayed as human-readable equivalents of the backend values:

- PASS
- PASS_WITH_CONDITIONS
- REVIEW_REQUIRED
- FAIL
- INSUFFICIENT_INFORMATION
- OUT_OF_SCOPE

The UI does not use `APPROVED`, `REJECTED`, loan-commitment language, bankability scores, or funding probabilities.

## Policy overrides

When the immutable underwriting snapshot includes registered overrides, the dashboard discloses:

- field;
- original policy value;
- effective value;
- reason.

The historical policy version remains the version attached to the selected underwriting run. Current active policy does not relabel old results.

## Historical run behavior

The results route is keyed by `underwritingRunId` and loads the linked immutable calculation run.

The page does not resolve current inputs to reconstruct historical results. Current project/scenario state is loaded separately only for project identity, navigation, latest-run context, and the stale banner.

If the scenario is currently stale, the page states that project inputs have changed while preserving the old analysis.

History is sorted by completion/creation time. "Latest" means newest completed assessment, not the best credit result.

## Warnings vs underwriting findings

Calculation warnings are displayed as **Model Notes** and remain separate from:

- underwriting risks;
- underwriting conditions;
- missing information.

For example, an illustrative downside warning is not itself transformed by the frontend into a credit condition.

## Generic lender-category fit

Only Ticket 09 generic categories are rendered. No named lender recommendation is introduced in Ticket 15.

The section is labeled **Potential Financing Channel Fit**, not lender approval.

## No-frontend-calculation rule

Ticket 15 frontend code may format values for display, such as:

- decimal `0.421` → `42.1%`;
- DSCR `1.30` → `1.30x`;
- USD amount → localized currency.

It may not calculate or infer:

- generation;
- revenue;
- CFADS;
- debt capacity;
- permanent debt;
- sponsor equity;
- ITC proceeds;
- IRR;
- DSCR;
- underwriting status;
- financial profile;
- financing readiness;
- binding constraint;
- lender fit.

## Navigation

Results provide:

- Back to Inputs;
- Analysis History;
- Detailed Model route reserved for Ticket 16.

Historical results are read-only. Changes are made against current Ticket 14 inputs and require a new analysis rather than editing the old result.
