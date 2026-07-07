"""Tests for the benchmark runner's publication-layer statistics."""
import time

import numpy as np

from src.run_eia_benchmark import (
    CAPACITY_BUCKETS,
    RateLimiter,
    build_summary,
    is_underperformer,
    publication_cohort,
    render_markdown,
    summarize,
    within_rates,
)
from src.validate_eia_fleet import PlantResult


def _rec(dev, cap, state="NC", cf=18.0, curtailed=False):
    return {"deviation_pct": dev, "absolute_deviation_pct": abs(dev),
            "capacity_mw": cap, "state": state, "actual_cf_pct": cf,
            "high_curtailment": curtailed, "eia_plant_id": "x", "name": "n"}


def test_within_rates_thresholds():
    devs = np.array([2.0, -4.0, 8.0, -12.0, 18.0, 25.0])
    r = within_rates(devs)
    assert r["within_5_pct"] == 2
    assert r["within_10_pct"] == 3
    assert r["within_15_pct"] == 4
    assert r["within_20_pct"] == 5
    assert r["within_20_pct_rate"] == round(100 * 5 / 6, 1)


def test_summarize_core_metrics_and_buckets():
    recs = [_rec(5.0, 2.0), _rec(-5.0, 2.0), _rec(15.0, 10.0), _rec(-15.0, 150.0, "CA")]
    s = summarize(recs)
    assert s["mean_absolute_deviation_pct"] == 10.0
    assert s["median_absolute_deviation_pct"] == 10.0
    assert s["mean_signed_deviation_pct"] == 0.0  # symmetric -> unbiased
    buckets = {b["bucket"]: b for b in s["by_capacity"]}
    assert buckets["1–5 MW"]["count"] == 2
    assert buckets["5–20 MW"]["count"] == 1
    assert buckets["100+ MW"]["count"] == 1
    assert buckets["< 1 MW"]["count"] == 0
    assert {b[0] for b in CAPACITY_BUCKETS} == set(buckets)


def test_summarize_state_breakdown_sorted_by_count():
    recs = [_rec(4.0, 2.0, "NC")] * 3 + [_rec(6.0, 2.0, "CA")] * 2 + [_rec(1.0, 2.0, "MA")]
    rows = summarize(recs)["by_state"]
    assert [r["state"] for r in rows[:2]] == ["NC", "CA"]
    assert rows[0]["count"] == 3


def _result(dev):
    return PlantResult("1", "n", "NC", "Fixed", False, False, "nasa_power",
                       100 + dev, 100, dev, 20, 20, abs(dev) <= 10, abs(dev) <= 5)


def test_build_summary_gates():
    recs = [_rec(d, 5.0) for d in (2.0, -3.0, 4.0)]
    results = [_result(d) for d in (2.0, -3.0, 4.0)]
    s = build_summary(recs, attempted=3, failure_reasons={}, year=2024,
                      plant_results=results)
    assert s["benchmark_valid"] and s["validated"]  # MAD 3% <= 10, 100% success

    # Below 80% success -> invalid regardless of MAD.
    s2 = build_summary(recs, attempted=10, failure_reasons={"nasa_power_fetch_error": 7},
                       year=2024, plant_results=results)
    assert not s2["benchmark_valid"] and not s2["validated"]
    assert s2["plants_failed"] == 7


def test_build_summary_mad_gate_blocks_validation():
    recs = [_rec(d, 5.0) for d in (20.0, -18.0, 25.0)]
    results = [_result(d) for d in (20.0, -18.0, 25.0)]
    s = build_summary(recs, attempted=3, failure_reasons={}, year=2024,
                      plant_results=results)
    assert s["benchmark_valid"] and not s["validated"]  # ran fine, gate failed


def test_render_markdown_no_legacy_references():
    recs = [_rec(3.0, 5.0)]
    s = build_summary(recs, attempted=1, failure_reasons={}, year=2024,
                      plant_results=[_result(3.0)])
    md = render_markdown(s)
    assert "first clean benchmark" in md
    assert "15.45" not in md and "TypeScript" not in md
    assert "5–20 MW (our target)" in md
    assert "| Within ±10% | 1 |" in md


def test_is_underperformer_requires_both_conditions():
    assert is_underperformer(_rec(20.0, 5.0, cf=11.0))       # sick: low CF + big overpred
    assert not is_underperformer(_rec(20.0, 5.0, cf=18.0))   # healthy CF, honest miss
    assert not is_underperformer(_rec(5.0, 5.0, cf=11.0))    # low CF but well-predicted
    assert not is_underperformer(_rec(-20.0, 5.0, cf=11.0))  # underprediction never counts


def test_publication_cohort_reasons_and_overlap():
    recs = [
        _rec(2.0, 5.0),                                  # kept
        _rec(3.0, 5.0, state="CA", curtailed=True),      # curtailment only
        _rec(30.0, 5.0, cf=11.0),                        # underperformer only
        _rec(30.0, 5.0, state="TX", cf=11.0, curtailed=True),  # both
    ]
    kept, excluded = publication_cohort(recs)
    assert len(kept) == 1 and len(excluded) == 3
    reasons = sorted(tuple(e["reasons"]) for e in excluded)
    assert reasons == [("curtailment_state",), ("curtailment_state", "underperformer"),
                       ("underperformer",)]


def test_gate_reads_publication_cohort_not_full_fleet():
    # Full fleet fails the 10% gate (one huge sick outlier), but the healthy
    # cohort passes -> validated must be True.
    recs = [_rec(d, 5.0) for d in (4.0, -5.0, 6.0)] + [_rec(80.0, 5.0, cf=10.5)]
    results = [_result(d) for d in (4.0, -5.0, 6.0, 80.0)]
    s = build_summary(recs, attempted=4, failure_reasons={}, year=2024,
                      plant_results=results)
    assert s["mean_absolute_deviation_pct"] > 10.0
    assert s["publication"]["n"] == 3
    assert s["publication"]["mean_absolute_deviation_pct"] <= 10.0
    assert s["validated"]


def test_markdown_publication_section():
    recs = [_rec(3.0, 5.0), _rec(25.0, 5.0, cf=11.0)]
    s = build_summary(recs, attempted=2, failure_reasons={}, year=2024,
                      plant_results=[_result(3.0), _result(25.0)])
    md = render_markdown(s)
    assert "Publication Cohort" in md
    assert "provable underperformers | 1" in md
    assert "15.45" not in md


def test_rate_limiter_spacing():
    limiter = RateLimiter(per_second=50.0)  # 20 ms spacing keeps the test fast
    t0 = time.monotonic()
    for _ in range(5):
        limiter.wait()
    assert time.monotonic() - t0 >= 4 * 0.02 - 0.005
