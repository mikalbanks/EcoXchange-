"""Offline tests for the EIA fleet re-validation harness.

No network and no federal files: we exercise the cohort/join logic, the metric
aggregation, the no-look-ahead guard, and the engine-driving backtest against
synthetic clear-sky weather. The live NASA POWER / NSRDB fetch and the .xlsx
parsers are out of scope here (same posture as the PVDAQ harness).
"""
import sys, os
from datetime import date

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.validate_eia_fleet import (
    USPVDBRecord, EIA860Record, EIA923PlantTotals, JoinOptions,
    join_datasets, build_plant_config, backtest_plant, model_annual_mwh,
    aggregate, split_cohorts, infer_outlier_cause, PlantResult, JoinedPlant,
)


def _uspvdb(eia_id, dc=5.0, axis="Fixed", state="NM", year=2018):
    return USPVDBRecord(
        uspvdb_id="u" + eia_id, name="Plant " + eia_id, state=state, county=None,
        latitude=35.05, longitude=-106.54, capacity_ac_mw=dc / 1.3,
        capacity_dc_mw=dc, panel_technology="Crystalline Silicon",
        axis_type=axis, commissioning_year=year, eia_plant_id=eia_id)


def _eia923(eia_id, annual=9000.0, year=2023, hybrid=False):
    return EIA923PlantTotals(
        eia_plant_id=eia_id, name_923="Plant " + eia_id, annual_mwh=annual,
        monthly_mwh=[annual / 12] * 12, year=year, is_storage_hybrid=hybrid)


def test_join_capacity_band_filter():
    us = [_uspvdb("1", dc=5.0), _uspvdb("2", dc=50.0)]   # 50 MW is out of 1-20 band
    gen = [_eia923("1"), _eia923("2")]
    joined = join_datasets(us, [], gen)
    ids = {p.eia_plant_id for p in joined}
    assert ids == {"1"}


def test_join_partial_year_and_cf_bounds():
    us = [_uspvdb("1"), _uspvdb("2", year=2023), _uspvdb("3")]
    gen = [
        _eia923("1", annual=9000.0),                 # CF ~20.5% -> kept
        _eia923("2", annual=9000.0, year=2023),      # commissioned in prod year -> dropped
        _eia923("3", annual=500.0),                  # CF ~1.1% -> below floor, dropped
    ]
    joined = join_datasets(us, [], gen)
    assert {p.eia_plant_id for p in joined} == {"1"}


def test_join_excludes_storage_hybrid():
    us = [_uspvdb("1")]
    gen = [_eia923("1", hybrid=True)]
    assert join_datasets(us, [], gen) == []


def test_tracking_flag_and_cohort_split():
    us = [_uspvdb("1", axis="Fixed", state="NM"),
          _uspvdb("2", axis="Single Axis Tracking", state="NM"),
          _uspvdb("3", axis="Fixed", state="CA")]   # CA -> high-curtailment cohort
    gen = [_eia923("1"), _eia923("2"), _eia923("3")]
    joined = {p.eia_plant_id: p for p in join_datasets(us, [], gen)}
    assert joined["2"].is_tracking is True
    assert joined["1"].is_tracking is False
    assert joined["3"].high_curtailment is True

    results = [
        PlantResult("1", "a", "NM", "Fixed", False, False, "nasa", 9, 9, 0, 20, 20, True, True),
        PlantResult("2", "b", "NM", "Single Axis Tracking", True, False, "nasa", 9, 9, 0, 20, 20, True, True),
        PlantResult("3", "c", "CA", "Fixed", False, True, "nasa", 9, 9, 0, 20, 20, True, True),
    ]
    cohorts = split_cohorts(results)
    assert [r.eia_plant_id for r in cohorts["clean_fixed"]] == ["1"]
    assert [r.eia_plant_id for r in cohorts["tracking"]] == ["2"]
    assert [r.eia_plant_id for r in cohorts["curtailed"]] == ["3"]


def test_aggregate_metrics():
    results = [
        PlantResult(str(i), "n", "NM", "Fixed", False, False, "nasa",
                    9, 9, dev, 20, 20, abs(dev) <= 10, abs(dev) <= 5)
        for i, dev in enumerate([0.0, 4.0, 8.0, 12.0, -6.0])
    ]
    m = aggregate(results)
    assert m["n"] == 5
    assert m["median_deviation_pct"] == 4.0
    assert m["pct_within_10"] == 80.0   # 12% is the only one outside ±10
    assert m["pct_within_5"] == 40.0    # only 0% and 4% fall within ±5


def test_no_look_ahead_guard_rejects_actuals_column():
    plant = JoinedPlant(
        eia_plant_id="1", name="t", latitude=35.05, longitude=-106.54, state="NM",
        capacity_dc_mw=5.0, capacity_ac_mw=3.8, panel_technology="Crystalline Silicon",
        axis_type="Fixed", commissioning_year=2018, tilt_deg=30.0, azimuth_deg=180.0,
        tilt_source="estimated", azimuth_source="default", actual_annual_mwh=9000.0,
        actual_monthly_mwh=[750.0] * 12, production_year=2023,
        actual_capacity_factor_pct=20.5, high_curtailment=False)
    cfg = build_plant_config(plant)
    bad = pd.DataFrame({"ghi": [1.0], "dni": [1.0], "dhi": [1.0],
                        "temp_air": [20.0], "wind_speed": [1.0],
                        "actual_mwh": [9000.0]})
    with pytest.raises(AssertionError, match="Look-ahead leak"):
        model_annual_mwh(cfg, bad, 2023)


def test_backtest_plant_end_to_end_offline():
    import pvlib
    plant = JoinedPlant(
        eia_plant_id="1", name="t", latitude=35.05, longitude=-106.54, state="NM",
        capacity_dc_mw=5.0, capacity_ac_mw=3.8, panel_technology="Crystalline Silicon",
        axis_type="Fixed", commissioning_year=2018, tilt_deg=30.0, azimuth_deg=180.0,
        tilt_source="estimated", azimuth_source="default", actual_annual_mwh=11000.0,
        actual_monthly_mwh=[916.0] * 12, production_year=2023,
        actual_capacity_factor_pct=25.1, high_curtailment=False)
    loc = pvlib.location.Location(35.05, -106.54, tz="Etc/GMT+7", altitude=1600)
    idx = pd.date_range("2023-01-01", "2023-12-31 23:00", freq="h", tz="Etc/GMT+7")
    weather = loc.get_clearsky(idx)
    weather["temp_air"] = 20.0
    weather["wind_speed"] = 1.0
    res = backtest_plant(plant, weather, "clearsky_synthetic")
    assert res.expected_mwh > 0
    assert np.isfinite(res.deviation_pct)
    assert res.irradiance_source == "clearsky_synthetic"


def test_infer_outlier_cause_tracking_no_boost_heuristic():
    # Under-prediction on a high-curtailment plant -> curtailment, not a fudge factor.
    r = PlantResult("1", "n", "CA", "Single Axis Tracking", True, True, "nasa",
                    7, 10, -30.0, 16, 23, False, False)
    assert "curtailment" in infer_outlier_cause(r).lower()


if __name__ == "__main__":
    import pytest as _pytest
    raise SystemExit(_pytest.main([__file__, "-q"]))
