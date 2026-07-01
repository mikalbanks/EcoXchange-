"""Meter source — load metered interval energy from Supabase as a tz-aware Series.

Spec 01-C Step 3 replaces the CSV meter loader with a Supabase query. The engine
only needs a tz-aware ``pd.Series`` of kWh-per-interval, so this module returns
exactly that and nothing more.

Metered energy lives in ``sgt_intervals`` (``net_wh`` per interval), linked to a
project through ``meters.project_id``. We read it over Supabase's PostgREST API
using the service-role key from the environment — nothing is hardcoded.

Env:
    SUPABASE_URL                 e.g. https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY    service-role key (server-side only)
"""
from __future__ import annotations

import os
from typing import Optional

import pandas as pd
import requests

_PAGE = 1000  # PostgREST default max rows per request; page through with Range.


def _headers(key: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}


def _base_and_key(supabase_url: Optional[str], service_key: Optional[str]) -> tuple[str, str]:
    url = supabase_url or os.environ.get("SUPABASE_URL")
    key = service_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load meter data from Supabase."
        )
    return url.rstrip("/"), key


def _get_all(rest_url: str, params: dict, key: str) -> list[dict]:
    """Page through a PostgREST collection with Range headers."""
    rows: list[dict] = []
    offset = 0
    while True:
        headers = _headers(key)
        headers["Range-Unit"] = "items"
        headers["Range"] = f"{offset}-{offset + _PAGE - 1}"
        resp = requests.get(rest_url, params=params, headers=headers, timeout=60)
        resp.raise_for_status()
        batch = resp.json()
        rows.extend(batch)
        if len(batch) < _PAGE:
            break
        offset += _PAGE
    return rows


def load_meter_from_supabase(
    project_id: str,
    start: str,
    end: str,
    tz: str = "UTC",
    supabase_url: Optional[str] = None,
    service_key: Optional[str] = None,
) -> pd.Series:
    """Return a tz-aware kWh-per-interval Series for ``project_id`` in [start, end).

    ``start`` / ``end`` are ISO timestamps (UTC). The returned Series is indexed
    by ``interval_start`` converted to ``tz`` and carries kWh (``net_wh`` / 1000).
    """
    base, key = _base_and_key(supabase_url, service_key)
    rest = f"{base}/rest/v1"

    # 1. Resolve the project's meters.
    meters = _get_all(
        f"{rest}/meters",
        {"select": "id", "project_id": f"eq.{project_id}"},
        key,
    )
    meter_ids = [m["id"] for m in meters]
    if not meter_ids:
        raise ValueError(f"No meters found for project {project_id}.")

    # 2. Pull interval energy for those meters in the window. PostgREST needs two
    #    filters on the same column (gte + lt), so params are a list of tuples —
    #    a dict would collapse the duplicate `interval_start` key.
    in_list = ",".join(f'"{mid}"' for mid in meter_ids)
    rows = _get_all(
        f"{rest}/sgt_intervals",
        [
            ("select", "interval_start,net_wh"),
            ("meter_id", f"in.({in_list})"),
            ("interval_start", f"gte.{start}"),
            ("interval_start", f"lt.{end}"),
            ("order", "interval_start.asc"),
        ],
        key,
    )
    if not rows:
        raise ValueError(f"No sgt_intervals for project {project_id} in [{start}, {end}).")

    df = pd.DataFrame(rows)
    idx = pd.to_datetime(df["interval_start"], utc=True)
    kwh = pd.to_numeric(df["net_wh"], errors="coerce") / 1000.0
    series = pd.Series(kwh.values, index=idx).dropna().sort_index()
    return series.tz_convert(tz)
