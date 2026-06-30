"""Multi-source irradiance ingestion and triangulation.

Single-source satellite irradiance carries a systematic bias of roughly 3-5%.
Pulling three independent free sources and taking the per-timestamp median
suppresses single-source bias, and the spread BETWEEN sources gives you a
data-driven irradiance uncertainty term that feeds the P50/P90 budget.

Sources (all free; some need a no-cost key/registration):
  - NSRDB PSM4  (NREL)        -> requires a free NREL API key + email
  - NASA POWER               -> no key
  - PVGIS                    -> no key (Europe/Africa/Asia coverage; sparse in US)

NOTE FOR CLAUDE CODE: pvlib iotools signatures are version-sensitive. This is
written for pvlib 0.15.x (PSM4). On pvlib <=0.12 the function is
`get_nsrdb_psm3`. Verify against the installed version before wiring secrets.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import warnings

import numpy as np
import pandas as pd

from .config import Location

# Canonical columns we normalize every source down to.
CANON = ["ghi", "dni", "dhi", "temp_air", "wind_speed"]


@dataclass
class IrradianceResult:
    weather: pd.DataFrame              # triangulated, canonical columns, tz-aware
    per_source: dict                  # name -> DataFrame (for audit / debugging)
    ghi_spread_frac: float            # relative std across sources -> uncertainty input
    sources_used: list


def fetch_nsrdb(loc: Location, year: int, api_key: str, email: str) -> pd.DataFrame:
    """NREL NSRDB PSM4. Free key: https://developer.nrel.gov/signup/"""
    from pvlib import iotools
    df, _ = iotools.get_nsrdb_psm4_aggregated(
        latitude=loc.latitude, longitude=loc.longitude,
        api_key=api_key, email=email, year=year,
        map_variables=True,
    )
    return _normalize(df)


def fetch_nasa_power(loc: Location, start: str, end: str) -> pd.DataFrame:
    """NASA POWER hourly. No key required. start/end as 'YYYY-MM-DD'."""
    from pvlib import iotools
    df, _ = iotools.get_nasa_power(
        latitude=loc.latitude, longitude=loc.longitude,
        start=start, end=end, map_variables=True,
    )
    return _normalize(df)


def fetch_pvgis(loc: Location, start_year: int, end_year: int) -> pd.DataFrame:
    """PVGIS hourly. No key. Best coverage outside the Americas."""
    from pvlib import iotools
    df, _, _ = iotools.get_pvgis_hourly(
        latitude=loc.latitude, longitude=loc.longitude,
        start=start_year, end=end_year, map_variables=True,
    )
    return _normalize(df)


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce a source frame to canonical columns; tolerate missing optionals."""
    out = pd.DataFrame(index=pd.to_datetime(df.index))
    aliases = {
        "ghi": ["ghi", "GHI"],
        "dni": ["dni", "DNI"],
        "dhi": ["dhi", "DHI"],
        "temp_air": ["temp_air", "temperature", "t2m", "T2M"],
        "wind_speed": ["wind_speed", "ws", "WS10M"],
    }
    for canon, opts in aliases.items():
        col = next((c for c in opts if c in df.columns), None)
        out[canon] = df[col] if col is not None else np.nan
    return out


def triangulate(sources: dict[str, pd.DataFrame]) -> IrradianceResult:
    """Median across sources per timestamp; spread feeds the uncertainty budget.

    All source frames are reindexed onto the intersection of their hourly
    timestamps so the median is computed over genuinely aligned observations.
    """
    valid = {k: v for k, v in sources.items() if v is not None and not v.empty}
    if not valid:
        raise ValueError("No irradiance sources returned data.")

    # Common hourly index (intersection) so we compare like-for-like.
    common = None
    for df in valid.values():
        idx = df.index.floor("h")
        common = idx if common is None else common.intersection(idx)
    if common is None or len(common) == 0:
        raise ValueError("Irradiance sources share no overlapping timestamps.")

    aligned = {k: v.copy().set_axis(v.index.floor("h")).reindex(common)
               for k, v in valid.items()}

    # Median per canonical channel.
    combined = pd.DataFrame(index=common)
    for ch in CANON:
        stack = pd.concat([aligned[k][ch] for k in aligned], axis=1)
        combined[ch] = stack.median(axis=1, skipna=True)

    # Relative inter-source spread on GHI -> irradiance uncertainty input.
    ghi_stack = pd.concat([aligned[k]["ghi"] for k in aligned], axis=1)
    daytime = ghi_stack[ghi_stack.mean(axis=1) > 50]  # ignore night
    if len(daytime) and len(aligned) > 1:
        rel = (daytime.std(axis=1, ddof=0) / daytime.mean(axis=1)).replace(
            [np.inf, -np.inf], np.nan)
        ghi_spread_frac = float(rel.mean(skipna=True))
    else:
        # Single source: fall back to a literature default of ~4%.
        ghi_spread_frac = 0.04
        if len(aligned) == 1:
            warnings.warn("Only one irradiance source; using 4% default uncertainty.")

    return IrradianceResult(
        weather=combined,
        per_source=aligned,
        ghi_spread_frac=ghi_spread_frac,
        sources_used=list(aligned.keys()),
    )
