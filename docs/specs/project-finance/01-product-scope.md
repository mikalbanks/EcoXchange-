# ECOXCHANGE PROJECT FINANCE ENGINE

## SPEC 01 — PRODUCT & SCOPE SPECIFICATION

**Document status:** Draft v0.1  
**Product:** EcoXchange Project Finance Engine  
**Initial market:** United States renewable-energy project finance  
**V0 asset class:** Contracted solar PV  
**V0 project size:** 1–20 MW  
**Primary user:** Renewable-energy developer / project sponsor  
**Secondary future users:** Capital providers, lenders, investors, EcoXchange internal underwriting personnel  
**AI dependency:** None required for V0

**Primary research basis:** *U.S. Utility-Scale Renewable Project Finance for 1–20 MW — Financial and lending terms, capital structures, tax-credit monetization, and modeled solar economics as of September 1, 2026.*

---

## 1. Product Definition

EcoXchange Project Finance Engine is a software application that takes the financial and operating characteristics of a renewable-energy project and produces an indicative lender-style project-finance analysis.

The system must answer questions such as:

- How much permanent senior debt can this project support?
- What is constraining leverage?
- How much sponsor equity is required?
- How does the financing change under P50 versus downside production?
- How do interest rate, PPA price, capex, operating costs, tax credits and amortization affect financeability?
- What capital structure appears appropriate for this project?
- What important information is missing before a lender could seriously underwrite it?

The software must separate:

- Project economics
- Debt sizing
- Tax-credit monetization
- Sponsor returns
- Credit/risk analysis

These must never be collapsed into a simplistic debt/equity calculator.

The underlying project-finance research establishes that contracted renewable debt is generally constrained by CFADS and required DSCR, rather than simply applying a headline LTC/LTV percentage. The source model also separates permanent debt, temporary tax-credit bridge financing, tax-credit proceeds, sponsor equity and tax attributes.

---

## 2. Product Objective

Allow a renewable-energy developer to enter a project’s economic assumptions and receive an auditable preliminary financing analysis in minutes instead of manually constructing a project-finance model.

The V0 product is not intended to replace a bank’s credit committee, independent engineer, tax counsel, legal diligence, valuation professional or investment committee.

It is intended to approximate the first analytical pass that occurs before or during financing discussions.

---

## 3. Strategic Role Within EcoXchange

This feature should sit upstream of EcoXchange’s capital-markets workflow.

Future EcoXchange flow:

Project entered → Financeability evaluated → Capital structure generated → Financing gaps identified → Potential capital sources identified → Project prepared for financing → Investment/security structure created → Capital raised → Project monitored → Production verified → Investor distributions/reporting

Therefore, the underwriting engine should ultimately become a core part of EcoXchange’s infrastructure rather than an isolated calculator.

---

## 4. Product Principles

### 4.1 Deterministic first

Financial calculations must be performed by deterministic software.

An LLM must never be the authoritative source for:

- DSCR
- CFADS
- debt capacity
- IRR
- NPV
- debt service
- tax-credit proceeds
- amortization
- reserves
- equity requirement
- sensitivity calculations

### 4.2 AI optional

V0 must function completely without an LLM.

A project can be entered manually and fully analyzed with zero AI-token expenditure.

### 4.3 Auditable

Every important output should be traceable to:

**Fact → Assumption → Formula → Result**

The user must be able to determine why a result exists.

### 4.4 Scenario-based

There is no single universally correct project-finance structure.

The application must support multiple financing scenarios without overwriting the base project.

### 4.5 Policy-driven

Underwriting assumptions must not be scattered throughout source code.

For example, `minimum_dscr = 1.30` must eventually belong to a versioned Underwriting Policy, rather than appearing as a magic number inside a calculation function.

### 4.6 Conservative by default

Where the system cannot determine an input, it must:

1. request the input;
2. permit an explicit EcoXchange assumption; or
3. mark the calculation unavailable.

It must not silently invent favorable assumptions.

---

## 5. V0 User

### Primary persona

U.S. renewable-energy project developer / sponsor.

Typical situation:

- developing or owning one or more solar projects;
- knows approximate project costs;
- has or expects a PPA;
- knows project capacity;
- may have production estimates;
- wants to understand financeability;
- may not have an institutional project-finance model;
- wants to know how much debt/equity may be required before approaching capital providers.

Example user question:

> “I have a 5 MW project costing $8 million with a $55/MWh PPA. How much bank debt can it support?”

