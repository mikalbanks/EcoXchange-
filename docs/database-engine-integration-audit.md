# Read-Only Database and Engine-Integration Audit

Date: 2026-08-14

Branch baseline: `origin/main` at `23213a8`

Scope: Supabase inventory, repository data paths, verification-engine integration, and public trust claims

No SQL was executed. No database, Supabase configuration, production service, or deployment was changed during this audit.

> This is a point-in-time, best-effort security and integration review, not a guarantee that every vulnerability or configuration issue has been found. Re-run the database checks after connector access is repaired and before any production migration.

## Executive result

EcoXchange currently has three different data worlds:

```text
www.ecoxchange.net
  -> Express public app
  -> server/storage.ts
  -> MemStorage fixtures for primary project/performance data

demo.ecoxchange.net
  -> dashboard DataContext
  -> Supabase when configured, otherwise static demo JSON
  -> PVDAQ 9068 remains a committed static public-data bundle in both modes

verification-engine / reconciliation-engine
  -> intended canonical Supabase project (xgcrooajrdpcgpgoazti)
  -> repository configuration and historical Drizzle paths still reference
     the second project (ojwofgbrxptiaqwjmcou) in places
```

The engines exist, but the public performance page is not proof that a live, independent three-leg reconciliation ran. The primary public app still serves seeded in-memory records. The dashboard can read database records, but the current verification-record shape does not encode whether each leg is measured, uploaded, or derived.

## Database inventory

### Intended canonical project

- Supabase project: `EcoXchange-`
- Project ref: `xgcrooajrdpcgpgoazti`
- Control-plane status reported `ACTIVE_HEALTHY`.
- Read-only table and migration inspection failed because the configured connector user could not authenticate.
- The same connector then reported the project as hibernated when requesting advisors. That conflicts with the control-plane status and should be treated as connector-state drift, not as a database fact.
- Result: table grants, row-level security policies, migrations, and live engine-row counts remain unverified.

Do not proceed with a production migration until read-only access is repaired and those checks pass.

### Secondary project

- Supabase project: `EcoXchange-2nd`
- Project ref: `ojwofgbrxptiaqwjmcou`
- 45 public tables were visible; every reported row count was zero.
- Only `projects` had row-level security enabled.
- Security advisors reported `rls_disabled_in_public` errors for the other 44 public tables.
- Performance advisors reported unindexed foreign keys and unused indexes. Because the project is empty and is intended for retirement, schema consolidation is more important than tuning those indexes.

Enabling row-level security without policies can block all application access. The safe order is: inventory grants and callers, write explicit least-privilege policies, test with anonymous and authenticated roles, enable row-level security in a staging transaction, then retire the project after the canonical connection is verified.

