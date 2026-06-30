"""Offline tests for per-site interannual variability (§3).

The NSRDB fetch and Supabase cache are out of scope here (network); we test the
pure stats, the cache-key derivation, and the graceful default fallback.
"""
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.verification_engine.config import Location
from src.verification_engine.uncertainty import (
    DEFAULT_INTERANNUAL_VARIABILITY, build_budget,
)
from src.verification_engine.site_uncertainty import (
    interannual_variability_from_annual_totals, site_key,
)


def test_variability_matches_std_over_mean():
    totals = [1000.0, 1100.0, 900.0, 1050.0, 950.0]
    sigma = interannual_variability_from_annual_totals(totals)
    import numpy as np
    expected = float(np.std(np.array(totals), ddof=1) / np.mean(totals))
    assert abs(sigma - expected) < 1e-9
    assert 0.0 < sigma < 0.2


def test_low_variability_site_is_tighter_than_default():
    # A desert site with very stable annual GHI should beat the 3.5% default.
    steady = [2000.0, 2010.0, 1995.0, 2005.0, 2002.0]
    assert interannual_variability_from_annual_totals(steady) < DEFAULT_INTERANNUAL_VARIABILITY


def test_high_variability_site_exceeds_default():
    swingy = [1000.0, 1300.0, 800.0, 1250.0, 900.0]
    assert interannual_variability_from_annual_totals(swingy) > DEFAULT_INTERANNUAL_VARIABILITY


def test_insufficient_years_falls_back_to_default():
    assert interannual_variability_from_annual_totals([1000.0]) == DEFAULT_INTERANNUAL_VARIABILITY
    assert interannual_variability_from_annual_totals([]) == DEFAULT_INTERANNUAL_VARIABILITY
    # zeros / None are dropped before the count check
    assert interannual_variability_from_annual_totals([0.0, None, 1000.0]) == DEFAULT_INTERANNUAL_VARIABILITY


def test_per_site_sigma_moves_p90():
    """A tighter site sigma should lift P90 (less downside) vs the default."""
    base = build_budget(1_000_000.0)
    tighter = build_budget(1_000_000.0, overrides={"interannual_variability": 0.01})
    assert tighter.total_sigma < base.total_sigma
    assert tighter.p90_kwh > base.p90_kwh  # higher P90 = less conservative tail


def test_site_key_is_stable_grid():
    k = site_key(Location(35.0512, -106.5419))
    assert k == "35.051,-106.542"


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-q"]))
