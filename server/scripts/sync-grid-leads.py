#!/usr/bin/env python3
"""
Solar Deal Flow Engine extraction service.

Fetches CAISO + PJM interconnection queues via gridstatus, applies strict investor
filters, and emits normalized JSON rows for TypeScript ingestion.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import gridstatus


TARGET_ISOS = ("CAISO", "PJM")
TARGET_TYPES = {"solar", "storage", "solar + storage", "solar+storage"}
TARGET_STATUSES = {"active", "ia executed"}
MIN_MW = 1.0
MAX_MW = 70.0


@dataclass
class Lead:
    queue_id: str
    project_name: str
    developer_entity: str
    county: str
    state: str
    capacity_mw: float
    latitude: float | None
    longitude: float | None
    asset_type: str
    status: str
    proposed_cod: str | None
    queue_submitted_date: str | None
    days_in_queue: int | None
    queue_iso: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "queueId": self.queue_id,
            "projectName": self.project_name,
            "developerEntity": self.developer_entity,
            "county": self.county,
            "state": self.state,
            "capacityMw": self.capacity_mw,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "assetType": self.asset_type,
            "status": self.status,
            "proposedCod": self.proposed_cod,
            "queueSubmittedDate": self.queue_submitted_date,
            "daysInQueue": self.days_in_queue,
            "queueIso": self.queue_iso,
        }


def _pick_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lowered = {str(c).strip().lower(): c for c in df.columns}
    for c in candidates:
        key = c.strip().lower()
        if key in lowered:
            return lowered[key]
    return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        if isinstance(value, str):
            cleaned = value.replace(",", "").replace("mw", "").strip()
            if cleaned == "":
                return None
            return float(cleaned)
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return str(value).strip()


def _to_iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    if isinstance(parsed, pd.Timestamp):
        if parsed.tzinfo is None:
            parsed = parsed.tz_localize(timezone.utc)
        else:
            parsed = parsed.tz_convert(timezone.utc)
        return parsed.date().isoformat()
    return None


def _days_in_queue(submitted_iso_date: str | None) -> int | None:
    if not submitted_iso_date:
        return None
    try:
        submitted = datetime.fromisoformat(submitted_iso_date).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = now - submitted
        return max(delta.days, 0)
    except ValueError:
        return None


def _load_iso_queue(iso_name: str) -> pd.DataFrame:
    if iso_name == "CAISO":
        return gridstatus.CAISO().get_interconnection_queue()
    if iso_name == "PJM":
        try:
            return gridstatus.PJM().get_interconnection_queue()
        except Exception:
            # PJM requires API key in some environments; allow partial CAISO sync.
            return pd.DataFrame()
    raise ValueError(f"Unsupported ISO {iso_name}")


def _extract_leads(df: pd.DataFrame, iso_name: str) -> list[Lead]:
    if df.empty:
        return []
    queue_id_col = _pick_column(
        df,
        [
            "queue_id",
            "queue id",
            "queue_number",
            "queue number",
            "interconnection_queue_id",
            "interconnection request receive date",
        ],
    )
    project_name_col = _pick_column(
        df,
        ["project_name", "project name", "name", "generation project name"],
    )
    developer_col = _pick_column(
        df,
        [
            "developer",
            "entity",
            "owner",
            "developer/entity",
            "interconnecting_entity",
            "interconnecting entity",
        ],
    )
    county_col = _pick_column(df, ["county", "county_name", "site_county"])
    state_col = _pick_column(df, ["state", "state_name", "site_state"])
    capacity_col = _pick_column(
        df,
        [
            "capacity_mw",
            "capacity (mw)",
            "mw",
            "summer_capacity_mw",
            "summer capacity (mw)",
            "capacity",
        ],
    )
    type_col = _pick_column(
        df,
        ["fuel", "technology", "project_type", "resource_type", "type", "generation type"],
    )
    status_col = _pick_column(
        df,
        [
            "status",
            "queue_status",
            "project_status",
            "status_text",
            "interconnection agreement status",
        ],
    )
    lat_col = _pick_column(df, ["latitude", "lat"])
    lon_col = _pick_column(df, ["longitude", "lon", "lng"])
    proposed_cod_col = _pick_column(
        df,
        [
            "proposed_cod",
            "proposed cod",
            "commercial_operation_date",
            "cod",
            "target_cod",
            "proposed completion date",
            "proposed on-line date (as filed with ir)",
        ],
    )
    submitted_col = _pick_column(
        df,
        [
            "queue_date",
            "date_queued",
            "submitted_date",
            "application_date",
            "queue_submission_date",
            "interconnection request receive date",
        ],
    )

    required = [queue_id_col, project_name_col, capacity_col, type_col, status_col]
    if any(col is None for col in required):
        raise RuntimeError(
            f"{iso_name}: unable to resolve required columns. Found columns: {list(df.columns)}"
        )

    leads: list[Lead] = []

    for _, row in df.iterrows():
        asset_type = _to_str(row[type_col]).lower()
        status = _to_str(row[status_col]).lower()
        capacity_mw = _to_float(row[capacity_col])

        if not any(target in asset_type for target in TARGET_TYPES):
            continue
        if not any(target in status for target in TARGET_STATUSES):
            continue
        if capacity_mw is None or capacity_mw < MIN_MW or capacity_mw > MAX_MW:
            continue

        queue_id = _to_str(row[queue_id_col])
        if not queue_id:
            continue

        submitted_iso = _to_iso_date(row[submitted_col]) if submitted_col else None
        proposed_cod = _to_iso_date(row[proposed_cod_col]) if proposed_cod_col else None

        lead = Lead(
            queue_id=queue_id,
            project_name=_to_str(row[project_name_col]) or f"{iso_name} Queue {queue_id}",
            developer_entity=_to_str(row[developer_col]) if developer_col else "",
            county=_to_str(row[county_col]) if county_col else "",
            state=_to_str(row[state_col]) if state_col else "",
            capacity_mw=round(float(capacity_mw), 3),
            latitude=_to_float(row[lat_col]) if lat_col else None,
            longitude=_to_float(row[lon_col]) if lon_col else None,
            asset_type=_to_str(row[type_col]),
            status=_to_str(row[status_col]),
            proposed_cod=proposed_cod,
            queue_submitted_date=submitted_iso,
            days_in_queue=_days_in_queue(submitted_iso),
            queue_iso=iso_name,
        )
        leads.append(lead)

    return leads


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="Path to output JSON file")
    args = parser.parse_args()

    all_leads: list[Lead] = []
    for iso in TARGET_ISOS:
        df = _load_iso_queue(iso)
        leads = _extract_leads(df, iso)
        all_leads.extend(leads)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps([lead.to_dict() for lead in all_leads], indent=2))

    print(f"Lead Engine Online: {len(all_leads)} Institutional Projects Found in Queue")


if __name__ == "__main__":
    main()
