"""Reference-scenario validation for the pvlib expected-generation runner.

These run fully offline against committed climatological fixtures. They assert
physical sanity (specific yield, seasonal shape, temperature derating,
clipping, degradation) rather than a tight ±5% match to PVWatts — the live
PVWatts comparison lives in ``benchmarks/pvwatts_comparison.py``.
"""

from __future__ import annotations

from datetime import date

import pytest

from src.models import DailyWeatherInput, ProjectSystemInput
from src.pvlib_runner import calculate_expected_generation
from tests.fixtures import load_scenario

SCENARIOS = ["savannah", "billerica", "phoenix"]


def _run(name: str, year: int = 2023, **overrides):
    project_d, days_d = load_scenario(name, year)
    project_d.update(overrides)
    project = ProjectSystemInput(**project_d)
    days = [DailyWeatherInput(**d) for d in days_d]
    return calculate_expected_generation(project, days), project


@pytest.mark.parametrize("name", SCENARIOS)
def test_response_schema_and_completeness(name):
    result, _ = _run(name)
    assert result.total_expected_kwh > 0
    assert len(result.monthly_breakdown) == 12
    # Monthly breakdown sums to the reported total (allow rounding).
    month_sum = sum(m.expected_kwh for m in result.monthly_breakdown)
    assert result.total_expected_kwh == pytest.approx(month_sum, abs=1.0)
    assert result.model_metadata["transposition_model"] == "perez"
    assert result.model_metadata["temperature_model"] == "sapm"


@pytest.mark.parametrize("name", SCENARIOS)
def test_specific_yield_is_plausible(name):
    result, project = _run(name)
    specific_yield = result.total_expected_kwh / project.capacity_kw_dc
    # Generous band covering GA / MA / AZ fixed-tilt fleets (kWh/kWp/yr).
    assert 1100 < specific_yield < 2200, f"{name} yield={specific_yield:.0f}"


@pytest.mark.parametrize("name", SCENARIOS)
def test_capacity_factor_is_plausible(name):
    result, _ = _run(name)
    # Each monthly capacity factor should sit in a realistic PV range.
    for m in result.monthly_breakdown:
        assert 0.0 <= m.capacity_factor < 0.35


@pytest.mark.parametrize("name", SCENARIOS)
def test_seasonal_shape_summer_beats_winter(name):
    """Northern-hemisphere sites: peak summer month > deepest winter month."""
    result, _ = _run(name)
    by_month = {m.month[-2:]: m.expected_kwh for m in result.monthly_breakdown}
    summer = max(by_month["05"], by_month["06"], by_month["07"])
    winter = min(by_month["12"], by_month["01"])
    assert summer > winter * 1.3


def test_phoenix_summer_heat_derating():
    """Acceptance criterion 5: Phoenix summer capacity factor < spring."""
    result, _ = _run("phoenix")
    by_month = {m.month[-2:]: m for m in result.monthly_breakdown}
    assert by_month["07"].performance_ratio < by_month["04"].performance_ratio
    assert by_month["07"].cell_temperature_avg_c > by_month["04"].cell_temperature_avg_c


def test_degradation_three_years():
    """Acceptance criterion 7: ~2.2% less for a 3-year-old system."""
    new, _ = _run("savannah", year=2023, commissioning_date="2023-01-01")
    aged, _ = _run("savannah", year=2023, commissioning_date="2020-01-01")
    ratio = aged.total_expected_kwh / new.total_expected_kwh
    assert ratio == pytest.approx(0.978, abs=0.005)


def test_inverter_clipping_visible():
    """Acceptance criterion 6: a tighter inverter (higher DC/AC) clips more."""
    low_clip, _ = _run("phoenix", dc_ac_ratio=1.0)
    high_clip, _ = _run("phoenix", dc_ac_ratio=1.6)
    assert high_clip.total_expected_kwh < low_clip.total_expected_kwh


def test_summary_and_metadata_fields_present():
    result, _ = _run("savannah")
    for key in ("capacity_kw_ac", "module_type", "gamma_pdc", "degradation_factor"):
        assert key in result.system_summary
    assert result.system_summary["capacity_kw_ac"] == pytest.approx(5000 / 1.2, abs=1.0)
