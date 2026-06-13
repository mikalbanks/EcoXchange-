"""
pvlib ModelChain configuration for EcoXchange expected generation.

The daily weather feed (GHI/DNI/DHI + air temperature + wind speed) is
decomposed into an hourly clear-sky-weighted profile so that solar position,
transposition, temperature derating, and inverter clipping are all captured
correctly while preserving the measured daily energy totals.
"""

from __future__ import annotations

import pandas as pd

import pvlib

from .config import (
    CLEARSKY_MODEL,
    DEFAULT_ALBEDO,
    DEFAULT_DC_AC_RATIO,
    DEFAULT_INVERTER_EFFICIENCY,
    DEFAULT_MODULE_TYPE,
    DEFAULT_RACKING_TYPE,
    ENGINE_NAME,
    ENGINE_VERSION,
    IAM_MODEL,
    MODULE_PARAMS,
    STC_IRRADIANCE_W_M2,
    STC_TEMP_C,
    TEMP_PARAMS,
    TEMPERATURE_MODEL,
    TRANSPOSITION_MODEL,
)
from .models import (
    DailyWeatherInput,
    ExpectedGenerationResponse,
    MonthlyBreakdown,
    ProjectSystemInput,
)


def calculate_expected_generation(
    project: ProjectSystemInput,
    daily_weather: list[DailyWeatherInput],
) -> ExpectedGenerationResponse:
    """Calculate expected AC generation. The only function the endpoint calls."""

    location = pvlib.location.Location(
        latitude=project.latitude,
        longitude=project.longitude,
    )

    weather_records = []
    for day in daily_weather:
        weather_records.append(
            {
                "date": pd.Timestamp(day.date),
                # kWh/m²/day → Wh/m²/day (daily energy totals).
                "ghi": day.ghi_kwh_m2 * 1000,
                "dni": day.dni_kwh_m2 * 1000,
                "dhi": day.dhi_kwh_m2 * 1000,
                "temp_air": day.temp_air_c,
                "wind_speed": day.wind_speed_m_s,
            }
        )

    weather_df = pd.DataFrame(weather_records)
    weather_df["date"] = pd.to_datetime(weather_df["date"])
    weather_df = weather_df.set_index("date").sort_index()

    # Degradation evaluated at the first day of the supplied window.
    years_since_commissioning = (
        weather_df.index[0].date() - project.commissioning_date
    ).days / 365.25
    degradation_factor = (1 - project.degradation_rate) ** max(0, years_since_commissioning)

    module_params = MODULE_PARAMS.get(
        project.module_type or DEFAULT_MODULE_TYPE,
        MODULE_PARAMS[DEFAULT_MODULE_TYPE],
    )
    temp_params = TEMP_PARAMS.get(
        project.racking_type or DEFAULT_RACKING_TYPE,
        TEMP_PARAMS[DEFAULT_RACKING_TYPE],
    )

    daily_results = []
    warnings: list[str] = []
    for day_date, row in weather_df.iterrows():
        try:
            result = _calculate_single_day(
                location=location,
                day_date=day_date,
                ghi_wh=row["ghi"],
                dni_wh=row["dni"],
                dhi_wh=row["dhi"],
                temp_air=row["temp_air"],
                wind_speed=row["wind_speed"],
                capacity_kw_dc=project.capacity_kw_dc,
                tilt=project.tilt_deg,
                azimuth=project.azimuth_deg,
                module_params=module_params,
                temp_params=temp_params,
                inverter_efficiency=project.inverter_efficiency or DEFAULT_INVERTER_EFFICIENCY,
                dc_ac_ratio=project.dc_ac_ratio or DEFAULT_DC_AC_RATIO,
                system_losses=project.system_losses,
                degradation_factor=degradation_factor,
                albedo=project.albedo if project.albedo is not None else DEFAULT_ALBEDO,
            )
            daily_results.append({"date": day_date, **result})
        except Exception as exc:  # pragma: no cover - defensive per-day guard
            warnings.append(f"Day {day_date.date()}: calculation failed ({exc}), skipped")
            daily_results.append(
                {"date": day_date, "ac_kwh": 0.0, "poa_wh_m2": 0.0, "cell_temp_c": 0.0}
            )

    results_df = pd.DataFrame(daily_results)
    results_df["date"] = pd.to_datetime(results_df["date"])
    results_df = results_df.set_index("date")

    results_df["month"] = results_df.index.to_period("M")
    monthly_breakdown: list[MonthlyBreakdown] = []
    for month_period, group in results_df.groupby("month"):
        expected_kwh = float(group["ac_kwh"].sum())
        poa_total = float(group["poa_wh_m2"].sum()) / 1000  # Wh → kWh
        cell_temp_avg = float(group["cell_temp_c"].mean())
        days_in_month = int(month_period.days_in_month)
        days_with_data = int((group["ac_kwh"] > 0).sum())
        hours_in_month = days_in_month * 24

        capacity_factor = (
            expected_kwh / (project.capacity_kw_dc * hours_in_month)
            if project.capacity_kw_dc > 0 and hours_in_month > 0
            else 0.0
        )

        # Performance ratio: AC yield / (POA × nameplate / 1000 W/m²).
        theoretical_max = poa_total * project.capacity_kw_dc / (STC_IRRADIANCE_W_M2 / 1000)
        performance_ratio = expected_kwh / theoretical_max if theoretical_max > 0 else 0.0

        monthly_breakdown.append(
            MonthlyBreakdown(
                month=str(month_period),
                expected_kwh=round(expected_kwh, 2),
                poa_irradiance_kwh_m2=round(poa_total, 2),
                cell_temperature_avg_c=round(cell_temp_avg, 1),
                performance_ratio=round(performance_ratio, 4),
                capacity_factor=round(capacity_factor, 4),
                days_in_month=days_in_month,
                days_with_data=days_with_data,
            )
        )

    total_kwh = sum(m.expected_kwh for m in monthly_breakdown)

    return ExpectedGenerationResponse(
        total_expected_kwh=round(total_kwh, 2),
        monthly_breakdown=monthly_breakdown,
        system_summary={
            "capacity_kw_dc": project.capacity_kw_dc,
            "capacity_kw_ac": round(
                project.capacity_kw_dc / (project.dc_ac_ratio or DEFAULT_DC_AC_RATIO), 1
            ),
            "module_type": project.module_type or DEFAULT_MODULE_TYPE,
            "gamma_pdc": module_params["gamma_pdc"],
            "inverter_efficiency": project.inverter_efficiency or DEFAULT_INVERTER_EFFICIENCY,
            "system_losses_pct": project.system_losses * 100,
            "degradation_factor": round(degradation_factor, 4),
            "years_since_commissioning": round(years_since_commissioning, 1),
            "racking_type": project.racking_type or DEFAULT_RACKING_TYPE,
            "albedo": project.albedo if project.albedo is not None else DEFAULT_ALBEDO,
        },
        model_metadata={
            "pvlib_version": pvlib.__version__,
            "transposition_model": TRANSPOSITION_MODEL,
            "temperature_model": TEMPERATURE_MODEL,
            "iam_model": IAM_MODEL,
            "engine": ENGINE_NAME,
            "engine_version": ENGINE_VERSION,
        },
        warnings=warnings,
    )


