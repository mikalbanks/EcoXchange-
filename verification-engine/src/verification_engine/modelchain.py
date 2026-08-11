"""Physics-based expected-energy model (pvlib PVWatts ModelChain).

This is the core accuracy upgrade: instead of mapping irradiance to energy with
a hand-rolled correlation, we run a proper plane-of-array transposition ->
cell-temperature -> DC -> inverter chain. The output is an *expected energy*
series you reconcile the revenue meter against.

We use the PVWatts modelchain because verification rarely has full module/inverter
datasheets; PVWatts needs only DC rating, temp coefficient, and a loss stack,
which is exactly what an IE report provides.
"""
from __future__ import annotations

import pandas as pd

from pvlib.location import Location as PVLocation
from pvlib.pvsystem import PVSystem, Array, FixedMount, SingleAxisTrackerMount
from pvlib.modelchain import ModelChain
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS

from .config import SystemConfig, ArrayConfig
from .irradiance import NaiveTimestampError


def _build_mount(arr: ArrayConfig):
    """Fixed-tilt vs single-axis tracker mount (§1.2).

    A horizontal single-axis tracker keeps the plane-of-array near-normal to the
    sun through the day, so a fixed-tilt model under-predicts a tracking site by
    roughly 15-25%. Selecting the right mount is what closes that gap.
    """
    if arr.tracking:
        return SingleAxisTrackerMount(
            axis_tilt=arr.axis_tilt,
            axis_azimuth=arr.axis_azimuth,
            max_angle=arr.max_angle,
            backtrack=arr.backtrack,
            gcr=arr.gcr,
        )
    return FixedMount(
        surface_tilt=arr.surface_tilt,
        surface_azimuth=arr.surface_azimuth,
    )


def build_modelchain(cfg: SystemConfig) -> ModelChain:
    temp_params = TEMPERATURE_MODEL_PARAMETERS["sapm"][cfg.array.temperature_model]

    # Explicit Array(mount=...) form so fixed-tilt and single-axis tracking share
    # one code path; module + temperature parameters live on the Array.
    array = Array(
        mount=_build_mount(cfg.array),
        module_parameters={
            "pdc0": cfg.array.dc_capacity_kw * 1000.0,   # W DC at STC
            "gamma_pdc": cfg.array.gamma_pdc,
        },
        temperature_model_parameters=temp_params,
    )

    system = PVSystem(
        arrays=[array],
        inverter_parameters={
            "pdc0": cfg.array.ac_capacity() * 1000.0,    # W AC nameplate
        },
        # Component losses are applied explicitly in losses.py so each shows up
        # as its own waterfall line; we therefore zero pvlib's internal losses.
        losses_parameters={k: 0.0 for k in [
            "soiling", "shading", "snow", "mismatch", "wiring",
            "connections", "lid", "nameplate_rating", "age", "availability"]},
    )

    pvloc = PVLocation(
        latitude=cfg.location.latitude,
        longitude=cfg.location.longitude,
        altitude=cfg.location.altitude,
        tz=cfg.location.tz,
    )

    return ModelChain(
        system, pvloc,
        transposition_model="perez",   # §1.1: Perez is the industry-standard sky-diffuse model
        aoi_model="physical",
        spectral_model="no_loss",
        dc_model="pvwatts",
        ac_model="pvwatts",
        losses_model="no_loss",
    )


def expected_ac_energy(cfg: SystemConfig, weather: pd.DataFrame) -> pd.Series:
    """Return a tz-aware AC ENERGY series in kWh per interval (pre external losses).

    The interval length is inferred from the weather index, so hourly data yields
    kWh/hour and 15-min data yields kWh/15-min, both correctly scaled.
    """
    mc = build_modelchain(cfg)
    # ModelChain wants tz-aware weather in the location tz. A naive index is
    # rejected rather than assumed to be UTC: NASA POWER hourly is local solar
    # time by default, so that assumption is a `round(lon / 15)`-hour phase error
    # that shows up as production at midnight (spec 20 §2.1).
    if weather.index.tz is None:
        raise NaiveTimestampError(
            "expected_ac_energy received weather with a naive index. Localize it "
            "to the time standard the source actually used — irradiance.py's "
            "fetchers already return UTC."
        )
    weather = weather.tz_convert(cfg.location.tz)

    mc.run_model(weather)
    ac_power_w = mc.results.ac.clip(lower=0)  # W

    interval_hours = _interval_hours(weather.index)
    return (ac_power_w / 1000.0) * interval_hours   # kWh per interval


def _interval_hours(index: pd.DatetimeIndex) -> float:
    if len(index) < 2:
        return 1.0
    delta = pd.Series(index).diff().median()
    return float(delta.total_seconds() / 3600.0)
