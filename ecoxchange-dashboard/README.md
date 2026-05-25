# EcoXchange Investor Dashboard

Standalone React + Vite + Tailwind + Recharts prototype. Three immediate purposes: developer demo, investor demo, fundraising pitch asset.

## Layout

- `/` — Portfolio overview (summary stats + project cards).
- `/project/:id` — Project detail (production chart, latest verification, monthly yield table). Demo toggle: "Show Flagged".
- `/project/:id/verification/:period` — Verification detail (three-way reconciliation diagram + tolerance bands + irradiance).

## Run

```
npm install
npm run dev     # http://localhost:5173
npm run build   # tsc + vite build
npm run check   # tsc only
```

## Demo mode (default)

Reads the baked-in JSON in `src/data/`. The Savannah 5MW data mirrors the
0% backtest produced by `ecoxchange-reconciliation-engine`. The flagged
variant simulates a -20% inverter deviation.

## Live mode (Supabase)

Set both in `.env` (gitignored):
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

When both are present, `src/data/index.ts` queries the live `projects` and
`verification_records` tables via `@supabase/supabase-js`. Falls back to demo
JSON when either var is unset. A "Live" / "Demo" badge in the header makes
the mode visible at a glance.

- Reads pass through the anon key; RLS policies in `ecoxchange-reconciliation-engine/supabase/migrations/002_rls.sql` restrict the anon role to read-only `SELECT` on active projects and all verification records / raw readings / engine runs.
- Project meta is mapped column-for-column. Capacity factor, annual MWh, and revenue totals are computed client-side from `verification_records` (so they always agree with the engine output without a separate materialized view).
- The "Show Flagged (demo)" toggle on the Project Detail page always reads from the static `demo-savannah-flagged.json`, even in live mode, because it's a UX preview of the FLAGGED state, not real production data.
- The investor-side numbers (`total_invested = $50,000`, `investor_share = 2%`) are still placeholders; the real investor-account layer isn't built yet.
