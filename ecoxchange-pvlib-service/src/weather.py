"""NASA POWER daily weather fetch for the site-level convenience endpoint.

The core ``/expected-generation`` endpoint deliberately takes caller-supplied
``daily_weather`` (the irradiance MCP server owns provenance in the full
pipeline). The dashboard, however, needs a single-call surface: site specs +
date range in, physics out. This module fetches NASA POWER daily data
(no API key required) so ``/api/expected-generation`` can build the
``daily_weather`` list server-side and delegate to the canonical engine path.
"""

from __future__ import annotations

from datetime import date

import httpx

from .models import DailyWeatherInput

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# NASA POWER daily parameters (RE community):
#   ALLSKY_SFC_SW_DWN  — GHI  (kWh/m²/day)
#   ALLSKY_SFC_SW_DNI  — DNI  (kWh/m²/day)
#   ALLSKY_SFC_SW_DIFF — DHI  (kWh/m²/day)
#   T2M                — air temperature at 2 m (°C)
#   WS2M               — wind speed at 2 m (m/s)
PARAMETERS = "ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF,T2M,WS2M"

FILL_VALUE = -999.0
TIMEOUT_S = 60.0


class WeatherFetchError(RuntimeError):
    """NASA POWER was unreachable or returned an unusable payload."""


async def fetch_nasa_power_daily(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> list[DailyWeatherInput]:
    params = {
        "parameters": PARAMETERS,
        "community": "RE",
        "latitude": latitude,
        "longitude": longitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            response = await client.get(NASA_POWER_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as exc:
        raise WeatherFetchError(f"NASA POWER request failed: {exc}") from exc

    try:
        series = payload["properties"]["parameter"]
        ghi = series["ALLSKY_SFC_SW_DWN"]
        dni = series["ALLSKY_SFC_SW_DNI"]
        dhi = series["ALLSKY_SFC_SW_DIFF"]
        temp = series.get("T2M", {})
        wind = series.get("WS2M", {})
    except (KeyError, TypeError) as exc:
        raise WeatherFetchError(f"NASA POWER payload missing parameters: {exc}") from exc

    days: list[DailyWeatherInput] = []
    for stamp, ghi_value in ghi.items():
        dni_value = dni.get(stamp, FILL_VALUE)
        dhi_value = dhi.get(stamp, FILL_VALUE)
        # Skip fill-value days (typically the most recent days, pre-processing).
        if FILL_VALUE in (ghi_value, dni_value, dhi_value):
            continue
        day = date(int(stamp[0:4]), int(stamp[4:6]), int(stamp[6:8]))
        temp_value = temp.get(stamp, FILL_VALUE)
        wind_value = wind.get(stamp, FILL_VALUE)
        days.append(
            DailyWeatherInput(
                date=day,
                ghi_kwh_m2=ghi_value,
                dni_kwh_m2=dni_value,
                dhi_kwh_m2=dhi_value,
                temp_air_c=temp_value if temp_value != FILL_VALUE else 20.0,
                wind_speed_m_s=wind_value if wind_value != FILL_VALUE else 1.0,
            )
        )

    if not days:
        raise WeatherFetchError(
            "NASA POWER returned no usable days for the requested range "
            "(recent dates may not be processed yet)."
        )
    return days
