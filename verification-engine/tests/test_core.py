"""Tests for the deterministic core (no network)."""
import sys, os
from datetime import date

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.verification_engine.config import SystemConfig, Location, ArrayConfig, LossAssumptions
from src.verification_engine.losses import apply_losses, total_derate_pct, degradation_factor
from src.verification_engine.reconcile import reconcile
from src.verification_engine.uncertainty import build_budget


def _cfg():
    return SystemConfig(
        name="t", location=Location(35.0, -106.5, tz="America/Denver"),
        array=ArrayConfig(surface_tilt=30, dc_capacity_kw=1000, ac_capacity_kw=850),
        losses=LossAssumptions(), commission_date=date(2021, 1, 1),
    )


def test_waterfall_monotonic_and_consistent():
    cfg = _cfg()
    net, wf = apply_losses(cfg, 1000.0, date(2023, 7, 1))
    energies = [w.energy_after_kwh for w in wf]
    assert all(b <= a for a, b in zip(energies, energies[1:])), "waterfall must be non-increasing"
    assert abs(net - energies[-1]) < 1e-9
    # combined derate equals 1 - net/gross
    assert abs(total_derate_pct(cfg, date(2023, 7, 1)) - (1 - net / 1000.0) * 100) < 1e-6


def test_degradation_increases_with_age():
    cfg = _cfg()
    f_young, _ = degradation_factor(cfg, date(2022, 1, 1))
    f_old, _ = degradation_factor(cfg, date(2030, 1, 1))
    assert f_old < f_young < 1.0


def test_reconcile_detects_injected_anomaly():
    idx = pd.date_range("2023-06-01", periods=240, freq="h", tz="America/Denver")
    # simple diurnal-ish modeled signal
    hour = idx.hour.values
    modeled = pd.Series(np.clip(np.sin((hour - 6) / 12 * np.pi), 0, None) * 800, index=idx)
    metered = modeled * 0.98  # 2% underperformance, clean
    # inject a bad day (meter reads ~half for 24h)
    metered.iloc[120:144] = modeled.iloc[120:144] * 0.4
    res = reconcile(modeled, metered)
    assert res.performance_ratio < 1.0
    assert len(res.anomalies) > 0, "should flag the injected bad interval(s)"
    assert -5 < res.bias_pct < 0  # robust bias near -2%, not dragged by the spike


def test_p90_below_p50():
    b = build_budget(1_000_000.0, irradiance_spread_frac=0.04)
    assert b.p90_kwh < b.p50_kwh
    assert b.p99_kwh < b.p90_kwh
    assert b.total_sigma > 0.04  # quadrature of several terms exceeds any single one


if __name__ == "__main__":
    test_waterfall_monotonic_and_consistent()
    test_degradation_increases_with_age()
    test_reconcile_detects_injected_anomaly()
    test_p90_below_p50()
    print("ALL TESTS PASSED")
