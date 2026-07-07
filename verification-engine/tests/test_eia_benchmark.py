"""Tests for the benchmark runner's publication-layer statistics."""
import time

import numpy as np

from src.run_eia_benchmark import (
    CAPACITY_BUCKETS,
    RateLimiter,
    build_summary,
    render_markdown,
    summarize,
    within_rates,
)
from src.validate_eia_fleet import PlantResult


def _rec(dev, cap, state="NC"):
    return {"deviation_pct": dev, "absolute_deviation_pct": abs(dev),
            "capacity_mw": cap, "state": state}


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


def test_rate_limiter_spacing():
    limiter = RateLimiter(per_second=50.0)  # 20 ms spacing keeps the test fast
    t0 = time.monotonic()
    for _ in range(5):
        limiter.wait()
    assert time.monotonic() - t0 >= 4 * 0.02 - 0.005
