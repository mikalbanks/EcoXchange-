"""Degradation-model API parameter tests (upgrade spec 6).

Back-compat is the load-bearing property: a request without the new
``degradation_model`` field must produce byte-identical output to before
the field existed, because the Express backtest and dashboard clients send
requests without it.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.models import DailyWeatherInput, ProjectSystemInput
from src.pvlib_runner import calculate_expected_generation
from tests.fixtures import load_scenario


def _run(name: str, year: int = 2023, **overrides):
    project_d, days_d = load_scenario(name, year)
    project_d.update(overrides)
    project = ProjectSystemInput(**project_d)
    days = [DailyWeatherInput(**d) for d in days_d]
    return calculate_expected_generation(project, days), project


def test_default_model_is_linear():
    _, project = _run("savannah")
    assert project.degradation_model == "linear"


def test_omitting_the_field_matches_explicit_linear():
    """Absent field ⇒ default ⇒ identical totals (back-compat proof)."""
    baseline, _ = _run("savannah")
    explicit, _ = _run("savannah", degradation_model="linear")
    assert baseline.total_expected_kwh == explicit.total_expected_kwh
    assert [m.expected_kwh for m in baseline.monthly_breakdown] == [
        m.expected_kwh for m in explicit.monthly_breakdown
    ]


def test_piecewise_accepted_and_reported():
    result, _ = _run("savannah", degradation_model="piecewise_nrel")
    assert result.total_expected_kwh > 0
    assert result.system_summary["degradation_model"] == "piecewise_nrel"


def test_linear_reported_in_system_summary():
    result, _ = _run("savannah")
    assert result.system_summary["degradation_model"] == "linear"


def test_piecewise_differs_from_linear_for_young_system():
    """A ~1-year-old system carries the full 2% LID under piecewise but only
    ~0.75% under linear, so piecewise expected generation must be lower."""
    linear, _ = _run("savannah", commissioning_date="2022-06-01")
    piecewise, _ = _run(
        "savannah",
        commissioning_date="2022-06-01",
        degradation_model="piecewise_nrel",
    )
    assert piecewise.total_expected_kwh < linear.total_expected_kwh


def test_invalid_model_rejected():
    with pytest.raises(ValidationError):
        _run("savannah", degradation_model="quadratic")
