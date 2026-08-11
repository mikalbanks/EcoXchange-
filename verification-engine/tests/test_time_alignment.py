"""Spec 20 §2.1 guardrails — the weather index means what it says.

The NASA POWER hourly endpoint returns **local solar time** unless
`time-standard=utc` is asked for. Measured against the live API for Greeley CO
(lon -104.71) on 2024-06-15, the GHI peak sits at hour 11 with the parameter
omitted and at hour 18 with it set: a 7-hour shift, ~`round(lon / 15)`.

pvlib 0.15.x asks for UTC, so the engine is correct today. Nothing asserted it,
which means a pvlib change or a hand-built frame could reintroduce the shift
silently — and a phase error of that size does not look like a crash, it looks
like slightly-wrong energy numbers that still pass every tolerance band.

The night-energy assertion is the tripwire: a longitude-sized phase error puts
production in the middle of the local night, which is physically impossible and
therefore unambiguous. `test_night_energy_assertion_has_teeth` proves the
tripwire fires by feeding it the exact LST-read-as-UTC mistake.
"""
import os
import sys
from datetime import date

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.verification_engine.config import (
    ArrayConfig, Location, LossAssumptions, SystemConfig,
)
from src.verification_engine.irradiance import NaiveTimestampError, _normalize
from src.verification_engine.modelchain import expected_ac_energy


# Albuquerque: high-DNI, unambiguous diurnal shape, and far enough west that a
# local-solar-time misread is a 7-hour error rather than a rounding nuisance.
SITE = Location(35.05, -106.54, altitude=1600, tz="America/Denver")
LON_OFFSET_HOURS = round(SITE.longitude / 15.0)   # -7


def _cfg() -> SystemConfig:
    return SystemConfig(
        name="time-alignment", location=SITE,
        array=ArrayConfig(surface_tilt=30, surface_azimuth=180,
                          dc_capacity_kw=1000, ac_capacity_kw=850),
        losses=LossAssumptions(), commission_date=date(2021, 1, 1),
    )


def _clearsky_utc(days: int = 5, start: str = "2024-06-15") -> pd.DataFrame:
    """Deterministic clear-sky weather indexed in UTC, as the fetchers return it."""
    import pvlib
    pvloc = pvlib.location.Location(SITE.latitude, SITE.longitude, tz="UTC",
                                    altitude=SITE.altitude)
    idx = pd.date_range(start, periods=days * 24, freq="h", tz="UTC")
    weather = pvloc.get_clearsky(idx)
    weather["temp_air"] = 20.0
    weather["wind_speed"] = 1.0
    return weather


def _night_mask(index: pd.DatetimeIndex) -> np.ndarray:
    """True where the sun is below the horizon at this site (real geometry, not clock hours)."""
    import pvlib
    solpos = pvlib.solarposition.get_solarposition(
        index, SITE.latitude, SITE.longitude, altitude=SITE.altitude)
    return (solpos["apparent_elevation"] < 0).to_numpy()


def test_no_energy_while_the_sun_is_below_the_horizon():
    """The load-bearing assertion: zero production at night, on real solar geometry."""
    weather = _clearsky_utc()
    energy = expected_ac_energy(_cfg(), weather)

    night = _night_mask(energy.index)
    assert night.sum() > 0, "fixture must actually contain night hours"

    night_kwh = float(energy[night].sum())
    total_kwh = float(energy.sum())
    assert total_kwh > 0, "fixture must produce daytime energy"
    assert night_kwh == pytest.approx(0.0, abs=1e-9), (
        f"{night_kwh:.1f} kWh generated below the horizon — the weather index is "
        f"phase-shifted against solar position (spec 20 §2.1)"
    )


def _max_peak_gap_hours(energy: pd.Series) -> float:
    """Largest gap between a day's peak production and that day's solar noon."""
    import pvlib
    solpos = pvlib.solarposition.get_solarposition(
        energy.index, SITE.latitude, SITE.longitude, altitude=SITE.altitude)
    elevation = solpos["apparent_elevation"].tz_convert(SITE.tz)

    local = energy.tz_convert(SITE.tz)
    gaps = []
    for _, day_energy in local.groupby(local.index.date):
        if float(day_energy.sum()) <= 0:
            continue
        peak_at = day_energy.idxmax()
        solar_noon_at = elevation.loc[day_energy.index].idxmax()
        gaps.append(abs((peak_at - solar_noon_at).total_seconds()) / 3600.0)
    assert gaps, "fixture produced no days with energy"
    return max(gaps)


def test_daily_peak_lands_near_solar_noon():
    """A second, independent read on phase: peak output tracks solar noon."""
    energy = expected_ac_energy(_cfg(), _clearsky_utc())
    gap = _max_peak_gap_hours(energy)
    assert gap <= 1.0, f"peak production sits {gap:.1f} h from solar noon"


