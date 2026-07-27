"""Expected-generation runner — a thin wrapper over the canonical Engine A.

Spec 01-C topology: "Engine A behind service B." The service keeps its deployed
surface (port 3004, the `/expected-generation` contract the TS product calls)
but the physics now runs through the canonical verification engine
(`verification_engine`) instead of the hand-rolled per-day math this module used
to carry. That makes A the single source of expected-generation truth while the
existing callers are unchanged (the response only *grows*, additively).

The daily weather feed (kWh/m²/day GHI/DNI/DHI + air temp + wind) is decomposed
into an hourly clear-sky-weighted profile, then handed to Engine A's pvlib
PVWatts ModelChain (Perez transposition, single-axis tracking support, explicit
loss waterfall, P50/P90 uncertainty budget).
"""

from __future__ import annotations

import pandas as pd

import pvlib

# Canonical engine (installed as `ecoxchange-verification-engine`).
from verification_engine import (
    SystemConfig,
    Location,
    ArrayConfig,
    LossAssumptions,
    build_modelchain,
    apply_losses,
    apply_losses_series,
    build_budget,
    degradation_factor,
)
from verification_engine import __version__ as ENGINE_A_VERSION

from .config import (
    CLEARSKY_MODEL,
    DEFAULT_DC_AC_RATIO,
    DEFAULT_MODULE_TYPE,
    DEFAULT_RACKING_TYPE,
    ENGINE_NAME,
    ENGINE_VERSION,
    IAM_MODEL,
    MODULE_PARAMS,
    STC_IRRADIANCE_W_M2,
    TEMPERATURE_MODEL,
    TRANSPOSITION_MODEL,
)
from .models import (
    DailyWeatherInput,
    ExpectedGenerationResponse,
    LossWaterfallLine,
    MonthlyBreakdown,
    ProjectSystemInput,
)

# Map the service's racking_type onto Engine A's SAPM temperature model + mount.
_RACKING_TO_TEMP_MODEL = {
    "open_rack": "open_rack_glass_glass",
    "roof_mount": "close_mount_glass_glass",
    "single_axis_tracker": "open_rack_glass_glass",
}
_TRACKING_RACKING = {"single_axis_tracker"}


def calculate_expected_generation(
    project: ProjectSystemInput,
    daily_weather: list[DailyWeatherInput],
    weather_source: str = "irradiance_mcp",
) -> ExpectedGenerationResponse:
    """Calculate expected AC generation via Engine A. The only fn the endpoint calls."""

    cfg = _system_config(project)

    # Decompose daily totals into an hourly weather frame Engine A can model.
    weather = _hourly_weather_frame(project, daily_weather)

    # Run Engine A's ModelChain once over the whole window.
    mc = build_modelchain(cfg)
    mc.run_model(weather)

    interval_h = _interval_hours(weather.index)
    ac_kwh = mc.results.ac.clip(lower=0) / 1000.0 * interval_h          # kWh/interval
    poa_global = _poa_global(mc.results).fillna(0).clip(lower=0)        # W/m²
    poa_kwh_m2 = poa_global / 1000.0 * interval_h                       # kWh/m²/interval
    cell_temp = _cell_temperature(mc.results)

    frame = pd.DataFrame(
        {"ac_kwh": ac_kwh, "poa_kwh_m2": poa_kwh_m2, "cell_temp_c": cell_temp},
        index=weather.index,
    )

    # Gross -> net via Engine A's loss waterfall + per-timestamp degradation.
    gross_series = frame["ac_kwh"]
    net_series = apply_losses_series(cfg, gross_series)
    frame["net_kwh"] = net_series

    as_of = weather.index[0].date()
    net_total, waterfall = apply_losses(cfg, float(gross_series.sum()), as_of)
    budget = build_budget(net_total)

    monthly_breakdown = _monthly_breakdown(frame, project.capacity_kw_dc)
    total_kwh = sum(m.expected_kwh for m in monthly_breakdown)

    return ExpectedGenerationResponse(
        total_expected_kwh=round(total_kwh, 2),
        monthly_breakdown=monthly_breakdown,
        system_summary={
            "capacity_kw_dc": project.capacity_kw_dc,
            "capacity_kw_ac": round(cfg.array.ac_capacity(), 1),
            "module_type": project.module_type or DEFAULT_MODULE_TYPE,
            "gamma_pdc": cfg.array.gamma_pdc,
            "tracking": cfg.array.tracking,
            "system_losses_pct": project.system_losses * 100,
            "degradation_factor": round(degradation_factor(cfg, as_of)[0], 4),
            "degradation_model": cfg.degradation_model,
            "years_since_commissioning": round(cfg.years_since_commission(as_of), 1),
            "racking_type": project.racking_type or DEFAULT_RACKING_TYPE,
        },
        model_metadata={
            "pvlib_version": pvlib.__version__,
            "transposition_model": TRANSPOSITION_MODEL,
            "temperature_model": TEMPERATURE_MODEL,
            "iam_model": IAM_MODEL,
            "engine": ENGINE_NAME,
            "engine_version": ENGINE_VERSION,
            "verification_engine_version": ENGINE_A_VERSION,
            "model": "pvlib PVWatts ModelChain (Engine A)",
        },
        warnings=[],
        # ── Additive Engine A fields ──
        p50_kwh=round(budget.p50_kwh, 1),
        p90_kwh=round(budget.p90_kwh, 1),
        combined_uncertainty_pct=round(budget.total_sigma * 100, 3),
        weather_source=weather_source,
        engine_version=ENGINE_A_VERSION,
        loss_waterfall=[
            LossWaterfallLine(
                step=w.name, loss_pct=round(w.loss_pct, 3),
                energy_after_kwh=round(w.energy_after_kwh, 1),
            )
            for w in waterfall
        ],
    )


