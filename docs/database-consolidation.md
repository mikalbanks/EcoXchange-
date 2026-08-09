# Database Consolidation — merging the two Supabase projects

**Status:** design + one defensive code change landed. The migration itself is not done.
**Measured:** 2026-08-09, against both live databases.

## The situation, measured

EcoXchange has two Supabase projects, and the same repository talks to both.

| | `EcoXchange-` — `xgcrooajrdpcgpgoazti` | `EcoXchange-2nd` — `ojwofgbrxptiaqwjmcou` |
|---|---|---|
| Owner | the SQL migration series in `ecoxchange-reconciliation-engine/supabase/migrations/` | `shared/schema.ts` via `drizzle-kit push` |
| Tables | 9 (001 + 011 + 012 applied) | 28 |
| **Rows** | **1 project, 12 verification_records** | **0 — every table, all 28** |
| `projects.id` | `uuid`, `gen_random_uuid()` | `character varying` |
| `projects` shape | physical plant: `tilt_deg`, `azimuth_deg`, `commissioning_date`, `inverter_brand`, `albedo` | development deal: `developer_id`, `spv_id`, `stage`, `technology`, `capacity_mw` |
| Pointed at by | `ecoxchange-dashboard/.env.production` (`VITE_SUPABASE_URL`) | `DATABASE_URL` (inferred — it is where the drizzle tables exist) |

Two things follow immediately:

1. **There is no data to migrate.** The drizzle side is empty. "Merging" is really "point everything
   at one database and let drizzle recreate its schema there." All the real data — the Savannah
   demo year — is already in `xgcroo…`, which is also where migrations 011 and 012 were just applied.
2. **The two `projects` tables were never in conflict** because they were never in the same
   database. They are genuinely different entities that collided on a name.

## The collision surface is exactly one table

Full set intersection of the two schemas — the engine's 18 tables across migrations 001–012, against
drizzle's 44-entry `tablesFilter`:

```
{ projects }
```

That is the whole list, and it stays the whole list once the unapplied engine migrations (004, 008,
009, 010) land: they create `developer_submissions`, `backtest_reports`, `offerings`,
`project_documents`, `investors`, `investor_holdings`, `distribution_history`,
`distribution_preferences`, `suitability_profiles` — none of which drizzle claims. The near-misses
(`documents` vs `project_documents`, `distributions` vs `distribution_history`) are distinct names.

## The hazard to handle first

`drizzle.config.ts` lists `"projects"` in `tablesFilter`, and Render's `buildCommand` runs
`npm run db:push:ci` → `drizzle-kit push --force`.

`tablesFilter` is the set of tables drizzle believes it owns. Point `DATABASE_URL` at `xgcroo…`
while `"projects"` is still in that list, and the next deploy compares drizzle's varchar `projects`
against the engine's uuid `projects` and reconciles them — with `--force`, without asking. The
engine's `projects` row is the parent of `raw_readings`, `verification_records`, `engine_runs` and
now `polymesh_assets`.

**So the filter has to be corrected before the repoint, not with it.** That change is in this commit;
everything else below is not yet done.

## Recommended approach: rename the drizzle table, consolidate into `xgcroo…`

Rename drizzle's SQL table, not the engine's. The asymmetry is decisive:

- The **drizzle** name appears exactly once, at `shared/schema.ts:293`:
  `export const projects = pgTable("projects", {…})`. Only the string changes — the exported symbol
  stays `projects`, so all ~169 TypeScript references are untouched. There are no raw-SQL references.
- The **engine** name is a hardcoded string in 10+ `supabase.from("projects")` call sites across
  three packages (`server/services/backtest-supabase-writer.ts`, `ecoxchange-dashboard/src/data/{index,reference,impact}.ts`),
  plus the FKs in migrations 001 and 012, and its own migration history.

`dev_projects` is the proposed name — it is the development-pipeline entity, distinct from the
physical plant. The name is a one-line decision and easy to change; the direction of the rename is not.

### Steps

1. **[done in this commit]** `shared/schema.ts:293` → `pgTable("dev_projects", …)`, and
   `drizzle.config.ts` `tablesFilter`: `"projects"` → `"dev_projects"`.
   Until `DATABASE_URL` moves, this is a no-op rename against an empty table in `ojwof…`.
2. Apply the still-unapplied engine migrations to `xgcroo…` if you want them: 004, 008, 009, 010.
   (001, 011, 012 are applied; 002/003/005/006/007 are RLS, buckets and columns.)
3. Point every environment variable at `xgcrooajrdpcgpgoazti`:
   `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`. Render, Cloudflare Workers build vars, and local `.env`.
4. Run `drizzle-kit push` **without** `--force` first and read the plan. Expect ~44 creates and zero
   drops. A proposed drop of `projects`, `raw_readings`, `verification_records` or `engine_runs`
   means step 1 did not take — stop.
5. Verify the engine tables survived and still hold 1 project / 12 verification_records.
6. Pause `ojwof…`, keep it for a week, then delete.

### What consolidation fixes beyond tidiness

`verification_engine/meter_source.py` reads `meters` and `sgt_intervals` from `SUPABASE_URL`. Those
tables exist only in `ojwof…`. The reconciliation engine writes `verification_records`, which exists
only in `xgcroo…`. Both read the same environment variable, so today at least one of those two paths
is pointed at a database that does not have its tables. One database makes that class of bug
impossible rather than latent.

### RLS, which the merge gets right for free

`xgcroo…` has an active event trigger, `ensure_rls`, running `public.rls_auto_enable()` on
`ddl_command_end`. Every new table created in `public` gets RLS enabled automatically. So the 44
drizzle tables arrive locked down — no policies, deny-all for `anon` and `authenticated` — while the
Express server keeps working because it connects as `postgres`/service-role and bypasses RLS.

That is the desired outcome, but it is worth stating explicitly, because the dashboard's **anon key
will be pointed at this same database**. Any drizzle table that should be publicly readable needs an
explicit policy, and any that should not simply stays closed. Do not "fix" a table returning empty
under the anon key by disabling RLS on it.

## The alternative considered and not recommended

Put the engine tables in their own Postgres schema (`engine.projects`) and leave drizzle in `public`.
Architecturally cleaner — no rename, and the two `projects` coexist honestly under different
namespaces. Rejected for now because it touches every `supabase-js` call site (`.schema('engine')`),
the PostgREST exposed-schemas setting, and the Python PostgREST URL paths, to solve a problem that
one renamed table already solves. Worth revisiting if a second name ever collides.

## Not done here

- No environment variables were changed. Steps 2–6 above are all untouched.
- `ojwof…` is untouched and still running.
- `listcraft-prod` (`wtvovergzmprzgqasodh`) is a different product and remains paused.
