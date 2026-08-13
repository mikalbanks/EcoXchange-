# EcoXchange Spec 20 reproduction status

Status: **blocked on cohort provenance**. No annual, monthly,
calibration, or threshold statistic is verified by this repository yet.

This is a deliberate hard stop, not a failed attempt to tune the model. The
current official 2024 EIA files do not construct the cohort quoted by Spec 20
under the documented selection rules. The committed annual EIA benchmark is a
different 5,065-plant study. It is not a substitute for this monthly fixed-tilt
cohort.

## Reproduce the public-data checkpoint

Use Python 3.11+ in an isolated environment. The model dependency is pinned to
`pvlib==0.15.2` because the physics output is version-sensitive.

```bash
cd verification-engine
python -m venv .venv
.venv/bin/pip install -r requirements-spec20.txt
.venv/bin/python scripts/reproduce_spec20.py
```

The command downloads read-only public files, writes raw/cache data only below
ignored `verification-engine/data/spec20/`, and writes compact derived evidence
below `verification-engine/reports/spec20/`. It does not contact Supabase or any
production service.

Expected exit code today is `2`: the command writes `cohort.csv` and
`evidence.json`, prints the observed counts, and stops before NASA POWER. Use
`--accept-source-drift` only to explore a new study. Any such output must not be
presented as a Spec 20 verification.

## Public-source provenance

| Source | URL | SHA-256 retrieved 2026-08-13 |
|---|---|---|
| EIA-860 2024 | `https://www.eia.gov/electricity/data/eia860/xls/eia8602024.zip` | `0aaae04812cd4ab87a3e346bdf93848a3cc15053fd4dc2a4cf82d2aeac95f12b` |
| EIA-923 2024 final | `https://www.eia.gov/electricity/data/eia923/archive/xls/f923_2024.zip` | `272055f2d748f6486fc3076abd5a40ec736dbff45458bdb4c895761278c50f2b` |

These URLs are not content-addressed. A nominal year and URL are therefore not
enough to identify the bytes used by the study. The missing input is the exact
archive hashes and selection implementation used for the quoted Spec 20 run,
or a derived cohort with equivalent row-level provenance.

## Cohort checkpoint comparison

The code treats blank strings as missing numeric geometry, requires every solar
generator at a plant to be fixed tilt with complete geometry, uses summed EIA
DC and AC capacity, excludes mixed-fuel EIA-923 plants, and computes capacity
factor against AC nameplate.

| Checkpoint | Spec 20 | Current official files | Difference |
|---|---:|---:|---:|
| EIA-860 operable solar generators | 7,154 | 7,154 | 0 |
| Fixed-tilt PV generators with complete geometry/DC | 3,931 | 3,940 | +9 |
| Pure fixed-tilt plants with complete geometry | 3,453 | 3,459 | +6 |
| 1–20 MW DC, online by 2022 | 2,915 | 2,919 | +4 |
| EIA-923 pure-solar matches | 2,711 | 2,716 | +5 |
| CF 5–40%, positive generation, coordinates | 2,635 | 2,634 | -1 |
| Successfully modeled | 2,621 | not run | — |
| Plant-months | 31,356 | not run | — |

The first mismatch occurs before NASA weather or pvlib is involved. Continuing
would answer a different question with a different cohort.

## Model contract encoded for the unblocked run

`src/spec20_backtest.py` keeps this model separate from the production Engine A
defaults so later Specs 21–23 are unchanged:

- pvlib 0.15.2;
- Hay-Davies transposition, physical AOI, no spectral correction;
- PVWatts DC with `gamma_pdc=-0.004` and EIA-860 DC net capacity;
- PVWatts inverter with `pdc0 = AC nameplate / 0.96` and
  `eta_inv_nom=0.96`;
- SAPM open-rack glass/polymer temperature;
- 14% system losses;
- 0.75% per year linear degradation from commissioning;
- tz-aware UTC weather and a hard failure when more than 1% of GHI energy lies
  below the astronomical horizon;
- longitude-derived fixed offsets for EIA monthly boundaries.

## Quoted results comparison

No statistic below is computed because the cohort gate fails. The repository
must not hardcode these values into an artifact and call that reproduction.

| Evidence family | Spec 20 values | Current result |
|---|---|---|
| Annual deviation | p5 -38.2%, p10 -24.4%, p25 -9.3%, p50 +0.2%, p75 +6.6%, p90 +13.7%, p95 +27.1%, mean -1.7%, within ±15% 73.7%, within ±25% 84.9% | unverified |
| Monthly uncalibrated | ±10 57.7%, ±15 40.7%, ±20 30.6%, ±25 24.6% | unverified |
| Seasonal behavior | Jan -27.3%, Dec -20.9%, winter MAD 12.0%, Mar–Nov MAD 5.1% | unverified |
| Cohort factors | 0.73, 0.98, 1.04, 1.07, 1.06, 1.05, 1.06, 1.06, 1.05, 1.02, 0.94, 0.80 | unverified |
| Hold-out | 15,190 plant-months; raw/seasonal/per-plant IQR and MAD | unverified |
| Flat ±15 | uncalibrated 39.2%, calibrated 25.8% | unverified |
| Adaptive thresholds | single-month gate 10.6%, gate + persistence 11.4%, detection 32.9%, never gate 64.1%, repeatedly gate 15.8% | unverified |

`npm run replay:holdout` in `ecoxchange-reconciliation-engine` reads the
committed evidence manifest by default and exits non-zero with the source
mismatch. It no longer prints “skipped” and exits successfully. Once the exact
derived hold-out exists, set `HOLDOUT_DATASET` to replay it; the script rejects
any cardinality other than 15,190. It computes raw, seasonally corrected, and
per-plant calibrated IQR/MAD, and explicitly reports any pending-calibration
plants whose cap-band outcomes must not be presented as verified.

## Required artifacts after provenance is recovered

The evidence manifest reserves these deterministic stages:

1. `cohort.csv`: row-level EIA geometry, capacity, commissioning, coordinates,
   and monthly actuals;
2. `merged_results.csv`: per-plant modeling checkpoint and NASA cache hash;
3. `monthly_long.csv`: one row per scored plant-month;
4. `holdout_results.json`: odd-month fit and even-month evaluation with frozen
   per-plant calibration;
5. `threshold_evaluation.json`: gate, detect, and persistence outcomes.

Raw EIA archives and hourly NASA cache files stay ignored. Compact derived
artifacts, their SHA-256 hashes, source hashes, row counts, model parameters,
and software versions are reviewable offline.

## Known limits

- EIA-923 reports net generation while the model estimates gross inverter-side
  production after assumed system losses.
- The study is fixed-tilt only.
- Monthly aggregation cannot distinguish outages, clipping, curtailment,
  soiling, or reporting corrections inside a month.
- Model error and true plant underperformance are inseparable from these public
  data alone.
- This is one 2024 weather/production year.
- Month boundaries use longitude-derived fixed offsets, not legal time zones or
  daylight-saving transitions.
- The inverter-versus-utility leg is not validated by this study. Spec 23's
  adaptive band applies only to CHECK A and remains unchanged.
