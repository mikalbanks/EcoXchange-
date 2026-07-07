# EcoXchange Verification Engine — EIA Fleet Benchmark Report

**Engine:** v2.0.0 (pvlib ModelChain, Perez transposition)
**Date:** 2026-07-07
**Fleet:** 5,065 EIA-923 solar plants (2024 data)
**Irradiance source:** NASA POWER API

This is the first clean benchmark of the canonical pvlib ModelChain engine,
stated in absolute terms against federal reported generation.

---

## Summary

| Metric | Value |
|---|---|
| Mean Absolute Deviation | ±13.0% |
| Median Absolute Deviation | ±8.2% |
| Std Dev of Deviations | 18.8% |
| Mean Signed Deviation | +3.4% (overprediction bias) |

## Accuracy Distribution

| Threshold | Plants | Rate |
|---|---|---|
| Within ±5% | 1,601 | 31.6% |
| Within ±10% | 2,938 | 58.0% |
| Within ±15% | 3,633 | 71.7% |
| Within ±20% | 4,025 | 79.5% |

## Top 10 Solar States

| State | Plants | Mean Abs Dev | Median Abs Dev |
|---|---|---|---|
| NC | 701 | ±11.0% | ±7.6% |
| CA | 669 | ±18.9% | ±11.7% |
| MN | 467 | ±10.1% | ±6.7% |
| MA | 463 | ±10.3% | ±6.2% |
| NY | 413 | ±11.7% | ±7.5% |
| NJ | 246 | ±13.4% | ±9.3% |
| FL | 138 | ±15.4% | ±11.6% |
| CO | 135 | ±14.3% | ±9.6% |
| IL | 134 | ±13.9% | ±9.7% |
| GA | 131 | ±9.7% | ±5.1% |

## Capacity Breakdown

| Bucket | Plants | Mean Abs Dev |
|---|---|---|
| < 1 MW | 0 | — |
| 1–5 MW | 2,705 | ±13.4% |
| 5–20 MW (our target) | 1,434 | ±12.0% |
| 20–100 MW | 575 | ±14.1% |
| 100+ MW | 351 | ±11.6% |

## Cohorts

| Cohort | Plants | Mean Abs Dev | Within ±10% |
|---|---|---|---|
| Fixed-tilt (non-curtailed states) | 2,352 | ±10.4% | 65.2% |
| Single/dual-axis tracking | 1,917 | ±13.9% | 54.2% |
| High-curtailment states (CA, TX) | 796 | ±18.3% | 46.0% |

## Notes

- System geometry per plant: USPVDB DC capacity and `axis_type` (tracking is modeled
  with real single-axis geometry, not a boost factor); tilt from EIA-860 where reported,
  otherwise the NREL latitude rule; azimuth from EIA-860 or 180° default.
- Loss and degradation assumptions are the engine defaults (14% system losses,
  0.75%/yr degradation).
- High-curtailment states (CA, TX) are reported as a separate cohort: curtailment-driven
  under-generation is a grid effect, not model error.
- 0 of 5,065 plants failed (none) and are excluded from statistics.
- Success rate 100.0% (≥80% required for a valid benchmark).