The system must answer that computationally rather than conversationally.

---

## 6. V0 Asset Scope

### Technology

- Solar photovoltaic

### Market

- United States

### Size

- 1–20 MW AC

### Revenue structure

- Fully contracted long-term PPA

### Ownership

- Project SPV / ProjectCo

### Financing

- Sponsor equity
- Senior permanent debt
- transferred ITC proceeds
- optional ITC bridge representation

### Tax-credit starting capability

- 48E ITC
- user-specified ITC percentage
- user-specified eligible basis percentage
- user-specified transfer price

The source underwriting model uses solar specifically to isolate financing scale effects and models a bankruptcy-remote ProjectCo with long-term contracted revenue.

---

## 7. Explicit V0 Non-Goals

Codex must not implement these in V0 unless a later specification explicitly adds them:

- wind
- standalone batteries
- VPPs
- residential batteries
- hydrogen
- biomass
- merchant plants
- partially merchant revenue
- multiple PPAs
- tax-equity partnership flips
- sale-leasebacks
- mezzanine financing
- preferred equity
- portfolio aggregation
- HoldCo debt
- construction draw schedules
- detailed construction lending
- stochastic energy simulation
- actual lender matching
- credit bureau checks
- automated bank approvals
- automated securities offerings
- investor solicitation
- legal opinions
- tax opinions
- tax-return preparation
- full partnership accounting
- automated document ingestion
- LLM underwriting

These can be introduced later. This limitation is deliberate.

---

## 8. Core V0 User Workflow

### Step 1 — Create Project

User creates a new underwriting project.

Required identifiers:

- project name
- project location/state
- technology
- project capacity MW AC
- project status

Optional:

- sponsor name
- ProjectCo name
- internal project ID

---

## 9. Enter Operating Assumptions

User enters:

### Generation

- AC capacity MW
- P50 capacity factor
- annual degradation %
- project operating life
- PPA life

V0 may calculate annual generation using:

`Capacity × 8,760 × capacity factor`

and apply annual degradation.

Later versions may integrate SAM/PySAM for more sophisticated generation forecasts.

---

## 10. Revenue Inputs

Required:

- year-one PPA price $/MWh
- annual PPA escalation %
- PPA term

System calculates:

`annual generation × applicable PPA price`

for each modeled year.

No merchant terminal value in V0.

That follows the current EcoXchange reference model, which intentionally excludes terminal value from the lender-oriented base case.

---

## 11. Expense Inputs

User enters:

- total project capex
- year-one operating expenses
- annual opex escalation

Future versions may break opex into:

- O&M
- land lease
- insurance
- property tax
- asset management
- administrative costs

V0 may store these as one combined operating-cost amount.

---

## 12. Tax-Credit Inputs

V0 user enters:

- ITC rate
- ITC-eligible basis %
- ITC transfer price
- transaction costs associated with transfer, optional

The base tax-credit equations are:

`Eligible basis = Capex × Eligible basis %`

`ITC face value = Eligible basis × ITC rate`

`Gross transfer proceeds = ITC face value × Transfer price`

`Net ITC proceeds = Gross transfer proceeds − transaction costs`

The EcoXchange reference model uses this same economic framework for transferred ITC proceeds.

The user must be able to override every assumption.

---

## 13. Financing Inputs

User enters or selects:

- interest rate
- amortization period
- target P50 DSCR
- maximum LTC
- arrangement/upfront fee %
- DSRA requirement in months of debt service

Default values will eventually be populated from the Underwriting Policy specification.

V0 must allow manual override.

---

## 14. Required V0 Calculations

The engine must calculate at minimum:

### Operating

- annual energy generation
- annual revenue
- annual opex
- annual CFADS

### Debt

- allowable debt service
- DSCR-sized debt
- LTC maximum debt
- opening permanent debt
- scheduled debt service
- debt-to-capex
- annual DSCR
- minimum modeled DSCR

### Reserves

- DSRA amount

### Tax credit

- eligible basis
- ITC face value
- ITC transfer proceeds

### Equity

- initial sponsor equity requirement

### Returns

At minimum:

- sponsor cash flows
- levered sponsor cash IRR

Full tax-benefit IRR can come later if required by the financial-engine specification.

---

## 15. Core Debt-Sizing Logic

The system must conceptually implement:

`CFADS = Revenue − Operating Expenses`

Then:

`Allowable Debt Service(t) = CFADS(t) / Target DSCR`

