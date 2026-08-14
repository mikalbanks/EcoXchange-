"""Offline checks for the Spec 20 reproduction contract."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from spec20_backtest import (
    EXPECTED_COHORT_COUNTS,
    NETGEN_COLUMNS,
    assert_utc_and_daylight,
    circular_weighted_mean_deg,
    construct_cohort,
    model_monthly_mwh,
    sha256_file,
)


REPORT_DIR = Path(__file__).resolve().parents[1] / "reports" / "spec20"


def test_committed_evidence_is_self_consistent_and_explicitly_blocked():
    evidence = json.loads((REPORT_DIR / "evidence.json").read_text())
    cohort = REPORT_DIR / "cohort.csv"
    assert evidence["status"] == "blocked_cohort_mismatch"
    assert evidence["artifacts"]["cohort.csv"]["sha256"] == sha256_file(cohort)
    assert evidence["artifacts"]["cohort.csv"]["rows"] == sum(1 for _ in cohort.open()) - 1
    assert evidence["claims_verified"] == []
    assert "adaptive threshold rates" in evidence["claims_unverified"]
    for name in ("merged_results.csv", "monthly_long.csv", "holdout_results.json",
                 "threshold_evaluation.json"):
        assert evidence["artifacts"][name]["status"] == "not_generated"


def test_current_source_mismatch_is_not_silently_tolerated():
    evidence = json.loads((REPORT_DIR / "evidence.json").read_text())
    expected = evidence["expected_cohort_counts"]
    observed = evidence["cohort_counts"]
    assert expected == EXPECTED_COHORT_COUNTS
    assert observed["eia860_operable_solar_generators"] == 7154
    assert observed["fixed_tilt_complete_generators"] != expected["fixed_tilt_complete_generators"]
    assert observed["capacity_factor_and_coordinates_plants"] != expected[
        "capacity_factor_and_coordinates_plants"
    ]


def _fixture_frames():
    solar = pd.DataFrame([
        {"Plant Code": 1, "Plant Name": "pure", "State": "NC", "Generator ID": "a",
         "Technology": "Solar Photovoltaic", "Prime Mover": "PV", "Fixed Tilt?": "Y",
         "Nameplate Capacity (MW)": 1.0, "DC Net Capacity (MW)": 1.2,
         "Operating Year": 2020, "Tilt Angle": 25, "Azimuth Angle": 180},
        {"Plant Code": 2, "Plant Name": "mixed", "State": "NC", "Generator ID": "a",
         "Technology": "Solar Photovoltaic", "Prime Mover": "PV", "Fixed Tilt?": "Y",
         "Nameplate Capacity (MW)": 1.0, "DC Net Capacity (MW)": 1.2,
         "Operating Year": 2020, "Tilt Angle": 25, "Azimuth Angle": 180},
        {"Plant Code": 2, "Plant Name": "mixed", "State": "NC", "Generator ID": "b",
         "Technology": "Solar Photovoltaic", "Prime Mover": "PV", "Fixed Tilt?": "N",
         "Nameplate Capacity (MW)": 1.0, "DC Net Capacity (MW)": 1.2,
         "Operating Year": 2020, "Tilt Angle": 25, "Azimuth Angle": 180},
    ])
    plants = pd.DataFrame([
        {"Plant Code": 1, "Latitude": 35.0, "Longitude": -80.0},
        {"Plant Code": 2, "Latitude": 35.0, "Longitude": -80.0},
    ])
    monthly = {column: 50.0 for column in NETGEN_COLUMNS}
    generation = pd.DataFrame([
        {"Plant Id": 1, "Reported Fuel Type Code": "SUN", "Reported Prime Mover": "PV", **monthly},
        {"Plant Id": 2, "Reported Fuel Type Code": "SUN", "Reported Prime Mover": "PV", **monthly},
    ])
    return solar, plants, generation


def test_construct_cohort_excludes_a_mixed_geometry_plant():
    cohort, counts = construct_cohort(*_fixture_frames())
    assert cohort["plant_id"].tolist() == [1]
    assert counts["fixed_tilt_complete_generators"] == 2
    assert counts["pure_fixed_tilt_complete_plants"] == 1


def test_circular_azimuth_mean_handles_north_wraparound():
    assert circular_weighted_mean_deg(np.array([350.0, 10.0]), np.array([1.0, 1.0])) == pytest.approx(0)


def test_utc_daylight_guard_rejects_shifted_ghi():
    import pvlib

    index = pd.date_range("2024-06-15", periods=24, freq="h", tz="UTC")
    solpos = pvlib.solarposition.get_solarposition(index, 35.0, -80.0)
    weather = pd.DataFrame({"ghi": np.where(solpos["apparent_elevation"] < 0, 500.0, 0.0)}, index=index)
    with pytest.raises(ValueError, match="below the horizon"):
        assert_utc_and_daylight(weather, 35.0, -80.0)


def test_utc_daylight_guard_rejects_naive_index():
    weather = pd.DataFrame({"ghi": [0.0]}, index=pd.DatetimeIndex(["2024-01-01"]))
    with pytest.raises(ValueError, match="tz-aware UTC"):
        assert_utc_and_daylight(weather, 35.0, -80.0)


def test_model_contract_runs_offline_with_pinned_pvlib():
    import pvlib

    index = pd.date_range("2024-05-31", "2024-07-02", freq="h", tz="UTC")
    location = pvlib.location.Location(35.0, -80.0, tz="UTC")
    weather = location.get_clearsky(index)
    weather["temp_air"] = 25.0
    weather["wind_speed"] = 1.0
    modeled = model_monthly_mwh(
        {
            "Latitude": 35.0,
            "Longitude": -80.0,
            "capacity_dc_mw": 1.2,
            "capacity_ac_mw": 1.0,
            "tilt_deg": 25.0,
            "azimuth_deg": 180.0,
            "commissioning_year": 2020,
        },
        weather,
    )
    assert modeled.loc[pd.Timestamp("2024-06-01", tz="UTC")] > 0
