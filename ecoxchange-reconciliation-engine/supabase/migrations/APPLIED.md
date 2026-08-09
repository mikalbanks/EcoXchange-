# Migration apply state — `xgcrooajrdpcgpgoazti` (Supabase project `EcoXchange-`)

There is no migration runner in this repo. These files are applied by hand, so
this ledger is the only record of what has actually run. **Verified by direct
inspection of the live database on 2026-08-09**, not from memory — every row
below names the artifact that was checked.

| # | File | State | Verified by |
|---|------|-------|-------------|
| 001 | `001_initial_schema.sql` | applied | `projects`, `raw_readings`, `verification_records`, `engine_runs` exist |
| 002 | `002_rls.sql` | applied | one anon-read policy on each of the four 001 tables |
| 003 | `003_storage_bucket.sql` | **NOT applied** | no `evidence` row in `storage.buckets` |
| 004 | `004_developer_submissions.sql` | applied 2026-08-09 | `developer_submissions`, `backtest_reports`, `submission_status` enum, `onboarding-reports` bucket |
| 005 | `005_reference_status.sql` | applied | `projects_status_check` includes `'reference'` |
| 006 | `006_evidence_bucket_markdown.sql` | **NOT applied** | depends on 003; its `UPDATE` matches no row today |
| 007 | `007_pvlib_fields.sql` | applied | all five columns present on `projects` (`module_type`, `inverter_efficiency`, `dc_ac_ratio`, `racking_type`, `albedo`) |
| 008 | `008_offerings_and_documents.sql` | applied 2026-08-09 | `offerings`, `project_documents` |
| 009 | `009_investor_preferences.sql` | applied 2026-08-09 | `investors`, `investor_holdings`, `distribution_preferences`, `distribution_history` |
| 010 | `010_suitability_profiles.sql` | applied 2026-08-09 | `suitability_profiles` |
| 011 | `011_pcp_submissions.sql` | applied 2026-08-09 | `pcp_submissions` |
| 012 | `012_polymesh.sql` | applied 2026-08-09 | `polymesh_assets`, `polymesh_holders`, `polymesh_distributions`, `polymesh_sync_runs` |

18 tables in `public`. `projects` holds 1 row and `verification_records` 12 — the
Savannah demo year — unchanged by the 2026-08-09 applications.

## The two that are outstanding

003 creates the private `evidence` bucket; 006 widens its MIME list to accept
`text/markdown`. 006 is a bare `UPDATE`, so running it against a database
without 003 succeeds while changing nothing — it is not an error, which is
exactly why it is easy to believe both have run when neither has. **Apply 003
before 006.**

Nothing in `src/polymesh/` or `server/services/pcp/` touches the `evidence`
bucket, so Spec 18 does not depend on either. The fleet-validation pipeline
does.

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