Debt capacity equals the present value of allowable debt service using the applicable debt rate and amortization assumptions.

Then:

`Permanent Debt = min(DSCR-sized Debt, LTC Ceiling)`

This is central to the product.

The reference model explicitly uses this lender-oriented approach and reports that DSCR is binding in its 1 MW, 5 MW and 20 MW examples rather than LTC.

---

## 16. V0 Downside Case

V0 must support:

### P50 Base Case

User’s expected-production case.

### Simplified P90 Case

Until a project-specific P90 number is available, the user may enter either:

- explicit P90 generation; or
- P90 as a percentage of P50.

The existing reference model’s illustration uses P90 generation equal to 90% of P50, but explicitly warns that a real lender would require an independent engineer’s probabilistic energy study.

Accordingly, the software must never label 90% of P50 as a true P90 engineering estimate.

If used, UI language should say:

> “Illustrative downside generation assumption.”

---

## 17. Results Dashboard

Every underwriting scenario should produce a top-level result panel containing:

### Project Economics

- Project capex
- PPA revenue
- year-one CFADS

### Debt Capacity

- DSCR-sized debt
- LTC-limited debt
- recommended/maximum permanent debt
- debt/capex

### Capital Stack

- permanent debt
- ITC proceeds
- sponsor equity

### Credit Metrics

- target P50 DSCR
- minimum projected DSCR
- downside DSCR/result
- debt tenor

### Sponsor Economics

- initial sponsor equity
- cash IRR

---

## 18. Financing Constraint Explanation

The system must identify the binding constraint.

Examples:

### CFADS constrained

Debt capacity is limited by project cash flow at the selected DSCR.

### LTC constrained

Project cash flows support additional debt, but leverage is limited by the selected LTC ceiling.

### Negative/weak project economics

The project does not generate sufficient residual cash flow under the current assumptions to support an attractive sponsor return.

This explanation should initially be deterministic/template driven. No LLM required.

---

## 19. Scenario Function

Users must be able to duplicate an underwriting scenario.

Example:

- Base Case
- Higher PPA
- Lower Rate
- 40% ITC

Each scenario inherits the project data but can override financing/economic assumptions.

The database must preserve the scenarios independently.

---

## 20. Minimum Sensitivities

V0 should support automatic sensitivity analysis for:

- PPA price
- borrowing rate
- capex
- capacity factor
- ITC rate

A sensitivity must rerun the entire debt-sizing process.

It must not merely alter sponsor IRR while keeping debt constant, because changes in project cash flow or interest rates can change debt capacity itself.

The reference model demonstrates this explicitly: interest rates have a double effect because they change both borrowing cost and the amount of DSCR-sized debt the project can support.

---

## 21. Capital Stack Visualization

V0 results should display:

Total project uses versus:

- Permanent Debt
- ITC proceeds
- Sponsor Equity

preferably as both numbers and percentages.

Example reference output for the existing 5 MW case is approximately:

- $8.0M capex
- $3.364M permanent debt
- $2.098M ITC-sale proceeds
- approximately $2.995M initial sponsor cash equity after modeled fees/reserves

Those values come from the current EcoXchange base-case financing model and should eventually become one of our regression-test cases.

---

## 22. Source Classification

Every user-editable assumption should eventually carry a source classification.

Values:

- `USER_FACT` — provided directly by user
- `DOCUMENT_FACT` — later extracted from source documentation
- `ECOXCHANGE_ASSUMPTION` — provided by underwriting policy
- `DERIVED` — calculated by system

Example:

| Input | Value | Source |
|---|---:|---|
| PPA price | $55/MWh | USER_FACT |
| Target DSCR | 1.30x | ECOXCHANGE_ASSUMPTION |
| CFADS | $428,200 | DERIVED |

This becomes critical once AI extraction is introduced.

---

## 23. Assumption Overrides

Users must be allowed to override underwriting defaults.

However, overridden assumptions must visibly show **Custom assumption** and retain both:

- original policy value
- user-selected value

Example:

- EcoXchange default DSCR: 1.30x
- Scenario DSCR: 1.25x

The system must not silently overwrite the default policy.

---

## 24. Auditability Requirement

Every calculated metric should have an accessible explanation.

Example:

**Permanent debt: $3,364,000**

User selects “How calculated?”

System displays:

1. PPA revenue forecast
2. opex forecast
3. CFADS
4. target DSCR
5. maximum allowable debt service
6. discounted debt capacity
7. LTC test
8. selected lower amount