# ── Engine A config assembly ────────────────────────────────────────────────

def _system_config(project: ProjectSystemInput) -> SystemConfig:
    """Build an Engine A SystemConfig from the service's project input."""
    racking = project.racking_type or DEFAULT_RACKING_TYPE
    module_params = MODULE_PARAMS.get(
        project.module_type or DEFAULT_MODULE_TYPE, MODULE_PARAMS[DEFAULT_MODULE_TYPE]
    )
    dc_ac_ratio = project.dc_ac_ratio or DEFAULT_DC_AC_RATIO

    return SystemConfig(
        name=f"project@{project.latitude:.3f},{project.longitude:.3f}",
        location=Location(
            latitude=project.latitude,
            longitude=project.longitude,
            tz=_timezone_for_longitude(project.longitude),
        ),
        array=ArrayConfig(
            surface_tilt=project.tilt_deg,
            surface_azimuth=project.azimuth_deg,
            dc_capacity_kw=project.capacity_kw_dc,
            ac_capacity_kw=project.capacity_kw_dc / dc_ac_ratio,
            gamma_pdc=module_params["gamma_pdc"],
            temperature_model=_RACKING_TO_TEMP_MODEL.get(racking, "open_rack_glass_glass"),
            tracking=racking in _TRACKING_RACKING,
        ),
        losses=_loss_assumptions_from_total(project.system_losses),
        commission_date=project.commissioning_date,
        degradation_rate_per_year=project.degradation_rate,
        degradation_model=project.degradation_model,
    )


def _loss_assumptions_from_total(system_losses_frac: float) -> LossAssumptions:
    """Distribute the caller's single ``system_losses`` derate across Engine A's
    canonical PVWatts loss buckets, preserving the *total* while still producing
    an itemized, IE-style waterfall. Degradation is modelled separately by A."""
    default = LossAssumptions()
    components = ["soiling", "shading", "snow", "mismatch", "wiring",
                  "connections", "lid", "nameplate_rating", "availability"]
    default_sum = sum(getattr(default, c) for c in components)
    target_pct = max(0.0, system_losses_frac) * 100.0
    scale = (target_pct / default_sum) if default_sum > 0 else 0.0
    return LossAssumptions(**{c: getattr(default, c) * scale for c in components})


# ── Weather decomposition (daily -> hourly clear-sky-weighted) ──────────────

