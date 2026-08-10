# Migration apply state — `xgcrooajrdpcgpgoazti` (Supabase project `EcoXchange-`)

There is no migration runner in this repo. These files are applied by hand, so
this ledger is the only record of what has actually run. **Verified by direct
inspection of the live database on 2026-08-09**, not from memory — every row
below names the artifact that was checked.

| # | File | State | Verified by |
|---|------|-------|-------------|
| 001 | `001_initial_schema.sql` | applied | `projects`, `raw_readings`, `verification_records`, `engine_runs` exist |
| 002 | `002_rls.sql` | applied | one anon-read policy on each of the four 001 tables |
| 003 | `003_storage_bucket.sql` | applied 2026-08-09 | `evidence` row in `storage.buckets`, private, 10 MB cap |
| 004 | `004_developer_submissions.sql` | applied 2026-08-09 | `developer_submissions`, `backtest_reports`, `submission_status` enum, `onboarding-reports` bucket |
| 005 | `005_reference_status.sql` | applied | `projects_status_check` includes `'reference'` |
| 006 | `006_evidence_bucket_markdown.sql` | applied 2026-08-09 | `evidence.allowed_mime_types` = `{application/json, text/markdown}` |
| 007 | `007_pvlib_fields.sql` | applied | all five columns present on `projects` (`module_type`, `inverter_efficiency`, `dc_ac_ratio`, `racking_type`, `albedo`) |
| 008 | `008_offerings_and_documents.sql` | applied 2026-08-09 | `offerings`, `project_documents` |
| 009 | `009_investor_preferences.sql` | applied 2026-08-09 | `investors`, `investor_holdings`, `distribution_preferences`, `distribution_history` |
| 010 | `010_suitability_profiles.sql` | applied 2026-08-09 | `suitability_profiles` |
| 011 | `011_pcp_submissions.sql` | applied 2026-08-09 | `pcp_submissions` |
| 012 | `012_polymesh.sql` | applied 2026-08-09 | `polymesh_assets`, `polymesh_holders`, `polymesh_distributions`, `polymesh_sync_runs` |
| 013 | `013_spec19_containment.sql` | applied 2026-08-10 | `projects.status` = `suspended` for `inverter_plant_id = 'demo-plant-001'` |
| 014 | `014_data_provenance.sql` | applied 2026-08-10 | `data_provenance` enum type exists; column present, `is_nullable = NO`, `column_default = null` on both `verification_records` and `raw_readings`; all 12 existing records backfilled to `simulated` |

18 tables in `public`. `projects` holds 1 row and `verification_records` 12 — the
Savannah demo year — unchanged by the 2026-08-09 applications. The engine schema
is now fully migrated: every file in this directory has run against `xgcroo…`.

**All fourteen are applied.** Nothing is outstanding.

## 013 and 014 — Spec 19

Both were applied by hand on 2026-08-10 with `execute_sql`, the same way 001–012
were applied. **No migration runner was introduced**, per Spec 19 §0.1; this
ledger remains the only record of what has run.

**013** suspends the Savannah demo project. It holds the twelve zero-deviation
fixture records diagnosed in `docs/spec-19-diagnostic.md`, and `status = 'active'`
made it reachable by any job iterating active projects. The row is deliberately
**not deleted** — it is the evidence and the basis for the Task C reseed.

There was a second way the fixture could come back: `persistBacktest()` in
`server/services/backtest-supabase-writer.ts` upserts projects **by name** and
used to force `status: 'active'` on the update branch, so any later backtest
named "Savannah Community Solar 5MW" would silently un-suspend it. `status` is
now set only on insert. If you re-suspend a project and it flips back, look
there first.

**014** adds `data_provenance`. Note the deliberate absence of a default: a
default lets a future insert stay silent about its origin, which is the exact
failure being fixed. Every write path must name its provenance explicitly.

⚠️ **Deployment ordering.** The `NOT NULL` constraint is live from the moment 014
runs, but the writer that supplies the column ships with the Spec 19 branch. Any
Render deploy older than that branch will fail its `verification_records` insert.
The failure is graceful — `persistBacktest()` catches everything and returns
`persisted: false`, so a developer-portal backtest still completes in-memory and
logs `[backtest-writer] persistence failed` — but backtests will not persist
until the branch is deployed. Deploy the API before relying on persistence.

## Storage buckets

| Bucket | Public | Limit | MIME types | From |
|---|---|---|---|---|
| `evidence` | no | 10 MB | `application/json`, `text/markdown` | 003, widened by 006 |
| `onboarding-reports` | no | 10 MB | `application/json`, `text/markdown` | 004 |

Both are private and there are **zero policies on `storage.objects`**, so both are
service-role only — deliberate, since `evidence` holds raw third-party API
responses and `onboarding-reports` holds generated developer reports. A signed
URL is the way to expose an individual object; do not open these buckets up by
adding a blanket `storage.objects` policy.

### Why 003 and 006 were the last two, and the trap in them

006 is a bare `UPDATE ... WHERE id = 'evidence'`. Run against a database where
003 never created the bucket, it **succeeds and changes nothing** — no error, no
row count anyone checks. That is exactly how the pair came to look applied when
neither was, and it is the same class of silent no-op that put the wrong state in
this ledger's first draft. If these are ever replayed onto a fresh database,
**003 must run before 006.**

## FK integrity after the 2026-08-09 batch

All 13 foreign keys created by 004/008/009/010 resolve, and every referencing
column is `uuid`. The four that point at `projects`
(`developer_submissions.project_id`, `offerings.project_id`, and the two chain
FKs from 012) reach the UUID/physics `projects` from 001 — **not** the varchar
`projects` in `shared/schema.ts`, which lives in a different database and has
since been renamed `dev_projects`. See `docs/database-consolidation.md`.

## RLS

`xgcroo…` runs an `ensure_rls` event trigger calling `public.rls_auto_enable()`
on `ddl_command_end`, so all 18 tables have RLS enabled. Seven of the tables
added on 2026-08-09 carry **no policies at all**, which is deliberate — they
hold PII, inverter API keys and investor holdings, and are service-role only.
The Supabase linter reports each as `rls_enabled_no_policy` at INFO level;
those entries are expected and should not be "fixed" by adding anon policies.

The two policies that do exist from this batch are the intended public surface:
`offerings` is readable when `status <> 'draft'`, and `project_documents` when
`is_public = true`.

### One pre-existing warning, not from this batch

The linter also flags `public.rls_auto_enable()` as a `SECURITY DEFINER`
function that `anon` and `authenticated` can call over `/rest/v1/rpc/`. It
predates these migrations. Exploitability looks low — the body calls
`pg_event_trigger_ddl_commands()`, which errors outside an event-trigger
context — but the grant is unnecessary either way, and
`REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;`
would close it. Not done here: it is outside the scope of applying these
migrations.