def test_night_energy_assertion_has_teeth():
    """Feed the tripwire the actual mistake and require it to fire.

    A guardrail that cannot fail is a comment. This reproduces LST-read-as-UTC by
    shifting the index by `round(lon / 15)` hours — exactly what omitting
    `time-standard=utc` produces.

    The night signal is a **bright line at zero**, not a large fraction. Measured
    on this fixture, the shift moves 1.3% of production below the horizon (192 of
    15,140 kWh) while a correctly-aligned frame puts exactly 0.0 there. It is
    small because pvlib's transposition already returns near-zero POA for a
    below-horizon sun whatever the irradiance column claims — so the mistake
    mostly *destroys* energy rather than relocating it. Hence the two companion
    signals asserted here: a 56% collapse in total energy, and a peak displaced
    past the ±1 h tolerance. Any one of the three failing is a real regression.
    """
    weather = _clearsky_utc()
    mislabeled = weather.copy()
    mislabeled.index = weather.index + pd.Timedelta(hours=LON_OFFSET_HOURS)

    correct = expected_ac_energy(_cfg(), weather)
    shifted = expected_ac_energy(_cfg(), mislabeled)

    night = _night_mask(shifted.index)
    night_kwh = float(shifted[night].sum())

    # 1. The bright line: correct is exactly zero, shifted is not.
    assert float(correct[_night_mask(correct.index)].sum()) == pytest.approx(0.0, abs=1e-9)
    assert night_kwh > 1.0, (
        f"only {night_kwh:.3f} kWh landed below the horizon under a "
        f"{abs(LON_OFFSET_HOURS)}-hour shift — the night-energy assertion would "
        "not catch the regression it exists for"
    )

    # 2. The magnitude signal: a phase error destroys most of the yield.
    lost = 1.0 - float(shifted.sum()) / float(correct.sum())
    assert lost > 0.30, f"shift cost only {lost * 100:.1f}% of annual yield"

    # 3. The phase signal: the peak leaves the ±1 h band asserted above.
    assert _max_peak_gap_hours(shifted) > 1.0, (
        "peak stayed within the solar-noon tolerance despite a "
        f"{abs(LON_OFFSET_HOURS)}-hour index shift"
    )


# ── The UTC contract on the ingestion side ────────────────────────────────────

def test_normalize_rejects_a_naive_index():
    """Naive timestamps carry no time standard, so they are an error, not a default."""
    naive = _clearsky_utc(days=1)
    naive.index = naive.index.tz_localize(None)
    with pytest.raises(NaiveTimestampError):
        _normalize(naive)


def test_normalize_converts_local_standard_time_to_utc():
    """NSRDB PSM4 returns local standard time; the canonical frame is always UTC."""
    utc = _clearsky_utc(days=1)
    local = utc.copy()
    local.index = utc.index.tz_convert("Etc/GMT+7")

    out = _normalize(local)
    assert str(out.index.tz) == "UTC"
    # Same instants, same values — only the labelling changed.
    assert out.index.equals(utc.index)
    np.testing.assert_allclose(out["ghi"].to_numpy(), utc["ghi"].to_numpy())


def test_expected_ac_energy_rejects_a_naive_index():
    """The modelchain must not guess UTC for a frame that never said so."""
    naive = _clearsky_utc(days=1)
    naive.index = naive.index.tz_localize(None)
    with pytest.raises(NaiveTimestampError):
        expected_ac_energy(_cfg(), naive)


def test_fetch_nasa_power_index_is_utc(monkeypatch):
    """Contract test for the fetcher, with no network.

    pvlib currently sends `time-standard: utc`. This asserts the *result* the
    engine depends on, so a pvlib change that reverts to local solar time fails
    here rather than quietly moving every expected-energy figure.
    """
    import pvlib.iotools
    from src.verification_engine import irradiance

    fixture = _clearsky_utc(days=1).rename(
        columns={"ghi": "ghi", "dni": "dni", "dhi": "dhi"})

    def fake_get_nasa_power(**kwargs):
        return fixture.copy(), {}

    monkeypatch.setattr(pvlib.iotools, "get_nasa_power", fake_get_nasa_power)
    out = irradiance.fetch_nasa_power(SITE, "2024-06-15", "2024-06-15")
    assert str(out.index.tz) == "UTC"
    assert set(irradiance.CANON).issubset(out.columns)


def test_fetch_nasa_power_rejects_local_solar_time(monkeypatch):
    """If POWER ever hands back a naive (LST) frame, fail loudly at the boundary."""
    import pvlib.iotools
    from src.verification_engine import irradiance

    lst = _clearsky_utc(days=1)
    lst.index = (lst.index + pd.Timedelta(hours=LON_OFFSET_HOURS)).tz_localize(None)

    monkeypatch.setattr(pvlib.iotools, "get_nasa_power",
                        lambda **kwargs: (lst.copy(), {}))
    with pytest.raises(NaiveTimestampError):
        irradiance.fetch_nasa_power(SITE, "2024-06-15", "2024-06-15")


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
