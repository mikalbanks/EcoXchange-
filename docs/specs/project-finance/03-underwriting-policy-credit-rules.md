# ECOXCHANGE PROJECT FINANCE ENGINE

## SPEC 03 — UNDERWRITING POLICY & CREDIT RULES

**Document status:** Draft v0.1  
**Dependency:** SPEC 01 — Product & Scope Specification  
**Dependency:** SPEC 02 — Financial Calculation Engine  
**Primary implementation target:** Versioned policy/rules service consumed by the calculation and decision layers  
**V0 asset scope:** U.S. contracted solar PV, 1–20 MW  
**AI dependency:** None  
**Policy philosophy:** Lender assumptions must be explicit, versioned, inspectable, overridable, and separate from core financial mathematics.

This specification governs credit policy and lender-style decision logic. It does not govern financial formulas themselves, UI implementation, database schema, or AI behavior.

The policy is grounded in the EcoXchange project-finance reference report and is intentionally lender-oriented without claiming to reproduce any named institution's proprietary credit policy.

---

## 1. Purpose

SPEC 02 answers: **What are the project’s financial outputs?**

SPEC 03 answers: **How should EcoXchange interpret those outputs from a lender’s perspective?**

The underwriting policy converts project facts and deterministic calculation results into lender assumptions, credit tests, conditions, warnings, lender-fit classifications, indicative structures, and policy overrides.

The policy engine must not calculate project cash flows. It consumes outputs from SPEC 02.

---

## 2. Architecture

Project facts → Financial calculation engine → Underwriting policy → Credit assessment.

Facts, calculations, and policy conclusions must remain independently inspectable.

---

## 3. Base V0 Policy

- `policy_id = ECOXCHANGE_SOLAR_BASE`
- `policy_version = 0.1.0`
- fully contracted U.S. solar PV
- approximately 1–20 MW AC
- ProjectCo/SPV project-finance structure
- conservative lender-style assumptions

The policy is not a representation of any named lender.

---

## 4. Core Policy Defaults

### Contracted solar

- P50 target DSCR: `1.30x`
- Merchant reference DSCR schema value: `1.75x` (not active V0 debt sizing)
- Merchant exposure warning: `25%`
- Merchant exposure severe: `30%`

### Size-banded LTC

- `<3 MW`: `65%`
- `>=3 MW`: `70%`

### Size-banded all-in modeled debt rate

- `1–<3 MW`: `7.25%`
- `3–<10 MW`: `6.50%`
- `10–20 MW`: `5.80%`

These are EcoXchange modeled assumptions, not live lender quotes.

### Size-banded amortization

- `1–<3 MW`: `15 years`
- `3–<10 MW`: `18 years`
- `10–20 MW`: `20 years`

### Other defaults

- DSRA: `6 months` of Year-1 scheduled debt service
- lender fee: `1.25%`
- ITC policy assumption: `30%`
- ITC transfer price: `0.92`
- construction contingency: `7.5%` only if capex excludes contingency
- closing allowance: `$200k / $400k / $750k` by the same size bands
- committed ITC bridge advance schema value: `98%`
- uncommitted ITC bridge advance schema value: `72.5%`

---

## 5. Assessment Status

Top-level assessment values:

- `PASS`
- `PASS_WITH_CONDITIONS`
- `REVIEW_REQUIRED`
- `FAIL`
- `INSUFFICIENT_INFORMATION`
- `OUT_OF_SCOPE`

No result may be labeled as bank approval.

---

## 6. Revenue and Contract Rules

Supported revenue classification:

- `FULLY_CONTRACTED`
- `PARTIALLY_CONTRACTED`
- `MERCHANT`
- `UNKNOWN`

Only fully contracted revenue is fully supported in V0.

PPA term should cover the economic amortization period. Contract tail is classified:

- `>=2 years`: STRONG
- `0–1 years`: ACCEPTABLE
- `<0 years`: WEAK

---

## 7. DSCR and Leverage Rules

Required contracted-solar P50 DSCR: `1.30x` by default.

Headroom classification:

- `>=0.15`: STRONG
- `0.05–0.149`: ADEQUATE
- `0–0.049`: THIN
- `<0`: FAIL

Debt must remain the lesser of DSCR-supported debt and policy LTC. Policy never increases debt simply to reach LTC.

Debt-to-capex descriptive classification:

- `<30%`: LOW_LEVERAGE
- `30–50%`: MODERATE
- `50–policy LTC`: HIGHER_BUT_POTENTIALLY_NORMAL
- `>policy LTC`: FAIL

---

## 8. Downside/P90 Rules

A downside or P90 case is required.

Production-evidence classes:

- `INDEPENDENT_ENGINEER_P90`
- `USER_SUPPLIED_P90`
- `ILLUSTRATIVE_PERCENT_OF_P50`
- `NONE`

