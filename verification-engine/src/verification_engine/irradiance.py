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

TIME STANDARD (spec 20 §2.1). The NASA POWER hourly endpoint defaults to
**local solar time**, not UTC. Measured against the live API for Greeley CO
(lon -104.71) on 2024-06-15, the GHI peak lands at hour 11 with the parameter
omitted and at hour 18 with `time-standard=utc` — a 7-hour shift, i.e. roughly
`round(lon / 15)`. Reading an LST series as UTC puts peak production in the
middle of the night and silently corrupts every downstream expected-energy
figure.

pvlib 0.15.x sends `time-standard: utc` explicitly and localizes the index to
UTC, so the pvlib path is correct today. That correctness is inherited, not
stated, and would disappear silently on a version change. Every fetcher here
therefore ends at `_normalize`, which *enforces* the contract rather than
assuming it: the returned index is always tz-aware UTC, and a naive index is an
error rather than something to guess at. `tests/test_time_alignment.py` holds
the guardrail.
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


#: NASA POWER's hourly JSON endpoint caps the time extent of a single request.
#: Past it the API returns 422 with *"please shorten your requested time extent
#: for a JSON formatted data request"* — a hard refusal, not a truncation, so a
#: long window fails outright rather than quietly returning a short one. A
#: calendar year per request sits comfortably inside the limit.
NASA_POWER_MAX_DAYS_PER_REQUEST = 366


def fetch_nasa_power(loc: Location, start: str, end: str) -> pd.DataFrame:
    """NASA POWER hourly, indexed in UTC. No key required. start/end 'YYYY-MM-DD'.

    The endpoint itself defaults to local solar time; pvlib requests
    `time-standard=utc` and localizes accordingly. `_normalize` enforces the UTC
    result rather than trusting it — see the module docstring (spec 20 §2.1).

    Windows longer than a year are split into year-sized requests and
    concatenated. Spec 22's analytics windows run to 7.8 years, which the API
    refuses outright; spec 21's 24-month windows were accepted as a single
    request, so the true ceiling sits somewhere between two years and eight. The
    error message does not say where, and neither do the docs, so the chunk size
    here is deliberately well inside the range known to work rather than tuned
    to a limit nobody has stated. The extra requests are cheap; a 422 partway
    through a multi-hour analytics run is not.

    The split is on whole days so no hour falls in two chunks, and duplicate
    stamps at the seams are dropped.
    """
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)
    if end_ts < start_ts:
        raise ValueError(f"end {end} precedes start {start}")

    span_days = (end_ts - start_ts).days
    if span_days <= NASA_POWER_MAX_DAYS_PER_REQUEST:
        return _normalize(_nasa_power_request(loc, start_ts, end_ts))

    frames = []
    chunk_start = start_ts
    while chunk_start <= end_ts:
        chunk_end = min(
            chunk_start + pd.Timedelta(days=NASA_POWER_MAX_DAYS_PER_REQUEST - 1),
            end_ts,
        )
        frames.append(_normalize(_nasa_power_request(loc, chunk_start, chunk_end)))
        chunk_start = chunk_end + pd.Timedelta(days=1)

    combined = pd.concat(frames)
    combined = combined[~combined.index.duplicated(keep="first")].sort_index()
    return combined


def _nasa_power_request(
    loc: Location, start: pd.Timestamp, end: pd.Timestamp
) -> pd.DataFrame:
    from pvlib import iotools
    df, _ = iotools.get_nasa_power(
        latitude=loc.latitude, longitude=loc.longitude,
        start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"),
        map_variables=True,
    )
    return df


def fetch_pvgis(loc: Location, start_year: int, end_year: int) -> pd.DataFrame:
    """PVGIS hourly. No key. Best coverage outside the Americas."""
    from pvlib import iotools
    df, _, _ = iotools.get_pvgis_hourly(
        latitude=loc.latitude, longitude=loc.longitude,
        start=start_year, end=end_year, map_variables=True,
    )
    return _normalize(df)


class NaiveTimestampError(ValueError):
    """A source returned timestamps with no time zone, so the standard is unknown.

    Raised rather than defaulted. NASA POWER hourly is LST by default and UTC on
    request; the two differ by hours, and nothing in a naive index says which one
    you are holding. Guessing is how a whole-day phase error survives review.
    """


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce a source frame to canonical columns, indexed in tz-aware UTC.

    Missing optional channels are tolerated. A naive index is not: see
    `NaiveTimestampError`.
    """
    index = pd.to_datetime(df.index)
    if index.tz is None:
        raise NaiveTimestampError(
            "Irradiance source returned timestamps with no time zone. NASA POWER "
            "hourly is local solar time unless 'time-standard=utc' is requested; "
            "localize the index to the standard the source actually used before "
            "normalizing (spec 20 §2.1)."
        )
    # Re-index the source itself before reading columns, so the channel copies
    # below never align a UTC frame against a fixed-offset one (NSRDB PSM4 comes
    # back in local standard time, NASA POWER and PVGIS in UTC).
    src = df.copy()
    src.index = index.tz_convert("UTC")

    out = pd.DataFrame(index=src.index)
    aliases = {
        "ghi": ["ghi", "GHI"],
        "dni": ["dni", "DNI"],
        "dhi": ["dhi", "DHI"],
        "temp_air": ["temp_air", "temperature", "t2m", "T2M"],
        "wind_speed": ["wind_speed", "ws", "WS10M"],
    }
    for canon, opts in aliases.items():
        col = next((c for c in opts if c in src.columns), None)
        out[canon] = src[col] if col is not None else np.nan
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
