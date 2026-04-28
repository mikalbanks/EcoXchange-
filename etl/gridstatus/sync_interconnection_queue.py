#!/usr/bin/env python3
"""
Sync solar (and solar-relevant hybrid) rows from GridStatus interconnection queues into Postgres.

Requires: DATABASE_URL, optional GRIDSTATUS_ISOS=CAISO,PJM,SPP (comma-separated)

Usage:
  pip install -r requirements.txt
  export DATABASE_URL=postgresql://...
  export GRIDSTATUS_ISOS=CAISO,PJM,SPP
  python sync_interconnection_queue.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any

import gridstatus
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

ID_CANDIDATES = ("Queue ID", "Project ID", "ID", "Queue Position", "Request ID")
NAME_CANDIDATES = ("Project Name", "Name", "Project")
FUEL_CANDIDATES = (
    "Fuel",
    "Fuel Type",
    "Type",
    "Energy Source",
    "Generation Type",
    "Prime Mover",
)
STATUS_CANDIDATES = ("Queue Status", "Status", "Project Status", "State")
CAP_CANDIDATES = ("Capacity (MW)", "MW", "Net MW", "Summer MW", "MW In Service")
STATE_CANDIDATES = ("State", "State/Location", "State/Province")
COUNTY_CANDIDATES = ("County",)
LAT_CANDIDATES = ("Lat", "Latitude", "lat")
LON_CANDIDATES = ("Long", "Longitude", "lon", "Lng")

ISO_FACTORIES: dict[str, Any] = {
    "CAISO": lambda: gridstatus.CAISO(),
    "PJM": lambda: gridstatus.PJM(),
    "SPP": lambda: gridstatus.SPP(),
    "ERCOT": lambda: gridstatus.Ercot(),
    "MISO": lambda: gridstatus.MISO(),
    "ISONE": lambda: gridstatus.ISONE(),
    "NYISO": lambda: gridstatus.NYISO(),
}


def _col(df: pd.DataFrame, names: tuple[str, ...]) -> str | None:
    for n in names:
        if n in df.columns:
            return n
    for c in df.columns:
        for n in names:
            if c.lower() == n.lower():
                return c
    return None


def _is_solarish(fuel: str) -> bool:
    if not fuel or not isinstance(fuel, str):
        return False
    t = fuel.lower()
    if "solar" in t or "pv" in t:
        return True
    if "wind" in t and "solar" in t:
        return True
    if "storage" in t and "solar" in t:
        return True
    return False


def _safe_str(x: Any) -> str:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return ""
    return str(x).strip()


def _safe_float(x: Any) -> float | None:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    try:
        s = str(x).strip()
        s = re.sub(r"[^0-9.\-]", "", s)
        if s in ("", "-"):
            return None
        return float(s)
    except Exception:
        return None


def fetch_iso_queue(iso: str) -> pd.DataFrame:
    fac = ISO_FACTORIES.get(iso.upper())
    if not fac:
        raise ValueError(f"Unsupported ISO: {iso}. Choose from {list(ISO_FACTORIES)}")
    obj = fac()
    q = obj.get_interconnection_queue()
    if not isinstance(q, pd.DataFrame):
        q = pd.DataFrame(q)
    return q


def rows_for_db(iso: str, df: pd.DataFrame) -> list[tuple]:
    out: list[tuple] = []
    id_c = _col(df, ID_CANDIDATES)
    name_c = _col(df, NAME_CANDIDATES)
    fuel_c = _col(df, FUEL_CANDIDATES)
    st_c = _col(df, STATUS_CANDIDATES)
    cap_c = _col(df, CAP_CANDIDATES)
    state_c = _col(df, STATE_CANDIDATES)
    county_c = _col(df, COUNTY_CANDIDATES)
    lat_c = _col(df, LAT_CANDIDATES)
    lon_c = _col(df, LON_CANDIDATES)

    for i, row in df.iterrows():
        fuel = _safe_str(fuel_c and row.get(fuel_c, ""))
        if not _is_solarish(fuel):
            continue
        ext = _safe_str(id_c and row.get(id_c, "")) or f"row-{i}"
        name = _safe_str(name_c and row.get(name_c, "")) or "Unknown"
        st = _safe_str(state_c and row.get(state_c, "")) if state_c else ""
        raw = row.to_dict() if hasattr(row, "to_dict") else dict(row)
        try:
            raw_json = json.dumps(raw, default=str)
        except Exception:
            raw_json = "{}"
        out.append(
            (
                ext,
                iso.upper(),
                name,
                _safe_str(st_c and row.get(st_c, "")) if st_c else None,
                fuel or None,
                _safe_float(row.get(cap_c)) if cap_c else None,
                st,
                _safe_str(county_c and row.get(county_c, "")) if county_c else None,
                _safe_float(row.get(lat_c)) if lat_c else None,
                _safe_float(row.get(lon_c)) if lon_c else None,
                raw_json,
            )
        )
    return out


def upsert(conn, rows: list[tuple]) -> int:
    if not rows:
        return 0
    now = datetime.now(timezone.utc)
    fixed: list[tuple] = [r + (now,) for r in rows]
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO interconnection_queue_entries (
              external_id, iso_code, project_name, queue_status, resource_type,
              capacity_mw, state, county, latitude, longitude, raw_json, synced_at
            ) VALUES %s
            ON CONFLICT (iso_code, external_id) DO UPDATE SET
              project_name = EXCLUDED.project_name,
              queue_status = EXCLUDED.queue_status,
              resource_type = EXCLUDED.resource_type,
              capacity_mw = EXCLUDED.capacity_mw,
              state = EXCLUDED.state,
              county = EXCLUDED.county,
              latitude = EXCLUDED.latitude,
              longitude = EXCLUDED.longitude,
              raw_json = EXCLUDED.raw_json,
              synced_at = EXCLUDED.synced_at
            """,
            fixed,
        )
    return len(fixed)


def main() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL is required", file=sys.stderr)
        return 1
    isos = os.environ.get("GRIDSTATUS_ISOS", "CAISO,PJM,SPP").split(",")
    isos = [x.strip().upper() for x in isos if x.strip()]

    total = 0
    with psycopg2.connect(dsn) as conn:
        for iso in isos:
            try:
                df = fetch_iso_queue(iso)
            except Exception as e:
                print(f"{iso}: fetch failed: {e}", file=sys.stderr)
                continue
            rows = rows_for_db(iso, df)
            n = upsert(conn, rows)
            conn.commit()
            print(f"{iso}: upserted {n} solar rows (of {len(df)} total)")
            total += n
    print(f"Done. Total solar rows upserted: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
