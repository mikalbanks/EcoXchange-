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
from pvlib.pvsystem import PVSystem
from pvlib.modelchain import ModelChain
from pvlib.temperature import TEMPERATURE_MODEL_PARAMETERS

from .config import SystemConfig


def build_modelchain(cfg: SystemConfig) -> ModelChain:
    temp_params = TEMPERATURE_MODEL_PARAMETERS["sapm"][cfg.array.temperature_model]

    system = PVSystem(
        surface_tilt=cfg.array.surface_tilt,
        surface_azimuth=cfg.array.surface_azimuth,
        module_parameters={
            "pdc0": cfg.array.dc_capacity_kw * 1000.0,   # W DC at STC
            "gamma_pdc": cfg.array.gamma_pdc,
        },
        inverter_parameters={
            "pdc0": cfg.array.ac_capacity() * 1000.0,    # W AC nameplate
        },
        temperature_model_parameters=temp_params,
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
    # ModelChain wants tz-aware weather in the location tz.
    if weather.index.tz is None:
        weather = weather.tz_localize("UTC")
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
