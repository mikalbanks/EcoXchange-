"""Turning a `SiteDescriptor` into a `SystemConfig` — one copy, two callers.

Spec 22 §4 requires the analytics module's `gamma_pdc` and temperature model to
be "consistent with the ModelChain config" used for the expected-energy leg,
because "divergent assumptions between the two modules would be a silent
inconsistency". The reliable way to satisfy that is not to write the same
constants twice and remember to keep them equal; it is to have one function that
both callers use.

So this is `scripts/ingest_pvdaq.py`'s `site_config()`, moved here. The ingestion
script now imports it, and so does `trend.py`.

A note on §4's literal. The spec says `gamma_pdc=-0.004` and cites
`run_backtest.py` as the file to match. There is no `run_backtest.py` in this
repository, and the config of record — `verification_engine.config.ArrayConfig`,
which is what actually drives `build_modelchain()` — carries **-0.0035**. Taking
the spec's literal would create precisely the divergence the sentence is written
to prevent: the analytics module would normalize against one temperature
coefficient while the expected-energy leg modelled against another. The value
used is read from `ArrayConfig` and recorded per run in the artifact, so the
divergence from the spec's number is visible rather than assumed.
"""
from __future__ import annotations

from datetime import date

from ingestion.base import SiteDescriptor
from verification_engine.config import (
    ArrayConfig,
    Location,
    LossAssumptions,
    SystemConfig,
)


def site_config(site: SiteDescriptor) -> SystemConfig:
    """A `SystemConfig` from what the site descriptor actually knows.

    Tilt and azimuth come from the deduplicated index row. For a multi-array
    system that number is a merge, not a measurement — 1332's 38.4 deg is the
    DC-weighted mean of a 16.77 deg garage deck and a 60 deg face — and the
    resulting expected leg carries that uncertainty. It is recorded in the
    artifact's provenance block rather than hidden in a config.
    """
    tracking = str(site.extra.get("tracking") or "").lower() == "tracking"
    dc_kw = site.capacity_kw_dc or 1000.0
    return SystemConfig(
        name=f"PVDAQ {site.external_id} — {site.name}",
        location=Location(site.latitude, site.longitude, altitude=0.0,
                          tz=site.iana_timezone),
        array=ArrayConfig(
            surface_tilt=float(site.tilt_deg or 0.0),
            surface_azimuth=float(site.azimuth_deg or 180.0),
            dc_capacity_kw=dc_kw,
            ac_capacity_kw=dc_kw / 1.2,
            tracking=tracking,
        ),
        losses=LossAssumptions(),
        commission_date=site.first_data or date(2010, 1, 1),
    )


def normalization_inputs(cfg: SystemConfig) -> dict:
    """The assumptions a degradation rate was normalized under.

    Frozen into every `plant_analytics` row's provenance. §5 is emphatic that
    normalization must never be re-fit on a rolling basis, because a rolling fit
    absorbs the degradation trend and destroys the claim — and that the risk is
    *higher* with RdTools than with a hand-rolled factor, since its normalization
    is more aggressive.

    Recording the inputs is what makes the freeze checkable. Two rows for the
    same project computed under different assumptions are not two measurements of
    the same thing, and without this block there is no way to tell them apart
    after the fact.
    """
    return {
        "gamma_pdc": cfg.array.gamma_pdc,
        "gamma_pdc_source": (
            "verification_engine.config.ArrayConfig — the same value "
            "build_modelchain() uses for the expected-energy leg. Spec 22 §4 "
            "quotes -0.004 against a run_backtest.py that does not exist in this "
            "repository; matching the config of record is what the sentence is "
            "actually asking for."
        ),
        "temperature_model": cfg.array.temperature_model,
        "dc_capacity_kw": cfg.array.dc_capacity_kw,
        "surface_tilt": cfg.array.surface_tilt,
        "surface_azimuth": cfg.array.surface_azimuth,
        "tracking": cfg.array.tracking,
        "latitude": cfg.location.latitude,
        "longitude": cfg.location.longitude,
        "timezone": cfg.location.tz,
        "config_hash": cfg.config_hash(),
    }
