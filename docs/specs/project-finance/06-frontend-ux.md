# ECOXCHANGE PROJECT FINANCE ENGINE — SPEC 06 — FRONTEND / UX

Status: Draft v0.1

Dependencies: Specs 01–05

Primary implementation target: existing EcoXchange web application.

V0 scope: U.S. fully contracted solar PV, 1–20 MW. AI dependency: none.

## Product principle

The underwriting interface must show not only the modeled result but also what drove it, which inputs are facts versus assumptions, what information is missing, which credit conditions remain, and how every headline metric can be traced to deterministic calculations.

The primary user journey is:

Create project → enter/verify facts → review EcoXchange assumptions → run underwriting → understand debt capacity and sponsor equity → inspect risks/conditions → test scenarios and sensitivities → inspect calculation trace.

## V0 information hierarchy

1. Indicative permanent debt.
2. Binding constraint.
3. Sponsor equity and transferable ITC proceeds.
4. Financial profile and financing readiness.
5. Conditions and risks.
6. Scenario/sensitivity implications.
7. Detailed cash flow, debt schedule and formula trace.

## Core V0 screens

- Projects.
- Project overview.
- Underwriting inputs.
- Underwriting results.
- Scenario comparison.
- Detailed model (cash flow / debt schedule / sources & uses).

## Input UX

Inputs are grouped into Project, Production, Revenue, Operating Costs, Tax Credits, Debt, Downside Case and Project Readiness. Material values display a provenance badge: FACT, DOCUMENT, ASSUMPTION, LENDER QUOTE or CUSTOM. Policy overrides preserve and display both the EcoXchange default and the scenario value.

The UI distinguishes calculation-required fields from underwriting-required fields. Missing calculation-critical inputs block the run; missing lender-readiness information allows the financial model to run but produces a conditional assessment.

## Results UX

The result hero prioritizes indicative permanent debt, debt/capex, binding constraint, sponsor equity, ITC proceeds and minimum DSCR. A dedicated constraint card explains whether project cash flow/DSCR or LTC is binding. The debt-capacity comparison shows DSCR-sized debt, LTC ceiling and selected permanent debt directly.

Financial profile and financing readiness remain separate dimensions. Risks, conditions precedent and missing information are shown as structured deterministic outputs, not one opaque bankability score.

## Explainability

Every headline financial metric can open a calculation-trace drawer showing the formula ID, dependencies, values and source provenance. Example permanent-debt path:

PPA → generation → revenue → opex → CFADS → target DSCR → allowable debt service → debt capacity → LTC comparison → permanent debt.

## Scenario and sensitivity UX

Scenarios may be duplicated, renamed, archived and compared. Duplicate scenarios highlight changed assumptions relative to their parent. Sensitivities change one approved variable across a range and rerun the exact finance engine for every point.

## Historical integrity

Changing assumptions never updates a completed run in place. The UI marks the prior result stale and offers Run Updated Underwriting. Historical runs are read-only and display the exact policy and calculation-engine versions used.

## Language and safety

Use Underwriting as the primary product action. Use Indicative where a modeled result could be mistaken for a financing commitment. Never display bank approval or a percentage bankability score. The standard footer states that the analysis is indicative and is not a financing commitment, lender approval, legal opinion or tax opinion.

## V0 implementation boundary

The first frontend slice may use the non-persistent `/api/v1/calculations/preview` endpoint while Spec 04 persistence migrations remain under validation. Preview output must be clearly labeled non-persistent and must not be presented as a completed underwriting run. Persistence-backed project/scenario/history screens are enabled only after the database and API write paths are validated.
