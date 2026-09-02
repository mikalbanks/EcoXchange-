# EcoXchange Project Finance Database Schema

## Status

Ticket 08 implements the persistence foundation for the deterministic Project Finance Engine. The schema is additive and lives in the dedicated `project_finance` PostgreSQL schema so the existing marketplace, verification, distribution, and reconciliation tables remain intact.

The production Supabase project was inspected before implementation. Its applied migration head is `0014_reassert_transactional_rls_after_schema_push`; migrations `0015`–`0025` are repository-side project-finance migrations and were not applied to production during Ticket 08 implementation.

Ticket 07 executable CI was unavailable because the repository has no functioning GitHub-hosted runner. The founder explicitly authorized Ticket 08 to proceed on the validated reconstruction branch. No finance formula was changed in this ticket.

## Existing Schema Compatibility

### REUSE / EXTEND

- `public.users` — retained as the application identity table. Ticket 08 adds durable `organization_id` and optional `auth_user_id` linkage instead of creating a second authentication system.
- `public.dev_projects` — retained as the legacy marketplace/developer project record. `project_finance.projects.legacy_dev_project_id` may link to it without mutating legacy finance fields.
- Supabase Storage — reused when present, with a private `project-finance-documents` bucket and tenant-path RLS.

### CREATE NEW

The underwriting domain uses the dedicated `project_finance` schema because existing public tables have incompatible identifiers, purposes, and historical semantics.

## Tenant Model

`project_finance.organizations` is the durable tenant entity.

Existing `public.users.org_name` values are backfilled into durable organizations and each user receives a non-null `public.users.organization_id`. Users without `org_name` receive a personal workspace rather than becoming orphaned.

Tenant resolution supports two trusted paths:

1. The existing Express/server session layer sets `SET LOCAL app.organization_id` and `SET LOCAL app.user_id` after authenticating the request.
2. Future direct Supabase-auth requests may map `auth.uid()` through `public.users.auth_user_id`.

RLS never trusts a row's client-supplied `organization_id` by itself.

## Relationship Map

```text
Organization
  └─ Project
      ├─ Project Facts
      ├─ Project Documents
      │   └─ Document Fields
      └─ Scenarios
          ├─ Scenario Assumptions
          ├─ Policy Overrides
          ├─ Calculation Runs
          │   ├─ Annual Project Cash Flows
          │   ├─ Annual Debt Schedules
          │   ├─ Financing Result
          │   ├─ Tax Credit Result
          │   ├─ Capital Stack Result
          │   ├─ Return Result
          │   ├─ Downside Result
          │   ├─ Downside Cash Sweep Rows
          │   ├─ Reconciliation Result
          │   ├─ Calculation Warnings
          │   └─ Metric Traces
          ├─ Sensitivity Runs
          │   └─ Sensitivity Points -> immutable child Calculation Runs
          └─ Underwriting Runs
              ├─ Rule Results
              ├─ Risks
              ├─ Conditions
              └─ Missing Information
```

`audit_events` is tenant-scoped and append-only.

## Historical Model

### Project Facts

Facts are append/supersede records. A partial unique index permits only one `is_current = true` row per `(project_id, field_key)`. Superseded rows remain queryable forever. `current_project_facts` is a security-invoker view that exposes only current records and intentionally does not resolve scenario/policy precedence.

### Scenarios

Scenario assumptions are mutable while the scenario is being prepared. Any assumption change marks the scenario `STALE` unless it is archived. Superseding a fact used by a scenario also marks that scenario stale. Historical calculation runs are never deleted.

### Calculation Runs

Every run stores:

- immutable resolved `input_snapshot_json`;
- `input_hash`;
- `calculation_engine_version`;
- optional immutable policy version/hash references;
- optional `result_hash`;
- success/failure metadata.

A successful calculation row cannot be updated or deleted. Result child tables reject insert, update, or delete once the parent run reaches `SUCCESS`. This permits the future service transaction:

```text
BEGIN
insert calculation_run RUNNING
insert result rows / annual rows / warnings / traces
validate reconciliation
update calculation_run SUCCESS
COMMIT
```

After `SUCCESS`, a correction requires a new calculation run.

### Policy Versions

