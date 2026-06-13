"""Edge-case coverage: missing data, tiny systems, extreme locations."""

from __future__ import annotations

from datetime import date

import pytest

from src.models import DailyWeatherInput, ProjectSystemInput
from src.pvlib_runner import calculate_expected_generation


def _project(**overrides) -> ProjectSystemInput:
    base = dict(
        latitude=32.08,
        longitude=-81.09,
        capacity_kw_dc=5000,
        tilt_deg=20,
        azimuth_deg=180,
        commissioning_date=date(2023, 1, 1),
    )
    base.update(overrides)
    return ProjectSystemInput(**base)


def test_single_day():
    project = _project()
    days = [DailyWeatherInput(date=date(2024, 6, 15), ghi_kwh_m2=6.5, dni_kwh_m2=7.0, dhi_kwh_m2=1.5)]
    result = calculate_expected_generation(project, days)
    assert len(result.monthly_breakdown) == 1
    assert result.total_expected_kwh > 0


def test_missing_temp_and_wind_use_defaults():
    """Omitted temp/wind fall back to pydantic defaults (20°C / 1 m/s)."""
    project = _project()
    day = DailyWeatherInput(date=date(2024, 6, 15), ghi_kwh_m2=6.5, dni_kwh_m2=7.0, dhi_kwh_m2=1.5)
    assert day.temp_air_c == 20.0
    assert day.wind_speed_m_s == 1.0
    result = calculate_expected_generation(project, [day])
    assert result.total_expected_kwh > 0


def test_zero_irradiance_day_produces_zero():
    project = _project()
    days = [DailyWeatherInput(date=date(2024, 1, 1), ghi_kwh_m2=0.0, dni_kwh_m2=0.0, dhi_kwh_m2=0.0)]
    result = calculate_expected_generation(project, days)
    assert result.total_expected_kwh == 0.0
    assert result.monthly_breakdown[0].days_with_data == 0


def test_tiny_residential_system():
    project = _project(capacity_kw_dc=5, racking_type="roof_mount")
    days = [
        DailyWeatherInput(date=date(2024, 7, d), ghi_kwh_m2=6.0, dni_kwh_m2=6.5, dhi_kwh_m2=1.6)
        for d in range(1, 8)
    ]
    result = calculate_expected_generation(project, days)
    # A 5 kW roof system over a week of good sun: tens of kWh, not thousands.
    assert 0 < result.total_expected_kwh < 300


def test_high_latitude_winter_does_not_crash():
    project = _project(latitude=64.84, longitude=-147.72, tilt_deg=45)  # Fairbanks, AK
    days = [
        DailyWeatherInput(date=date(2024, 12, d), ghi_kwh_m2=0.2, dni_kwh_m2=0.3, dhi_kwh_m2=0.1, temp_air_c=-25, wind_speed_m_s=1.5)
        for d in range(1, 8)
    ]
    result = calculate_expected_generation(project, days)
    assert result.total_expected_kwh >= 0
    assert not result.warnings  # should compute, not error out per-day


def test_southern_hemisphere_north_facing():
    project = _project(latitude=-33.87, longitude=151.21, azimuth_deg=0)  # Sydney, north-facing
    days = [
        DailyWeatherInput(date=date(2024, 1, d), ghi_kwh_m2=6.8, dni_kwh_m2=7.2, dhi_kwh_m2=1.8, temp_air_c=26, wind_speed_m_s=3.0)
        for d in range(1, 8)
    ]
    result = calculate_expected_generation(project, days)
    assert result.total_expected_kwh > 0


def test_thin_film_has_smaller_temperature_penalty():
    """thin_film gamma_pdc is gentler than monocrystalline; hotter site favors it."""
    hot_days = [
        DailyWeatherInput(date=date(2024, 7, d), ghi_kwh_m2=7.5, dni_kwh_m2=8.0, dhi_kwh_m2=1.6, temp_air_c=42, wind_speed_m_s=1.5)
        for d in range(1, 8)
    ]
    mono = calculate_expected_generation(_project(module_type="monocrystalline"), hot_days)
    thin = calculate_expected_generation(_project(module_type="thin_film"), hot_days)
    assert thin.total_expected_kwh > mono.total_expected_kwh