Supabase changed new-table API exposure defaults in 2026, but grants and row-level security remain separate controls. See the [Supabase changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

## Integration findings

### P1: split database configuration can break the evidence chain

`docs/database-consolidation.md` already names `xgcrooajrdpcgpgoazti` as canonical and `ojwofgbrxptiaqwjmcou` as the Drizzle-era project. The consolidation steps that repoint all runtime variables and retire the old project are not complete.

The risk is concrete: one service can write a verification result to the canonical engine tables while another reads meter or project data from the empty secondary project. A green UI in that state reflects fallback or fixture behavior, not an end-to-end production proof.

### P1: the public app is seeded, not database-backed

`server/storage.ts` exports `new MemStorage()` unconditionally. The public `/performance` metrics and related project records therefore come from process memory fixtures unless that architecture changes. Existing provenance correctly marks CSV/manual sources as `SELF_REPORTED`, but the page previously called the output live and independently reconciled.

### P1: source independence is not represented consistently

- The Savannah dashboard fixtures are simulated and algebraically related.
- PVDAQ 9068 has one measured production leg, one independently modeled expected leg, and a utility proxy derived from the measured inverter leg.
- Supabase verification rows contain values and deviations but not per-leg provenance.
- The backtest can compare a synthesized meter baseline or stored production records with a Solcast source. Storage does not encode whether a record was uploaded, seeded, or utility-measured, and the fallback comparison may be derived from the meter series.

The UI must describe these states differently. A `VERIFIED` engine determination is not the same claim as three independently sourced measurements.

### P2: environment and connector references have drifted

- The dashboard production environment points to the intended canonical project.
- Repository database configuration still contains paths associated with the secondary project.
- `.cursor/mcp.json` references a third Supabase project ref, which is not one of the two active EcoXchange projects found in this audit.
- A public anonymous key is expected in browser code, but it is safe only when table grants and row-level security policies are correct. Canonical-project policy safety could not be verified.

### P1: the public replay mutation is not safe for shared production use

`POST /api/public/backtest/run` accepts a project ID without authentication or a route-specific rate limit, can invoke external Solcast work, and replaces one process-global cached report. One caller can therefore consume replay resources and change the report subsequently returned to other visitors. This branch removes the mutation control from the public evidence page, but the endpoint itself remains a backend follow-up: require authorization, bound the workload, and return caller- or job-scoped immutable results before exposing replay execution again.

The public report `GET` is not a pure cache read on a cold process: it lazily starts a replay, and concurrent cold requests do not share an in-flight promise. Add a single-flight lock or precompute the read-only artifact so a traffic burst cannot duplicate external and CPU work.

### P1: Solcast interval coverage is not carried into the report contract

The engine accepts a historical Solcast series at 10% daylight coverage and fills missing timestamps with zero before computing report statistics. The response exposes only a source enum, not matched/expected interval counts. The UI now says coverage is unreported, but the statistical remedy belongs in the engine: enforce an evidence-quality minimum or exclude missing pairs, persist coverage counts, and display them beside every comparison metric.

### P2: deployment routing needs an explicit check

During the live audit, `www.ecoxchange.net` served changes from PR #108 before the audit could confirm those changes were on `main`. PR #108 has since merged. Review Cloudflare branch/custom-domain rules so future draft branches cannot replace the public domain unintentionally.

## P1 UI remediation in this branch

This branch uses evidence already available in the application rather than inventing a stronger backend contract:

- `/performance` replaces the live/independent claim with a provenance-driven evidence disclosure.
- Self-reported, connected, verified, and unknown source states receive different labels.
- Investment CTAs are removed from the evidence page and replaced with methodology/backtest links.
- `/backtest-report` labels stored-record origin as unstated, renames confidence to alignment score, states when the comparison is modeled, dependent, or partial, and marks Solcast coverage as unreported.
- The anonymous replay mutation control is removed from the public page; the remaining evidence report is read-only.
- Dashboard verification detail labels Savannah as simulated, PVDAQ as partial real data with a derived utility leg, and Supabase records as having unstated per-leg provenance.
- “Verdict” becomes “Engine determination,” and “Three-Way Reconciliation” becomes an evidence-aware source-comparison title.

## Required follow-up outside this branch

1. Repair read-only access to `xgcrooajrdpcgpgoazti`; inventory tables, grants, policies, migrations, and engine row counts.
2. Choose and document one canonical runtime database. Repoint all server, dashboard, engine, Drizzle, and local connector configuration together.
3. Add per-leg provenance to the canonical data model: basis (`measured`, `uploaded`, `modeled`, `derived`), provider, source record, retrieval time, and dependency lineage.
4. Verify anonymous and authenticated access with automated policy tests before enabling or changing row-level security.
5. Run an end-to-end non-production trace: ingest one meter interval, model one expected interval, reconcile, persist, and read the exact row in both public surfaces.
6. Retire `EcoXchange-2nd` only after a soak period confirms no logs, connections, or jobs still use it.
7. Audit Cloudflare custom-domain routing so draft PR deployments stay on preview hostnames.
8. Protect `/api/public/backtest/run` with authorization, workload bounds, and caller-scoped immutable results before restoring a public replay control.
9. Add source-interval coverage to the backtest response and stop zero-filled gaps from being scored as observed comparison intervals.

## Known limits

- Canonical Supabase contents and policies were not readable with the configured connector.
- No production traffic logs, Cloudflare configuration, secret store, or CI environment variables were available through the repository audit.
- A UI disclosure reduces misrepresentation risk but does not create missing independent meter evidence.
- Spec 20 real-data reproduction remains a separate data-acquisition and statistical-verification task. This audit does not substitute the annual 5,065-plant benchmark for the missing 15,190 plant-month hold-out.