Policy rows are versioned by scope, `policy_code`, and `policy_version`. Ticket 08 stores policy metadata only; it seeds no underwriting assumptions or decisions. Once a policy has been referenced by a calculation or underwriting run, the policy and its values cannot be updated/deleted. A new version is required.

### Underwriting Runs

Ticket 08 creates storage scaffolding only. A successful underwriting run and all child rule/risk/condition/missing-information records are immutable. Ticket 09 owns all policy evaluation and decision semantics.

## Financial Numeric Conventions

Persisted finance values never use PostgreSQL floating-point types.

- Money-like values: `NUMERIC(24,6)`
- Rates / ratios / IRRs / DSCR: `NUMERIC(18,10)`
- Energy: `NUMERIC(24,8)`
- Annual row keys: integer/smallint `year >= 1`

Legitimately unavailable values use `NULL` rather than `0` (for example zero-debt minimum DSCR, NPV without a discount rate, or IRR with no sign change).

## RLS Model

RLS is enabled on every tenant-scoped project-finance table.

Authenticated client access is intentionally conservative:

- projects/facts/documents/scenarios may be read and selectively created/updated only within the resolved organization;
- calculation results, sensitivity outputs, underwriting results, and audit history are read-only to authenticated clients;
- trusted server/database roles perform transactional result writes;
- no authenticated hard-delete policies exist for historical finance records.

Cross-tenant UUID knowledge is therefore insufficient to read another organization's project, calculation, document, or underwriting record.

## Storage Security

If Supabase Storage is present, Ticket 08 creates/forces a private bucket:

`project-finance-documents`

The required object path begins with:

`organization_id/project_id/...`

RLS checks the first folder against the resolved tenant. No public bucket or permanent public URL is introduced.

## Views

### `current_project_facts`

Current fact records only. Security-invoker view.

### `project_underwriting_summary`

Surfaces latest persisted successful calculation/underwriting results for project-list reads. It contains no financial formulas.

### `scenario_comparison_summary`

Surfaces latest persisted successful scenario result summaries. It contains no scenario-resolution or underwriting logic.

All views are `security_invoker` so underlying RLS remains authoritative.

## Indexing

Focused indexes cover:

- organization/project/scenario lookup;
- current project facts;
- active/non-archived scenarios;
- latest successful calculation runs;
- input-hash + engine-version deterministic cache lookup;
- document checksum lookup;
- calculation and underwriting child rows;
- audit history.

No broad JSONB GIN indexes are added without a demonstrated query requirement.

## SPEC 04 Compatibility

### IMPLEMENTED AS WRITTEN

- fact/assumption separation;
- historical fact supersession;
- scenarios and staleness;
- versioned policies and overrides;
- immutable calculation input snapshots;
- normalized annual/result storage;
- sensitivity child-calculation linkage;
- underwriting storage scaffold;
- audit history;
- NUMERIC financial persistence;
- RLS and historical hard-delete protection;
- summary/current-fact views.

### ADAPTED TO EXISTING ECOXCHANGE SCHEMA

- Existing `public.users` is extended instead of creating a separate `project_finance.users` authentication table.
- Existing `public.dev_projects` is preserved and optionally linked rather than rewritten. The dedicated underwriting project record is necessary because the legacy table mixes marketplace/readiness/verification fields and uses incompatible varchar identifiers.
- Tenant resolution supports the existing Express session architecture through PostgreSQL request-local settings while remaining future-compatible with Supabase Auth.

### DEFERRED

- policy evaluation and active policy seeding — Ticket 09;
- repository/service transaction implementation and input/result hashing — later service ticket;
- API routes and frontend reads — later tickets;
- AI execution/model usage — later AI ticket;
- generated Supabase TypeScript types — no generated database-type workflow currently exists in this repository; application persistence adapters should add generated types when that workflow is introduced.

## Production Safety

Ticket 08 does not drop, truncate, rename, or delete existing production data. All foreign keys use `ON DELETE RESTRICT` for historical project-finance records. Projects and scenarios are archived logically.

The migrations were not applied to the live Supabase project during implementation because no isolated database runner/development branch was available and production mutation is not an acceptable substitute for migration testing.
