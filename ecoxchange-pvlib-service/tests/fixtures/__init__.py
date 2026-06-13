"""Helpers for loading the reference-scenario fixtures.

Each fixture stores monthly climatological daily means (kWh/m²/day). The
loaders here expand those 12 monthly normals into a full year of per-day
weather records so the runner can be exercised end-to-end offline.
"""

from __future__ import annotations

import calendar
import json
from datetime import date
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent


def load_fixture(name: str) -> dict:
    """Load a raw fixture JSON by base name (e.g. 'savannah')."""
    path = FIXTURE_DIR / f"{name}_irradiance.json"
    return json.loads(path.read_text())


def expand_year(fixture: dict, year: int = 2023) -> list[dict]:
    """Expand monthly normals into a full year of daily weather dicts."""
    normals = {row["month"]: row for row in fixture["monthly_normals"]}
    days: list[dict] = []
    for month in range(1, 13):
        row = normals[month]
        ndays = calendar.monthrange(year, month)[1]
        for dom in range(1, ndays + 1):
            days.append(
                {
                    "date": date(year, month, dom).isoformat(),
                    "ghi_kwh_m2": row["ghi_kwh_m2"],
                    "dni_kwh_m2": row["dni_kwh_m2"],
                    "dhi_kwh_m2": row["dhi_kwh_m2"],
                    "temp_air_c": row["temp_air_c"],
                    "wind_speed_m_s": row["wind_speed_m_s"],
                }
            )
    return days


def load_scenario(name: str, year: int = 2023) -> tuple[dict, list[dict]]:
    """Return (project_dict, daily_weather_dicts) for a reference scenario."""
    fixture = load_fixture(name)
    project = {
        "latitude": fixture["latitude"],
        "longitude": fixture["longitude"],
        **fixture["project"],
    }
    return project, expand_year(fixture, year)
