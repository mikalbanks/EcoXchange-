"""
Compare pvlib microservice output against NREL PVWatts v8 for the three
reference scenarios. This is the live validation that proves the pvlib
integration closes the accuracy gap.

It fetches real daily weather from NASA POWER, calls the running pvlib service
(POST /expected-generation), calls PVWatts with matching parameters, and
reports per-scenario annual deviation.

Requirements:
  - The pvlib service running on PVLIB_URL (default http://localhost:3004)
  - Outbound network access to NASA POWER and the NREL developer API
  - An NREL API key in NREL_API_KEY (falls back to DEMO_KEY, which is heavily
    rate-limited)

Run:    python benchmarks/pvwatts_comparison.py [--year 2023]
Output: benchmarks/pvwatts_comparison_report.json
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import httpx

PVLIB_URL = os.environ.get("PVLIB_SERVICE_URL", "http://localhost:3004")
PVWATTS_URL = "https://developer.nrel.gov/api/pvwatts/v8.json"
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NREL_API_KEY = os.environ.get("NREL_API_KEY", "DEMO_KEY")

# NASA POWER daily parameters -> pvlib daily_weather fields.
NASA_PARAMS = "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF,T2M,WS10M"
FILL = -999.0

SCENARIOS = [
    {
        "name": "Savannah GA 5MW",
        "latitude": 32.08,
        "longitude": -81.09,
        "capacity_kw_dc": 5000,
        "tilt_deg": 20,
        "azimuth_deg": 180,
        "system_losses": 0.14,
        "commissioning_date": "2023-01-01",
        "pvwatts_low_mwh": 7500,
        "pvwatts_high_mwh": 8200,
    },
    {
        "name": "Billerica MA 2MW",
        "latitude": 42.56,
        "longitude": -71.27,
        "capacity_kw_dc": 2000,
        "tilt_deg": 25,
        "azimuth_deg": 180,
        "system_losses": 0.14,
        "commissioning_date": "2023-01-01",
        "pvwatts_low_mwh": 2800,
        "pvwatts_high_mwh": 3200,
    },
    {
        "name": "Phoenix AZ 1MW",
        "latitude": 33.45,
        "longitude": -112.07,
        "capacity_kw_dc": 1000,
        "tilt_deg": 15,
        "azimuth_deg": 180,
        "system_losses": 0.14,
        "commissioning_date": "2023-01-01",
        "pvwatts_low_mwh": 1800,
        "pvwatts_high_mwh": 2000,
    },
]


def fetch_nasa_power(scenario: dict, year: int) -> list[dict]:
    """Fetch a full year of daily weather from NASA POWER."""
    resp = httpx.get(
        NASA_POWER_URL,
        params={
            "parameters": NASA_PARAMS,
            "community": "RE",
            "longitude": scenario["longitude"],
            "latitude": scenario["latitude"],
            "start": f"{year}0101",
            "end": f"{year}1231",
            "format": "JSON",
        },
        timeout=120,
    )
    resp.raise_for_status()
    params = resp.json()["properties"]["parameter"]
    ghi = params["ALLSKY_SFC_SW_DWN"]
    dni = params["ALLSKY_SFC_SW_DNI"]
    dhi = params["ALLSKY_SFC_SW_DIFF"]
    t2m = params.get("T2M", {})
    ws = params.get("WS10M", {})

    daily = []
    for key in sorted(ghi):
        g, dn, dh = ghi[key], dni[key], dhi[key]
        if FILL in (g, dn, dh):
            continue
        iso = f"{key[:4]}-{key[4:6]}-{key[6:8]}"
        temp = t2m.get(key, 20.0)
        wind = ws.get(key, 1.0)
        daily.append(
            {
                "date": iso,
                "ghi_kwh_m2": g,
                "dni_kwh_m2": dn,
                "dhi_kwh_m2": dh,
                "temp_air_c": 20.0 if temp == FILL else temp,
                "wind_speed_m_s": 1.0 if wind == FILL else wind,
            }
        )
    return daily


def call_pvlib(scenario: dict, daily: list[dict]) -> dict:
    body = {
        "project": {
            "latitude": scenario["latitude"],
            "longitude": scenario["longitude"],
            "capacity_kw_dc": scenario["capacity_kw_dc"],
            "tilt_deg": scenario["tilt_deg"],
            "azimuth_deg": scenario["azimuth_deg"],
            "system_losses": scenario["system_losses"],
            "commissioning_date": scenario["commissioning_date"],
        },
        "daily_weather": daily,
    }
    resp = httpx.post(f"{PVLIB_URL}/expected-generation", json=body, timeout=300)
    resp.raise_for_status()
    return resp.json()


def call_pvwatts(scenario: dict) -> dict:
    resp = httpx.get(
        PVWATTS_URL,
        params={
            "api_key": NREL_API_KEY,
            "lat": scenario["latitude"],
            "lon": scenario["longitude"],
            "system_capacity": scenario["capacity_kw_dc"],
            "azimuth": scenario["azimuth_deg"],
            "tilt": scenario["tilt_deg"],
            "array_type": 0,  # fixed open rack
            "module_type": 0,  # standard
            "losses": scenario["system_losses"] * 100,
            "dc_ac_ratio": 1.2,
            "timeframe": "monthly",
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["outputs"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2023)
    args = parser.parse_args()

    report = {"year": args.year, "pvlib_url": PVLIB_URL, "scenarios": []}
    for scenario in SCENARIOS:
        print(f"== {scenario['name']} ==")
        daily = fetch_nasa_power(scenario, args.year)
        pvlib_result = call_pvlib(scenario, daily)
        pvlib_annual = pvlib_result["total_expected_kwh"]

        try:
            pvwatts = call_pvwatts(scenario)
            pvwatts_annual = pvwatts["ac_annual"]
            deviation_pct = (pvlib_annual - pvwatts_annual) / pvwatts_annual * 100
        except Exception as exc:  # network / key / rate-limit
            pvwatts_annual = None
            deviation_pct = None
            print(f"  PVWatts call failed: {exc}")

        entry = {
            "name": scenario["name"],
            "days_used": len(daily),
            "pvlib_annual_kwh": round(pvlib_annual, 1),
            "pvwatts_annual_kwh": round(pvwatts_annual, 1) if pvwatts_annual else None,
            "deviation_pct": round(deviation_pct, 2) if deviation_pct is not None else None,
            "within_5pct": abs(deviation_pct) <= 5 if deviation_pct is not None else None,
            "pvwatts_reference_range_mwh": [
                scenario["pvwatts_low_mwh"],
                scenario["pvwatts_high_mwh"],
            ],
        }
        report["scenarios"].append(entry)
        print(f"  pvlib  : {pvlib_annual/1000:8.1f} MWh")
        if pvwatts_annual:
            print(f"  pvwatts: {pvwatts_annual/1000:8.1f} MWh  (deviation {deviation_pct:+.2f}%)")

    out_path = Path(__file__).parent / "pvwatts_comparison_report.json"
    out_path.write_text(json.dumps(report, indent=2))
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
