# GridStatus interconnection queue pipeline

This app stores **normalized solar rows** from public ISO interconnection queues (via the [GridStatus](https://opensource.gridstatus.io) Python library), pre-computes **NSRDB-based production**, **PPA/market references**, and a **prospect cashflow waterfall**, and surfaces results in **Investor → Marketplace → Interconnection queue**.

## Supabase / Postgres

- Provision a Supabase project (or any Postgres).
- Copy the **connection string** (use **Session mode** or **Transaction** pooler URL for serverless; for a long-running Node process, direct `5432` is fine).
- Set `DATABASE_URL` in the environment where Express runs:

  ```bash
  export DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
  ```

- Apply migrations (includes `interconnection_queue_entries`, `queue_entry_analytics`, `jurisdiction_ppa_benchmarks`, `projects.queue_entry_id`):

  ```bash
  npm run db:push
  # or run SQL files under migrations/ in order on your database
  ```

- **RLS**: Not required if the API only talks to Postgres through this Express server using a single DB user with full DDL/DML. Enable RLS only if you expose Supabase client-side reads.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (Supabase compatible) |
| `NREL_API_KEY` | NSRDB / annual kWh modeling |
| `SOLCAST_API_KEY` | Optional Solcast alignment in backtest |
| `GRIDSTATUS_ISOS` | ETL: comma ISO list (default `CAISO,PJM,SPP`) |

## ETL (Python)

```bash
cd etl/gridstatus
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=...
export GRIDSTATUS_ISOS=CAISO,PJM,SPP
python sync_interconnection_queue.py
```

The script filters rows whose **fuel / resource** text looks like solar (see script). Column names vary by ISO; the script maps common aliases.

## Analytics batch

After ETL, compute stored analytics (NSRDB + waterfall):

```bash
npx tsx scripts/compute-queue-analytics.ts 50
```

Or **Admin** `POST /api/admin/queue-analytics/batch` with JSON `{ "limit": 50 }`.

Investors can also trigger per-row recompute: `POST /api/investor/queue-entries/:id/recompute` (rate-limited).

## Ops / scheduling

- **Cron**: Run ETL daily or weekly, then the batch analytics script.
- **GitHub Actions**: Matrix over `GRIDSTATUS_ISOS` or a single job with the default list.
- **Supabase**: You can use `pg_cron` to `HTTP POST` your own admin endpoint that runs the Node batch script in your deployment.

## Data attribution

Interconnection queue data is published by **ISOs/RTOs**; GridStatus aggregates standardizes access. Use your counsel’s **terms of use** for each ISO’s public data. The investor UI includes a short disclaimer: modeled economics are **illustrative**, not an offer to sell securities.

## Jurisdiction PPA table (optional)

Insert rows into `jurisdiction_ppa_benchmarks` to override the built-in `resolveMarketPpaUsdPerKwh` logic (e.g. state + ISO + `benchmark_usd_per_mwh`).

```sql
INSERT INTO jurisdiction_ppa_benchmarks (state, iso_code, region_label, benchmark_usd_per_mwh, source_note)
VALUES ('TX', 'ERCOT', 'ERCOT hub proxy', 62.0, 'Desk example');
```
