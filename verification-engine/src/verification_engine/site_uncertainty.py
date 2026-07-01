"""Per-site interannual variability (§3).

The P50/P90 budget's biggest single term is interannual weather variability —
how much a site's annual energy swings year to year. A flat 3.5% literature
default over- or under-states this depending on climate (desert Southwest is
tighter; monsoon / coastal sites are wider). This module computes a *per-site*
value from all available NSRDB years (1998–2023) for the location and caches it
in the ``site_uncertainty`` table so the expensive multi-year fetch runs once.

Pure stats (``interannual_variability_from_annual_totals``) are network-free and
unit-tested; the NSRDB fetch and the Supabase cache degrade gracefully to the
literature default when keys/connectivity are absent.

Env:
    NREL_API_KEY / NREL_EMAIL                 NSRDB fetch
    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  cache read/write (optional)
"""
from __future__ import annotations

import os
from typing import Optional, Sequence

import numpy as np
import requests

from .config import Location
from .uncertainty import DEFAULT_INTERANNUAL_VARIABILITY

# Full NSRDB PSM v3/v4 record span. Override per call if a site has a shorter span.
NSRDB_YEARS = tuple(range(1998, 2024))


def interannual_variability_from_annual_totals(totals: Sequence[float]) -> float:
    """Relative interannual variability (1-sigma) = std(annual) / mean(annual).

    Uses the sample standard deviation (ddof=1). Falls back to the literature
    default when fewer than two valid years are available.
    """
    arr = np.asarray([t for t in totals if t is not None and t > 0], dtype=float)
    if arr.size < 2:
        return DEFAULT_INTERANNUAL_VARIABILITY
    mean = float(arr.mean())
    if mean <= 0:
        return DEFAULT_INTERANNUAL_VARIABILITY
    return float(np.std(arr, ddof=1) / mean)


def site_key(loc: Location, precision: int = 3) -> str:
    """Stable cache key: lat/lon rounded to a grid (default ~100 m)."""
    return f"{round(loc.latitude, precision)},{round(loc.longitude, precision)}"


def compute_site_interannual_variability(
    loc: Location,
    years: Sequence[int] = NSRDB_YEARS,
    api_key: Optional[str] = None,
    email: Optional[str] = None,
) -> tuple[float, int, str]:
    """Fetch annual GHI for each NSRDB year and return (sigma, n_years, span).

    Requires an NREL key. Years that fail to fetch are skipped; the variability
    is computed over whatever years succeeded.
    """
    from .irradiance import fetch_nsrdb  # local import: avoids hard NSRDB dep at import time

    api_key = api_key or os.environ.get("NREL_API_KEY")
    email = email or os.environ.get("NREL_EMAIL", "")
    if not api_key:
        raise RuntimeError("Set NREL_API_KEY to compute per-site interannual variability.")

    annual_ghi: list[float] = []
    used_years: list[int] = []
    for year in years:
        try:
            df = fetch_nsrdb(loc, year, api_key, email)
            total = float(df["ghi"].sum())
            if total > 0:
                annual_ghi.append(total)
                used_years.append(year)
        except Exception as exc:  # noqa: BLE001 — skip a bad year, keep going
            print(f"[warn] NSRDB {year} fetch failed for {site_key(loc)}: {exc}")

    sigma = interannual_variability_from_annual_totals(annual_ghi)
    span = f"{min(used_years)}-{max(used_years)}" if used_years else ""
    return sigma, len(used_years), span


# ── Supabase (PostgREST) cache for site_uncertainty ─────────────────────────

def _supabase() -> Optional[tuple[str, str]]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return url.rstrip("/"), key


def _headers(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def read_cached_sigma(loc: Location) -> Optional[float]:
    """Return the cached per-site sigma, or None on miss / no Supabase."""
    sb = _supabase()
    if not sb:
        return None
    base, key = sb
    try:
        resp = requests.get(
            f"{base}/rest/v1/site_uncertainty",
            params={"select": "interannual_variability", "site_key": f"eq.{site_key(loc)}"},
            headers=_headers(key), timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json()
        if rows:
            return float(rows[0]["interannual_variability"])
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] site_uncertainty cache read failed: {exc}")
    return None


def write_cached_sigma(loc: Location, sigma: float, n_years: int, span: str,
                       source: str = "nsrdb") -> None:
    """Upsert the per-site sigma into site_uncertainty (no-op without Supabase)."""
    sb = _supabase()
    if not sb:
        return
    base, key = sb
    headers = _headers(key)
    headers["Prefer"] = "resolution=merge-duplicates"
    payload = {
        "site_key": site_key(loc),
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "interannual_variability": round(sigma, 5),
        "n_years": n_years,
        "years_covered": span,
        "source": source,
    }
    try:
        resp = requests.post(
            f"{base}/rest/v1/site_uncertainty",
            params={"on_conflict": "site_key"},
            json=payload, headers=headers, timeout=30,
        )
        resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] site_uncertainty cache write failed: {exc}")


def get_or_compute_site_sigma(
    loc: Location,
    years: Sequence[int] = NSRDB_YEARS,
    api_key: Optional[str] = None,
    email: Optional[str] = None,
) -> float:
    """Cache-first per-site interannual variability.

    Cache hit -> return cached. Cache miss -> compute from NSRDB, cache, return.
    Any failure (no NSRDB key, network error) -> the literature default, so the
    budget is never blocked on this term.
    """
    cached = read_cached_sigma(loc)
    if cached is not None:
        return cached
    try:
        sigma, n_years, span = compute_site_interannual_variability(loc, years, api_key, email)
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] per-site sigma unavailable ({exc}); using {DEFAULT_INTERANNUAL_VARIABILITY}")
        return DEFAULT_INTERANNUAL_VARIABILITY
    if n_years >= 2:
        write_cached_sigma(loc, sigma, n_years, span)
    return sigma
