# @ecoxchange/onboarding

Developer onboarding API + background worker. A solar developer submits a 4-step intake form; the worker calls the `irradiance-mcp-server` for 12 months of satellite data, runs the reconciliation engine's physics model, optionally fetches real inverter production via `solar-plant-mcp-server` for a three-way reconciliation, generates a JSON + Markdown report, uploads it to Supabase Storage, and creates a `projects` row in `onboarding` status.

## Layout

```
src/
├── api/routes.ts             POST /submit, GET /status/:id, GET /report/:id, POST /verify-credentials
├── crypto/secret.ts          AES-256-GCM for inverter API keys at rest
├── db/{client,submissions,reports}.ts
├── orchestration/
│   ├── mcp-client.ts         tools/call HTTP shim
│   ├── processor.ts          processSubmission(id) — full workflow
│   └── worker.ts             60s polling
├── reconciliation-bridge/    minimal copy of physics + reconcile (in sync with the engine)
├── report/{generator,markdown,storage}.ts
├── utils/{dates,formatters,types,validation}.ts
└── index.ts                  Express + worker bootstrap on port 3004
```

## Run

```
npm install
npm run check                 # tsc --noEmit
npm test                      # unit tests
npm run dev                   # tsx watch + worker on port 3004
npm run start                 # production build then node
```

Required `.env`:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ONBOARDING_ENCRYPTION_KEY=<32-byte hex>     # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
IRRADIANCE_MCP_URL=http://localhost:3002/mcp
SOLAR_PLANT_MCP_URL=http://localhost:3001/mcp
PORT=3004
DASHBOARD_ORIGIN=http://localhost:5173
```

Set `ONBOARDING_WORKER=off` to start the API only (handy for tests or when running multiple API replicas).

## End-to-end flow

1. **Submit** — `POST /api/onboard/submit` with the validated `IntakeForm`. Inverter API key (if provided) is AES-256-GCM encrypted before insert. Returns `{submission_id, status: "submitted"}`.
2. **Worker polls** every 60s; soft-claims a row by flipping `submitted → validating`.
3. **Validate** — checks irradiance coverage via `irradiance_check_coverage`. Validates inverter credentials best-effort; failures degrade to satellite-only.
4. **Backtest** — pulls last 12 full months of daily irradiance, runs `calculateExpectedGeneration` per month.
5. **Reconcile** (if creds valid) — fetches monthly production for each month and runs `reconcile()`.
6. **Report** — builds a `DeveloperBacktestReport`, renders markdown, uploads JSON + MD to the `onboarding-reports` storage bucket, inserts a `backtest_reports` row, creates a `projects` row in `onboarding` status, flips submission to `report_ready`.
7. **Status / Report** — `GET /status/:id` for progress; `GET /report/:id` for the full report JSON + signed download URL.

## Tests

```
npm test                      # crypto round-trip, schema validation, report generator
npm run test:integration      # gated; expects a live Supabase project + MCP servers
```

## Verified end-to-end

Against Supabase project `npblqnynzeirmrifiwkd` and `irradiance-mcp-server`:

```
POST /api/onboard/submit       → submission_id=dd33...026b, status=submitted
60s later (worker tick)        → backtesting → report_ready
GET  /api/onboard/report/<id>  → annual_expected_mwh: 8119.5 (in PVWatts band)
                                 capacity_factor_pct: 18.5
                                 estimated_annual_revenue: $690,156
                                 yield_on_equity_pct: 27.6
                                 best_month: 2025-07 (842 MWh)
                                 worst_month: 2025-12 (451 MWh)
                                 seasonal_ratio: 1.87
```

A new `projects` row in `status='onboarding'` is created per submission; it does NOT appear in the investor dashboard's portfolio (which filters `status='active'`).

## Caveats and follow-ups

- **AES-256-GCM with env key** is the chosen baseline. Supabase Vault (pgsodium) is a stronger future upgrade.
- **Persona verification** for developers is intentionally not gated here; the existing `server/routes.ts` developer flow already handles that and this portal trusts the submitter for MVP.
- **Physics model is duplicated** (not workspace-linked) into `reconciliation-bridge/`. Source of truth is `ecoxchange-reconciliation-engine/src/physics/`. Keep in sync.
- **No PDF, no email notifications, no rate limiting, no Calendly link** — all deferred to Phase 4.
- **Worker is a single-instance polling loop**, not a queue. Acceptable at MVP scale; revisit when submissions outgrow it.