Only an independent-engineer P90 may be described as lender-grade P90 evidence.

The downside full-repayment cash-sweep result from SPEC 02 is consumed by policy. An illustrative downside may produce only an indicative pass.

---

## 9. Documentation and Readiness Rules

The assessment accepts structured statuses for:

- PPA execution
- offtaker credit
- EPC
- interconnection
- permitting
- site control
- O&M
- independent engineer
- insurance
- sponsor experience
- completion support
- cost-overrun support
- equity commitment
- tax-credit eligibility
- tax-credit buyer status

Missing underwriting facts do not necessarily prevent financial calculations, but they prevent a full lender-style PASS where material.

---

## 10. Project Size Guidance

- `1–<5 MW`: SMALL
- `5–<15 MW`: MID
- `15–20 MW`: UPPER_MIDSCALE

Small projects receive `SMALL_PROJECT_FIXED_COST_RISK` and an aggregation recommendation rather than an automatic failure.

Indicative execution preferences:

- SMALL: regional/specialty or portfolio financing + transferred ITC + sponsor equity
- MID: regional/specialty and portfolio lenders, tax-credit transfer
- UPPER_MIDSCALE: institutional project-finance potentially viable, subject to documentation quality

---

## 11. Lender-Fit Categories

- `MONEY_CENTER_PROJECT_FINANCE_BANK`
- `REGIONAL_SPECIALTY_ENERGY_BANK`
- `PRIVATE_CREDIT`
- `INSTITUTIONAL_PRIVATE_PLACEMENT`
- `TAX_CREDIT_BRIDGE_LENDER`
- `GREEN_BANK_CDFI`

Lender fit is an indicative classification, not matching or approval.

---

## 12. Tax-Credit Rules

ITC eligibility status:

- `VERIFIED`
- `USER_ASSERTED`
- `PENDING_REVIEW`
- `UNKNOWN`

If ITC is material and not verified, it becomes a closing condition.

Tax-credit buyer status:

- `COMMITTED`
- `IDENTIFIED_NOT_COMMITTED`
- `UNIDENTIFIED`
- `NOT_APPLICABLE`

A bridge is temporary capital and must not be treated as permanent leverage.

---

## 13. Rule Object

Each deterministic test returns:

- `rule_id`
- `rule_version`
- `status`
- `severity`
- `actual_value`
- `required_value`
- `message`
- `condition_to_clear`
- `source`

Stable IDs must version logic, including:

- `SOLAR_P50_DSCR_MINIMUM_V1`
- `P90_REPAYMENT_REQUIRED_V1`
- `MAX_LTC_V1`
- `PPA_COVERS_AMORTIZATION_V1`
- `DSRA_MINIMUM_V1`
- `ITC_ELIGIBILITY_STATUS_V1`
- `OFFTAKER_CREDIT_STATUS_V1`
- `PPA_EXECUTION_STATUS_V1`
- `INTERCONNECTION_STATUS_V1`
- `EPC_STATUS_V1`
- `PERMIT_STATUS_V1`
- `SITE_CONTROL_STATUS_V1`
- `IE_REPORT_STATUS_V1`
- `SPONSOR_EXPERIENCE_V1`

---

## 14. Policy Overrides

Overrides must preserve:

- field
- policy value
- override value
- reason
- source
- created by
- timestamp

A lender quote may be treated as stronger evidence than an EcoXchange default. A user assumption remains explicitly labeled.

If the policy values used by SPEC 02 do not match the values used by SPEC 03 without a registered override, return `POLICY_CALCULATION_MISMATCH`.

---

## 15. Decision Dimensions

Avoid a single opaque bankability score in V0.

Return separate dimensions:

- financial bankability
- project readiness
- counterparty risk
- tax-credit certainty
- lender fit
- risks
- conditions precedent

Critical failures may not be averaged away by strengths elsewhere.

---

## 16. Overall Decision Logic

- CRITICAL hard-fail → `FAIL`
- material missing facts blocking credit judgment → `INSUFFICIENT_INFORMATION`
- financially valid but material closable conditions remain → `PASS_WITH_CONDITIONS`
- ambiguous deterministic classification → `REVIEW_REQUIRED`
- all key V0 tests and evidence sufficient → `PASS`
- unsupported technology/revenue/profile → `OUT_OF_SCOPE`

---

## 17. V0 Definition of Done

Implementation is complete when the service can version policy, resolve defaults and overrides, validate policy/calculation integrity, evaluate DSCR/LTC/PPA/P90/reserves/tax credit/documentation/readiness, identify missing information and conditions, classify lender fit and financing path, produce dimension-level bankability, and return fully traceable rule-level conclusions without an LLM.
