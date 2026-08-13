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
| 013 | `013_ingestion_and_quality.sql` | **NOT APPLIED** | written for spec 21 §4; not yet run against `xgcroo…` |
| 014 | `014_plant_analytics.sql` | unverified | written for spec 22 §3; no direct inspection recorded |
| 015 | `015_project_calibration.sql` | **NOT APPLIED** | written for spec 23 §1; not yet run against `xgcroo…` |

18 tables in `public`. `projects` holds 1 row and `verification_records` 12 — the
Savannah demo year — unchanged by the 2026-08-09 applications.

**The first twelve are applied. 013, 014 and 015 are outstanding.** All three are
written and idempotent; none has been verified against the live database, so the
schema is *not* fully migrated. (An earlier revision of this file claimed it was,
while the row above it said 013 had not run. 014 had no row at all. Both fixed —
this ledger is the only record there is, and a ledger that flatters itself is
worse than none.)

Apply in order:

- **013** before `supabase/seed/005_pvdaq_ingestion.sql`, which inserts into the
  `reading_quality` table and the `data_provenance` / `telemetry_source` columns
  that 013 creates.
- **014** — spec 22 `plant_analytics`. No dependency on 013.
- **015** — spec 23 `project_calibration` plus five `verification_records`
  columns. No dependency on 013 or 014. Note it installs an append-only trigger:
  after it runs, `UPDATE`/`DELETE` on `project_calibration` raise
  `restrict_violation` by design (spec 23 §4.3 / AC 8), so a "fix the row"
  reflex will fail loudly rather than silently rewrite a frozen band.

### What 013 changes that is not additive

Everything in 013 is `IF NOT EXISTS` or a `DROP CONSTRAINT IF EXISTS` /
`ADD CONSTRAINT` pair, with one exception worth reading before applying: it
drops `NOT NULL` from `projects.inverter_brand`, `inverter_api_key_ref` and
`inverter_plant_id`. Spec 21 §4 replaces that pair with `telemetry_source` +
`telemetry_external_id`, and the old constraint is what forced spec 19's PVDAQ
seed to write `'sma'` for a system whose inverter make is not published — an
explicit "SCHEMA PLACEHOLDER" comment sitting in a committed seed file. Existing
rows are unaffected; only future inserts gain the freedom to leave it null.

Note also that 013 **creates** `raw_readings.data_provenance`. Spec 21 lists that
column as already present from spec 19; it is not. Spec 19 (commit 063f50f)
carried leg provenance in `demo-pvdaq-9068.json` and never touched the schema.
Running only the `ADD CONSTRAINT` half of §4 against this database would fail on
a missing column.

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