This is an important product differentiator.

---

## 25. Warning System

V0 should generate deterministic warnings.

### PPA TERM WARNING

Debt amortization exceeds contracted PPA term.

### DSCR WARNING

Projected minimum DSCR falls below selected requirement.

### NEGATIVE CFADS WARNING

Project produces negative CFADS in one or more years.

### HIGH LTC WARNING

Selected leverage exceeds policy maximum.

### DOWNWARD REVENUE WARNING

PPA escalation does not offset degradation/opex growth sufficiently.

### TAX CREDIT ASSUMPTION WARNING

ITC eligibility is user supplied and has not been independently verified.

### P90 WARNING

Downside case is an illustrative percentage of P50 rather than an independent engineering P90 estimate.

---

## 26. Language Restrictions

The application must not state:

- “Bank approved.”
- “Guaranteed financing.”
- “This project will receive $X debt.”
- “This is a bank commitment.”

Instead use:

- “Indicative debt capacity.”
- “Preliminary underwriting scenario.”
- “Modeled permanent debt.”
- “Based on selected assumptions.”
- “Subject to lender diligence and underwriting.”

---

## 27. V0 AI Requirement

None.

V0 must not require:

- Kimi
- OpenAI
- Anthropic
- Gemini
- Llama
- any other LLM

This keeps operating cost near zero and establishes whether the core financing functionality is genuinely useful before inference spend is introduced.

---

## 28. Future AI Boundary

When introduced, AI may:

- extract inputs from documents;
- identify missing fields;
- explain deterministic calculations;
- summarize risks;
- draft preliminary credit memos;
- suggest scenarios to investigate.

AI may not:

- originate authoritative financial calculations;
- overwrite project facts without disclosure;
- invent missing contracts;
- invent tax eligibility;
- issue financing commitments;
- represent itself as a bank.

---

## 29. V0 Success Criteria

V0 should be considered functionally successful when a user can:

1. Create a 1–20 MW contracted solar project.
2. Enter the project’s key operating and financial assumptions.
3. Produce a 25-year operating cash-flow model.
4. Calculate CFADS.
5. Size senior debt using DSCR.
6. Enforce an LTC ceiling.
7. Calculate debt service.
8. Calculate a DSRA.
9. Calculate transferable ITC proceeds.
10. Calculate sponsor-equity requirement.
11. Calculate sponsor IRR.
12. Run an illustrative downside generation case.
13. Run financing sensitivities.
14. Duplicate and compare scenarios.
15. See what variable constrains debt.
16. Inspect the inputs and formulas responsible for major results.
17. Export or display a clean preliminary underwriting summary.

No LLM should be necessary to accomplish any of these.

---

## 30. Benchmark Acceptance Case

One of the first acceptance tests should reproduce the existing EcoXchange 5 MW base case within an agreed tolerance.

Reference assumptions include:

- 5 MW solar
- $8.0M capex
- 24% P50 capacity factor
- $55/MWh Year-1 PPA
- 1% PPA escalation
- $150K Year-1 opex
- 2.5% opex escalation
- 30% ITC
- 95% eligible basis
- $0.92 ITC transfer price
- 1.30x P50 DSCR
- 6.50% modeled debt rate
- 18-year amortization
- 70% LTC ceiling

The source model produces approximately:

- $3.364M permanent debt
- $2.098M ITC-sale proceeds
- $428.2K Year-1 CFADS
- $2.995M initial sponsor equity after modeled reserve/closing assumptions

That case should eventually become a permanent automated regression test.

---

## 31. Definition of V0

The resulting product should essentially allow someone to go from:

> “Here are the economics of my solar project.”

To:

> “Here is approximately how a project-finance lender would begin sizing and stress-testing this transaction.”

without Excel expertise, without an investment banker and without an AI API call.

---

## Implementation Boundary

This document defines product scope only. It does **not** authorize database migrations, production schema changes, or finance-engine implementation by itself. Those actions must be driven by the subsequent specifications, especially:

1. Financial Calculation Engine Specification
2. Underwriting Policy & Credit Rules Specification
3. Data Model & Database Specification
4. API & Service Architecture Specification
5. Frontend / UX Specification
6. AI / Document Intelligence Specification
7. Testing, Validation & Codex Implementation Specification

This separation is intentional so Codex can receive implementation work packages in dependency order without entangling finance logic, policy, persistence, UI, and AI behavior.
