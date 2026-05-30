# @ecoxchange/demo

Public EcoXchange demo portal for **demo.ecoxchange.net**. This is a Vite + React SPA deployed as a Cloudflare Worker. The demo is solar-only and focuses on one-project / one-SPV digital securities for production-verified solar yield.

## Pages

| Route | Purpose |
|---|---|
| `/` | Intro landing page for RIAs, solar developers, investors, and partners |
| `/portfolio` | Investor portfolio and aggregation dashboard |
| `/projects` | Supabase-backed solar project marketplace with filters |
| `/methodology` | Verification engine explainer |
| `/rias` | RIA workflow and dashboard surface |
| `/developers` | Solar project developer workflow |
| `/onboard` | Static demo request-access / solar project intake page |
| `/project/:id` | Project detail with production chart and verification ledger |
| `/project/:id/verification/:period` | Three-way reconciliation detail |
| `/reference` | Demo route index |

## Scripts

```bash
npm install
npm run dev
npm run check
npm run build
npm run smoke:supabase
npm run deploy:dry
npm run deploy
```

## Data

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured, the app queries Supabase `projects` and `verification_records` through `@supabase/supabase-js`.

- `projects` is filtered to `status = active`.
- Project records are further limited to solar records when a technology/category field exists.
- `verification_records.expected_kwh` is treated as the persisted satellite/physics expected-production output.
- The frontend reruns the pure reconciliation decision from inverter, utility, expected production, and `tolerance_config`.
- If a persisted status differs from the recalculated status, the recalculated status is shown and a quiet mismatch note appears.
- Projects without usable expected and inverter data are shown as `Data Required` or `Not Yet Verified`.

When Supabase is not configured, the Savannah 5MW community solar backtest remains the self-contained fallback dataset. The header demo toggle switches between verified and flagged fallback records only.

## Deployment

`wrangler.jsonc` deploys this package as the Cloudflare Worker named `ecoxchange-demo` with a custom domain on **demo.ecoxchange.net**.

## Supabase Notes

No schema changes are required in this pass. The Supabase Data API must expose the relevant tables to the publishable/anon key with appropriate RLS policies for read-only demo access.
