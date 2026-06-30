# EcoXchange Production-Verification Engine

A physics-based engine that produces **audit-grade, P50/P90 expected-energy
estimates** for solar assets from free satellite data and reconciles them against
the revenue meter. Built to mirror what an Independent Engineer (IE) report
contains, so the data is credible to lenders, allocators, and an eventual IE
review.

This is the upgrade from a hand-rolled irradiance→energy correlation to a proper
modelchain. It runs today on entirely free data sources.

---

## What changed (the accuracy upgrades)

| Upgrade | Where | Why it matters |
|---|---|---|
| Multi-source irradiance, median-triangulated | `irradiance.py` | Kills single-source satellite bias (~3–5%); the inter-source spread becomes a real uncertainty term |
| pvlib PVWatts **ModelChain** (POA → cell temp → DC → inverter) | `modelchain.py` | Replaces correlation with physics; output is defensible expected energy |
| Explicit **loss waterfall** + age degradation | `losses.py` | Each loss is its own line, exactly as an IE expects — not an opaque derate |
| **P50/P90** with itemized uncertainty budget | `uncertainty.py` | Solar finance underwrites to P90; this is the language investors read |
| **Robust** reconciliation (median/MAD) + anomaly flags | `reconcile.py` | A bad meter interval can't move the verdict; divergence = soiling/outage/fraud signal |
| IE-style report + **full audit trail** | `report.py` | Every source, version, param, config hash — the reproducibility that makes data bankable |
| **PVDAQ validation harness** (RMSE/MBE vs measured) | `validate_pvdaq.py` | Benchmarks the method against free NREL ground truth → "validated methodology," not "backtest" |

---

## Architecture

```
config (YAML)
   │
   ▼
irradiance.py ── NSRDB ┐
                NASA POWER ├─► triangulate() ─► weather (median) + spread
                PVGIS  ┘
   │
   ▼
modelchain.py  ─► pvlib PVWatts ModelChain ─► gross AC energy
   │
   ▼
losses.py      ─► soiling/shading/.../availability + degradation ─► net energy + waterfall
   │
   ▼
uncertainty.py ─► quadrature of error sources ─► P50 / P90 / P99
   │
   ▼
reconcile.py   ─► net energy vs revenue meter ─► PR, robust bias, anomalies
   │
   ▼
report.py      ─► IE-style JSON + audit trail
```

`validate_pvdaq.py` is a parallel track: run the engine on a free NREL PVDAQ
system and report how close the satellite-only estimate is to measured output.

---

## Quick start

```bash
pip install -r requirements.txt

# Free keys (no cost):
#   NREL  -> https://developer.nrel.gov/signup/   (for NSRDB)
export NREL_API_KEY=...        # optional; NASA POWER works with no key
export NREL_EMAIL=you@ecoxchange.net

python -m src.run_verification \
    --config config/system_example.yaml \
    --year 2023 \
    --meter data/meter_2023.csv \
    --out report.json
```

Meter CSV format (override column names with `--meter-ts-col` / `--meter-kwh-col`):

```
timestamp,energy_kwh
2023-01-01 00:00:00,0.0
2023-01-01 01:00:00,0.0
...
```

Run the validation harness separately once you've picked a PVDAQ system:

```python
from src.validate_pvdaq import fetch_pvdaq_power, validate_against_pvdaq
# fetch measured -> fetch irradiance for same site/year -> validate_against_pvdaq(...)
```

---

## Data sources (all free)

| Source | Key needed? | Coverage | pvlib function (0.15.x) |
|---|---|---|---|
| NSRDB PSM4 | Free NREL key + email | Americas + more | `get_nsrdb_psm4_aggregated` |
| NASA POWER | None | Global | `get_nasa_power` |
| PVGIS | None | EU/Africa/Asia (sparse US) | `get_pvgis_hourly` |
| NREL PVDAQ (validation) | Free NREL key | US instrumented systems | (REST, see harness) |

---

## Integration points to wire in Claude Code

1. **Meter source** — replace the CSV loader in `run_verification.load_meter`
   with a Supabase query against your interval/meter table. The engine only
   needs a tz-aware `Series` of kWh-per-interval.
2. **Secrets** — `NREL_API_KEY` / `NREL_EMAIL` from your env/secret manager;
   nothing is hardcoded.
3. **Persistence** — write the `report.to_dict()` JSON into the
   `expected_generation_reports` table keyed by `(project_id, period, config_hash)`
   for the on-chain/audit trail. (Distinct from the TS `verification_runs`
   three-source verdict table — do not conflate the two.)
4. **Scheduling** — call `run_verification` monthly per asset from a Vercel cron /
   job runner; alert on `reconciliation.n_anomalies > 0` or `bias_pct` drift.
5. **PVDAQ validation** — confirm the live PVDAQ endpoint + per-system column
   names (flagged in `validate_pvdaq.py`) before trusting the fetch.

---

## Known caveats (read before production)

- **pvlib version sensitivity.** Written for pvlib **0.15.x** (NSRDB = PSM4). On
  ≤0.12 the function is `get_nsrdb_psm3` with a different signature. Pin pvlib.
- **PVDAQ schema drift.** Endpoint paths and column names vary per system; the
  metric math is correct, the fetch/column mapping needs live verification.
- **Normal P90 assumption.** P90/P99 use a normal annual-energy distribution.
  Fine for now; revisit with a lognormal fit once you have multiple operating years.
- **PVWatts vs full model.** PVWatts is the right call when you lack module/inverter
  datasheets. With real datasheets, switch the DC model to the single-diode (CEC)
  model in `modelchain.py` for a further accuracy gain.
- **Software, not an engineering certification.** This produces investment-quality
  *data and methodology*; it does not replace a stamped IE report. See the
  "investment grade" ladder we discussed — this is the free foundation that makes
  the eventual IE review reconcile cleanly.
```
