# ECOXCHANGE PROJECT FINANCE ENGINE

## SPEC 04 — DATA MODEL & DATABASE SPECIFICATION

**Status:** Draft v0.1 / engineering implementation started  
**Dependencies:** Specs 01–03  
**Primary target:** Supabase/PostgreSQL  
**AI dependency:** None

### Implementation decision: dedicated PostgreSQL schema

The live EcoXchange database already contains legacy `public.projects` and `public.users` tables with incompatible meanings and varchar identifiers. Spec 04 is therefore implemented in the dedicated `project_finance` PostgreSQL schema rather than mutating or overloading those tables. Inside that schema, the canonical Spec 04 names remain intact (`projects`, `users`, `scenarios`, `calculation_runs`, etc.). This isolates underwriting history from existing marketplace/reconciliation data while leaving a clean future integration path.

### Persistent domain separation

`organizations/users -> projects -> project_facts/documents -> scenarios/assumptions -> calculation_runs -> financial outputs -> underwriting_runs -> rules/risks/conditions/missing_information`

Policy is stored separately as immutable/versioned `underwriting_policies` plus `underwriting_policy_values`. Every successful calculation retains the exact `input_snapshot_json`, calculation engine version, policy reference, and normalized result rows. Completed financial and underwriting outputs are immutable; a changed assumption creates a new run.

### Migration series

- `0015_project_finance_core_tenancy.sql` — schema, organizations, auth-linked users, tenant helpers/RLS.
- `0016_project_finance_projects.sql` — stable project identity and project-access helper.
- `0017_project_finance_facts_documents.sql` — historical facts, documents, extracted fields, current-facts view.
- `0018_project_finance_scenarios.sql` — scenarios, provenance-rich assumptions, policy overrides, staleness triggers.
- `0019_project_finance_policies.sql` — versioned policies/values and `ECOXCHANGE_SOLAR_BASE` v0.1.0 seed.
- `0020_project_finance_calculation_runs.sql` — immutable snapshots, hashes, idempotency, run access helper.
- `0021_project_finance_financial_results.sql` — annual cash flows/debt schedules, financing/tax/capital-stack/returns/downside/warnings/sensitivities/formula traces.
- `0022_project_finance_underwriting_results.sql` — underwriting snapshots, rules, risks, conditions, missing information.
- `0023_project_finance_audit_rls.sql` — append-only audit history, child RLS, successful-run immutability guards.
- `0024_project_finance_views_indexes.sql` — summary/comparison views, helper functions, future exports/model-usage tables, tenant-scoped storage buckets.

### Core invariants

1. No financial formula is implemented in SQL; Spec 02 remains application code.
2. Scenario assumptions are mutable working state; successful run snapshots/results are historical immutable state.
3. Project facts are superseded, never overwritten.
4. RLS uses organization membership as the tenant boundary; backend service-role use remains server-only.
5. Sensitivity points can reference child calculation runs for full auditability.
6. Policy versions used by historical underwriting are never deleted.
7. Normal user flows archive rather than physically delete material financial history.
8. AI-extracted document fields are staged separately and cannot become verified facts by schema implication alone.

### Deployment safety

These migrations are intentionally authored on a feature branch first. They are not automatically applied to the production Supabase project. A clean database reset/migration test and RLS cross-tenant test must pass before production deployment.
