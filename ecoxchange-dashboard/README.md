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

## Phase 3: Supabase live mode

Set in `.env`:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

When both are present, `src/data/index.ts` queries the live `projects` and
`verification_records` tables. Falls back to demo JSON if either is unset.
(Phase 3 implementation pending — currently demo-only.)
