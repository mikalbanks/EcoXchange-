"""Tests for the deterministic core (no network)."""
import sys, os
from datetime import date

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.verification_engine.config import SystemConfig, Location, ArrayConfig, LossAssumptions
from src.verification_engine.losses import apply_losses, total_derate_pct, degradation_factor
from src.verification_engine.modelchain import expected_ac_energy
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


def _clearsky_year(loc: Location, year: int = 2023) -> pd.DataFrame:
    """Deterministic, offline clear-sky weather for one site-year (no network)."""
    import pvlib
    pvloc = pvlib.location.Location(loc.latitude, loc.longitude, tz=loc.tz,
                                    altitude=loc.altitude)
    idx = pd.date_range(f"{year}-01-01", f"{year}-12-31 23:00", freq="h", tz=loc.tz)
    weather = pvloc.get_clearsky(idx)            # ghi / dni / dhi
    weather["temp_air"] = 20.0
    weather["wind_speed"] = 1.0
    return weather


def _site_cfg(tracking: bool) -> SystemConfig:
    # High-DNI reference site (Albuquerque) where tracking gain is unambiguous.
    return SystemConfig(
        name="t", location=Location(35.05, -106.54, altitude=1600, tz="America/Denver"),
        array=ArrayConfig(surface_tilt=30, surface_azimuth=180, dc_capacity_kw=1000,
                          ac_capacity_kw=850, tracking=tracking),
        losses=LossAssumptions(), commission_date=date(2021, 1, 1),
    )


def test_single_axis_tracking_beats_fixed():
    """§1.2: a single-axis tracker must out-yield the same fixed-tilt array.

    Under-predicting a tracking site as fixed-tilt is the ~15-25% error this
    refactor closes, so we require a materially higher annual yield (>8%) and
    that both configs produce sane, positive energy."""
    weather = _clearsky_year(_site_cfg(False).location)
    fixed = float(expected_ac_energy(_site_cfg(False), weather).sum())
    track = float(expected_ac_energy(_site_cfg(True), weather).sum())
    assert fixed > 0 and track > 0
    gain = track / fixed - 1.0
    assert gain > 0.08, f"tracking gain only {gain*100:.1f}% (expected ~15-25%)"
    assert gain < 0.40, f"tracking gain implausibly high at {gain*100:.1f}%"


if __name__ == "__main__":
    test_waterfall_monotonic_and_consistent()
    test_degradation_increases_with_age()
    test_reconcile_detects_injected_anomaly()
    test_p90_below_p50()
    test_single_axis_tracking_beats_fixed()
    print("ALL TESTS PASSED")