def _timezone_for_longitude(longitude: float) -> str:
    """Approximate fixed-offset tz from longitude (Etc/GMT signs are inverted)."""
    tz_offset = int(round(longitude / 15))
    if tz_offset >= 0:
        return f"Etc/GMT-{tz_offset}"
    return f"Etc/GMT+{abs(tz_offset)}"


def _distribute(daily_total_wh: float, shape: pd.Series, index: pd.DatetimeIndex) -> pd.Series:
    """Spread a daily energy total across hours following a clear-sky shape."""
    shape_sum = float(shape.sum())
    if shape_sum > 0:
        return shape * (daily_total_wh / shape_sum)
    return pd.Series(0.0, index=index)


def _calculate_single_day(
    *,
    location: "pvlib.location.Location",
    day_date: pd.Timestamp,
    ghi_wh: float,
    dni_wh: float,
    dhi_wh: float,
    temp_air: float,
    wind_speed: float,
    capacity_kw_dc: float,
    tilt: float,
    azimuth: float,
    module_params: dict,
    temp_params: dict,
    inverter_efficiency: float,
    dc_ac_ratio: float,
    system_losses: float,
    degradation_factor: float,
    albedo: float,
) -> dict:
    """Calculate expected AC energy (kWh) for a single day."""

    tz_str = _timezone_for_longitude(location.longitude)
    try:
        times = pd.date_range(start=day_date.normalize(), periods=24, freq="h", tz=tz_str)
    except Exception:  # pragma: no cover - tz fallback
        times = pd.date_range(start=day_date.normalize(), periods=24, freq="h", tz="UTC")

    solar_position = location.get_solarposition(times)
    clearsky = location.get_clearsky(times, model=CLEARSKY_MODEL)

    hourly_ghi = _distribute(ghi_wh, clearsky["ghi"], times)
    hourly_dni = _distribute(dni_wh, clearsky["dni"], times)
    hourly_dhi = _distribute(dhi_wh, clearsky["dhi"], times)

    # Perez requires extraterrestrial DNI; pvlib does not auto-derive it.
    dni_extra = pvlib.irradiance.get_extra_radiation(times)

    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        solar_zenith=solar_position["apparent_zenith"],
        solar_azimuth=solar_position["azimuth"],
        dni=hourly_dni,
        ghi=hourly_ghi,
        dhi=hourly_dhi,
        dni_extra=dni_extra,
        model=TRANSPOSITION_MODEL,
        albedo=albedo,
    )
    poa_global = poa["poa_global"].fillna(0).clip(lower=0)

    aoi = pvlib.irradiance.aoi(
        surface_tilt=tilt,
        surface_azimuth=azimuth,
        solar_zenith=solar_position["apparent_zenith"],
        solar_azimuth=solar_position["azimuth"],
    )
    iam = pvlib.iam.physical(aoi).fillna(0).clip(lower=0, upper=1)

    effective_irradiance = poa_global * iam

    cell_temp = pvlib.temperature.sapm_cell(
        poa_global=poa_global,
        temp_air=temp_air,
        wind_speed=wind_speed,
        a=temp_params["a"],
        b=temp_params["b"],
        deltaT=temp_params["deltaT"],
    )

    # P_dc = P_stc × (G_eff / G_stc) × (1 + γ × (T_cell − T_stc)).
    gamma_pdc = module_params["gamma_pdc"]
    dc_power_kw = (
        capacity_kw_dc
        * (effective_irradiance / STC_IRRADIANCE_W_M2)
        * (1 + gamma_pdc * (cell_temp - STC_TEMP_C))
    )
    dc_power_kw = dc_power_kw.fillna(0).clip(lower=0)

    dc_power_kw = dc_power_kw * (1 - system_losses)
    dc_power_kw = dc_power_kw * degradation_factor

    # Inverter clipping: cap DC at the inverter AC rating, then apply efficiency.
    ac_capacity_kw = capacity_kw_dc / dc_ac_ratio
    ac_power_kw = dc_power_kw.clip(upper=ac_capacity_kw) * inverter_efficiency

    ac_kwh = float(ac_power_kw.sum())  # kW × 1h = kWh per step
    poa_wh_m2_total = float(poa_global.sum())  # W/m² × 1h = Wh/m² per step

    sunlit = cell_temp[poa_global > 10]
    cell_temp_avg = float(sunlit.mean()) if len(sunlit) and not pd.isna(sunlit.mean()) else temp_air

    return {
        "ac_kwh": max(0.0, ac_kwh),
        "poa_wh_m2": max(0.0, poa_wh_m2_total),
        "cell_temp_c": cell_temp_avg,
    }
