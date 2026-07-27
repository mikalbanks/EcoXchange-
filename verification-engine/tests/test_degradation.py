"""Degradation model tests (upgrade spec 6).

Breakpoint expectations come from the spec's PiecewiseDegradation.factor()
formula, which is the implementation of record. The spec's prose acceptance
table quotes ~0.945 @ year 10 and ~0.831 @ year 25 — values its own formula
does not produce (it yields 0.9287 and 0.8573). Where the table and the
formula disagree, the formula wins; this file asserts the formula's values
and documents the discrepancy.
"""
from datetime import date, timedelta

import pytest

from verification_engine.config import ArrayConfig, Location, SystemConfig
from verification_engine.losses import (
    degradation_factor,
    piecewise_nrel_degradation_factor,
)


def make_config(model: str = "linear") -> SystemConfig:
    return SystemConfig(
        name="test",
        location=Location(latitude=32.08, longitude=-81.09),
        array=ArrayConfig(surface_tilt=20.0),
        commission_date=date(2020, 1, 1),
        degradation_model=model,
    )


class TestPiecewiseBreakpoints:
    """Spec formula values at the acceptance breakpoints."""

    @pytest.mark.parametrize(
        "years, expected",
        [
            (0.0, 1.0),
            (0.5, 0.99),      # half of first-year LID
            (1.0, 0.98),      # full LID
            (3.0, 0.96628),   # 0.98 × (1 − 0.007×2)
            (5.0, 0.95256),   # 0.98 × (1 − 0.007×4)
            (10.0, 0.928746),  # spec table says ~0.945; formula yields this
            (25.0, 0.857304),  # spec table says ~0.831; formula yields this
            (30.0, 0.8230118),  # end-of-life phase, 0.8%/yr
        ],
    )
    def test_breakpoints(self, years: float, expected: float) -> None:
        assert piecewise_nrel_degradation_factor(years) == pytest.approx(
            expected, abs=5e-4
        )

    def test_negative_years_clamps_to_one(self) -> None:
        assert piecewise_nrel_degradation_factor(-2.0) == 1.0

    def test_monotonic_non_increasing(self) -> None:
        prev = 1.0
        for tenth in range(0, 401):  # 0 .. 40 years in 0.1-yr steps
            f = piecewise_nrel_degradation_factor(tenth / 10.0)
            assert f <= prev + 1e-12
            prev = f

    def test_continuity_at_segment_joints(self) -> None:
        for joint in (1.0, 5.0, 25.0):
            below = piecewise_nrel_degradation_factor(joint - 1e-6)
            above = piecewise_nrel_degradation_factor(joint + 1e-6)
            assert below == pytest.approx(above, abs=1e-4)

    def test_never_negative(self) -> None:
        assert piecewise_nrel_degradation_factor(500.0) == 0.0


class TestModelDispatch:
    def test_linear_default_reproduces_historical_factors(self) -> None:
        """Back-compat regression: the default model must stay bit-for-bit
        the historical geometric (1-rate)**years behavior."""
        cfg = make_config("linear")
        for days in (0, 200, 365, 1000, 3652):
            as_of = cfg.commission_date + timedelta(days=days)
            years = cfg.years_since_commission(as_of)
            factor, loss_pct = degradation_factor(cfg, as_of)
            assert factor == (1.0 - cfg.degradation_rate_per_year) ** years
            assert loss_pct == pytest.approx((1.0 - factor) * 100.0)

    def test_default_model_is_linear(self) -> None:
        cfg = SystemConfig(
            name="d",
            location=Location(latitude=0.0, longitude=0.0),
            array=ArrayConfig(surface_tilt=10.0),
        )
        assert cfg.degradation_model == "linear"

    def test_piecewise_dispatch(self) -> None:
        cfg = make_config("piecewise_nrel")
        as_of = cfg.commission_date + timedelta(days=int(3 * 365.25))
        factor, _ = degradation_factor(cfg, as_of)
        assert factor == pytest.approx(0.96628, abs=5e-4)

    def test_piecewise_predicts_lower_early_life_output_than_linear(self) -> None:
        """The whole point of the model: linear misses first-year LID."""
        linear = make_config("linear")
        piecewise = make_config("piecewise_nrel")
        one_year = linear.commission_date + timedelta(days=365)
        f_lin, _ = degradation_factor(linear, one_year)
        f_pw, _ = degradation_factor(piecewise, one_year)
        assert f_pw < f_lin
