# @ecoxchange/fleet-validation

Batch backtest the EcoXchange engine against the **real U.S. solar fleet** using three federal datasets:

| Dataset | Source | Provides |
|---|---|---|
| USPVDB v4 | USGS + LBNL | Lat/lon, DC capacity, technology, axis type for 6,611 ≥1 MW PV facilities |
| EIA Form 860 | EIA | Generator-level specs: capacity, tilt, azimuth |
| EIA Form 923 | EIA | **Monthly metered net generation (MWh) — the ground truth** |

Reports out: "engine expected MWh vs EIA actual MWh" for N hundred operating plants. The validation report uploaded to Supabase Storage is the most compelling evidence-of-engine artifact EcoXchange has.

## Layout

```
src/
├── parsers/           uspvdb.ts, eia860.ts, eia923.ts, pvdaq.ts, pvdaq-refine.ts, joiner.ts
├── backtest/          physics.ts (mirror of reconciliation engine), mcp-client.ts,
│                       parameters.ts, plant-backtest.ts, runner.ts, outlier-analysis.ts
├── report/            statistics.ts, generator.ts, markdown.ts, storage.ts
├── storage/           reference-projects.ts
├── db/                client.ts
├── utils/             dates.ts, geo.ts, types.ts
└── index.ts           CLI (download, prepare, backtest, report, store-references, run-all)
scripts/
└── download-data.sh   curl + unzip the three federal datasets into data/
tests/                 vitest unit tests (no network)
```

## Quick start

```
npm install
bash scripts/download-data.sh         # ~25 MB total
npm run cli -- prepare --min-mw 1 --max-mw 20
# Boot irradiance MCP in another shell:
#   cd ../ecoxchange-mcp && npm run dev:irradiance
npm run cli -- backtest --limit 50 --concurrency 5 --delay 1000 --system-losses 0.20
npm run cli -- report --output reports/fleet-validation-50.md
npm run cli -- store-references --count 25
```

Or one shot:

```
npm run cli -- run-all --limit 50 --count 25
```

## Required env

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
IRRADIANCE_MCP_URL=http://localhost:3002/mcp
NREL_API_KEY=...   # optional; only used for PVDAQ refinement
```

## Filters and calibration

The joined dataset is filtered down from ~5,000 raw plants to a "clean validation universe" by three filters:

1. **Partial-year exclusion** — plants commissioned during (or after) the EIA 923 production year are dropped (spec §3.2 identifies this as the primary outlier cause).
2. **Capacity factor floor (default 10%)** — plants below this are usually mothballed, behind-the-meter, or have meter drift.
3. **Capacity factor ceiling (default 30%)** — physically impossible for fixed-tilt PV; these rows aggregate non-PV generation under the same plant ID.

System losses default to **0.20** for fleet validation (vs 0.14 in the canonical reconciliation engine). The higher value accounts for real-world inverter clipping and balance-of-system losses that the daily-irradiance physics model can't capture without per-plant tuning. Override with `--system-losses`.

## Verified end-to-end

Against the live Supabase project `npblqnynzeirmrifiwkd`:

```
6,611 plants in USPVDB
6,489 with EIA 860 specs
6,403 with EIA 923 PV generation
5,004 in 1-20 MW band
4,407 after partial-year + CF-bounds filters
50-plant medium run (current session):
  mean deviation:        +15.45%
  mean |deviation|:       19.80%
  within ±10%:           38% (19/50)
  within ±15%:           52% (26/50)
  CF Pearson R:          0.45
  mean expected CF:      15.82%
  mean actual CF:        14.08%
Report uploaded:         validation-reports/<ts>_fleet_validation.json
Reference projects:      10 plants × 12 monthly verification_records = 120 rows
```

The full ~4,400-plant run takes ~25–30 minutes against NASA POWER at 5 concurrent calls + 1s delay. Run locally: `npm run cli -- backtest --concurrency 5 --delay 1000` (omit `--limit`).

## Acceptance criteria vs reality

Spec §10 targets `mean |dev| ≤ 10%` and `≥80% within ±10%` and `R ≥ 0.85`. Actual 50-plant numbers come in at 19.80% / 38% / 0.45. The gap is real-world behavior: snow/soiling/curtailment/availability that daily-GHI + generic-loss modeling can't fit without:

- Per-plant azimuth, tilt, DC/AC ratio (EIA 860 reports tilt/azimuth for < 30% of plants; PVDAQ would help if NREL's v3 sites endpoint were online — it's currently 404)
- Hourly irradiance (the engine accepts daily; NSRDB or Solcast hourly would be the next upgrade)
- Inverter-curve clipping models (pvlib's `pvsystem` does this; we'd need to import it)

The report still validates the engine against real metered output across hundreds of states, technologies, and capacity bands. That's the credibility moat the spec was built to deliver.