def _hourly_weather_frame(
    project: ProjectSystemInput, daily_weather: list[DailyWeatherInput]
) -> pd.DataFrame:
    """Expand daily GHI/DNI/DHI totals into a tz-aware hourly weather frame.

    Each day's energy is spread across 24 hours following the clear-sky shape so
    solar position, transposition, and temperature derating are resolved
    correctly while the measured daily totals are preserved.
    """
    tz = _timezone_for_longitude(project.longitude)
    location = pvlib.location.Location(project.latitude, project.longitude, tz=tz)

    frames: list[pd.DataFrame] = []
    for day in daily_weather:
        times = pd.date_range(start=pd.Timestamp(day.date), periods=24, freq="h", tz=tz)
        clearsky = location.get_clearsky(times, model=CLEARSKY_MODEL)
        frames.append(
            pd.DataFrame(
                {
                    # kWh/m²/day -> Wh/m²/day, distributed to W/m² per hour.
                    "ghi": _distribute(day.ghi_kwh_m2 * 1000.0, clearsky["ghi"], times),
                    "dni": _distribute(day.dni_kwh_m2 * 1000.0, clearsky["dni"], times),
                    "dhi": _distribute(day.dhi_kwh_m2 * 1000.0, clearsky["dhi"], times),
                    "temp_air": day.temp_air_c,
                    "wind_speed": day.wind_speed_m_s,
                },
                index=times,
            )
        )
    return pd.concat(frames).sort_index()


def _distribute(daily_total_wh: float, shape: pd.Series, index: pd.DatetimeIndex) -> pd.Series:
    shape_sum = float(shape.sum())
    if shape_sum > 0:
        return shape * (daily_total_wh / shape_sum)
    return pd.Series(0.0, index=index)


# ── Monthly aggregation ─────────────────────────────────────────────────────

def _monthly_breakdown(frame: pd.DataFrame, capacity_kw_dc: float) -> list[MonthlyBreakdown]:
    daily_net = frame["net_kwh"].resample("D").sum()
    # Period grouping on a tz-naive copy (wall time) avoids pandas dropping tz.
    month_key = frame.index.tz_localize(None).to_period("M")
    daily_month_key = daily_net.index.tz_localize(None).to_period("M")
    out: list[MonthlyBreakdown] = []
    for month_period, group in frame.groupby(month_key):
        expected_kwh = float(group["net_kwh"].sum())
        poa_total = float(group["poa_kwh_m2"].sum())
        sunlit = group["cell_temp_c"][group["poa_kwh_m2"] > 0.01]
        cell_temp_avg = float(sunlit.mean()) if len(sunlit) else 0.0
        days_in_month = int(month_period.days_in_month)
        month_days = daily_net[daily_month_key == month_period]
        days_with_data = int((month_days > 0).sum())
        hours_in_month = days_in_month * 24

        capacity_factor = (
            expected_kwh / (capacity_kw_dc * hours_in_month)
            if capacity_kw_dc > 0 and hours_in_month > 0
            else 0.0
        )
        # PR: AC yield / (POA x nameplate / 1000 W/m²).
        theoretical_max = poa_total * capacity_kw_dc / (STC_IRRADIANCE_W_M2 / 1000)
        performance_ratio = expected_kwh / theoretical_max if theoretical_max > 0 else 0.0

        out.append(
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
    return out


# ── pvlib result accessors (tolerate Series vs single-array tuple shapes) ───

def _poa_global(results) -> pd.Series:
    total = results.total_irrad
    if isinstance(total, tuple):
        total = total[0]
    return total["poa_global"]


def _cell_temperature(results) -> pd.Series:
    ct = results.cell_temperature
    return ct[0] if isinstance(ct, tuple) else ct


def _interval_hours(index: pd.DatetimeIndex) -> float:
    if len(index) < 2:
        return 1.0
    return float(pd.Series(index).diff().median().total_seconds() / 3600.0)


def _timezone_for_longitude(longitude: float) -> str:
    """Approximate fixed-offset tz from longitude (Etc/GMT signs are inverted)."""
    tz_offset = int(round(longitude / 15))
    if tz_offset >= 0:
        return f"Etc/GMT-{tz_offset}"
    return f"Etc/GMT+{abs(tz_offset)}"
