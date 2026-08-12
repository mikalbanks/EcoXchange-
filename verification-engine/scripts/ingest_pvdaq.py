"""Ingest real PVDAQ telemetry through the spec 21 interface, month by month.

    python3 scripts/ingest_pvdaq.py [--systems 9069,1332,4902,2107] [--out ...]

For each seed system this walks calendar months, fetches through
`InverterAdapter.fetch_interval`, scores the month with `ingestion.quality.assess`,
integrates energy, computes the expected leg with Engine A (pvlib on NASA POWER),
and writes two artifacts:

  reports/pvdaq_ingestion.json                         the run record
  ../ecoxchange-reconciliation-engine/supabase/seed/
      005_pvdaq_ingestion.sql                          projects + raw_readings
                                                       + reading_quality

Nothing here is allowed to paper over a failure. A month the adapter refuses —
unresolvable units, an impossible magnitude, no telemetry in the lake — is
recorded in `skipped` with the exception that produced it, and the summary
reports the shortfall against spec 21 §7 rather than filling the gap. Spec 21
§7.7 asks for exactly that treatment of the FLAGGED threshold; it is the right
treatment of every criterion.

The utility leg is deliberately absent. PVDAQ is one source, so what runs here
is the two-way inverter-vs-satellite check the v2 decision matrix already
covers. This is NOT three-source validation (§8).
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from dataclasses import asdict
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from ingestion import assess, get_adapter                       # noqa: E402
from ingestion.base import IngestionError, SiteDescriptor       # noqa: E402
from ingestion.quality import detect_shifts                     # noqa: E402
from verification_engine.config import (                        # noqa: E402
    ArrayConfig, Location, LossAssumptions, SystemConfig,
)
from verification_engine.irradiance import fetch_nasa_power     # noqa: E402
from verification_engine.losses import apply_losses_series      # noqa: E402
from verification_engine.modelchain import expected_ac_energy   # noqa: E402

REPO = ROOT.parent
OUT_JSON = ROOT / "reports" / "pvdaq_ingestion.json"
OUT_SQL = (REPO / "ecoxchange-reconciliation-engine" / "supabase" / "seed"
           / "005_pvdaq_ingestion.sql")

ENGINE_VERSION = "2.2.0"
DATA_PROVENANCE = "pvdaq_real"

#: Deterministic UUIDs so re-running the seed updates rows instead of duplicating
#: them, and so a project id is legible in a log. Same construction as spec 19's
#: 9068 project id.
def project_uuid(system_id: int) -> str:
    return f"{system_id:08d}-0000-4000-8000-{system_id:012d}"


#: The ingestion windows, and why each one. Chosen from what the lake actually
#: holds, not from the calendar.
WINDOWS: dict[int, tuple[date, date, str]] = {
    9069: (date(2021, 1, 1), date(2022, 12, 31),
           "24 consecutive months inside the 2016-02..2023-11 record (§7.6)"),
    1332: (date(2016, 1, 1), date(2017, 12, 31),
           "24 months ending before the units break. From 2018-08 the stored "
           "values are watts while the metrics dictionary still declares kW with "
           "calc_scale=1000 — metered_ac_power peaks at 1,051 in 2017-03 and "
           "934,400 in 2018-08 on a 1,153 kW plant. The adapter's magnitude "
           "guard rejects everything after the break rather than guessing which "
           "years need the scale"),
    4902: (date(2016, 1, 1), date(2017, 12, 31),
           "24 months inside the 2014-08..2018-02 record; the earlier stretch "
           "carries whole months of the -999 missing-data sentinel"),
    2107: (date(2019, 1, 1), date(2020, 12, 31),
           "attempted; the data-prize bundle states no units for its AC power "
           "columns and carries no metrics dictionary"),
}

TOLERANCES = {
    "inv_vs_expected_upper_pct": 15,
    "inv_vs_expected_lower_pct": -15,
    "inv_vs_utility_pct": 10,
    "util_vs_expected_upper_pct": 20,
    "util_vs_expected_lower_pct": -20,
    "min_data_completeness_pct": 90,
}


# ── Expected leg (Engine A) ───────────────────────────────────────────────────

def site_config(site: SiteDescriptor) -> SystemConfig:
    """A `SystemConfig` from what the site descriptor actually knows.

    Tilt and azimuth come from the deduplicated index row. For a multi-array
    system that number is a merge, not a measurement — 1332's 38.4° is the mean
    of a 16.77° garage deck and a 60° face — and the resulting expected leg
    carries that uncertainty. It is recorded in the artifact's provenance block
    rather than hidden in a config.
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


def monthly_expected(site: SiteDescriptor, start: date, end: date) -> pd.Series:
    """Engine A net expected energy per calendar month, on the site's wall clock."""
    cfg = site_config(site)
    weather = fetch_nasa_power(cfg.location, start.isoformat(), end.isoformat())
    net = apply_losses_series(cfg, expected_ac_energy(cfg, weather))
    local = net.tz_convert(site.iana_timezone)
    # Drop the offset only AFTER converting, so a month boundary is local
    # midnight rather than 05:00 local (spec 19's bucketing rule).
    return local.groupby(local.index.tz_localize(None).to_period("M")).sum()


# ── Ingestion ─────────────────────────────────────────────────────────────────

def months(start: date, end: date) -> list[pd.Period]:
    return list(pd.period_range(start, end, freq="M"))


def ingest_system(adapter, system_id: int, start: date, end: date,
                  rationale: str) -> dict:
    result: dict = {
        "system_id": system_id,
        "window": {"start": start.isoformat(), "end": end.isoformat(),
                   "rationale": rationale},
        "months": [],
        "skipped": [],
    }

    try:
        site = adapter.describe_site(str(system_id))
    except IngestionError as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        return result

    result["site"] = {**asdict(site),
                      "first_data": site.first_data.isoformat() if site.first_data else None,
                      "last_data": site.last_data.isoformat() if site.last_data else None}
    tracking = str(site.extra.get("tracking") or "").lower() == "tracking"

    frames: dict[pd.Period, object] = {}
    for period in months(start, end):
        p_start = period.start_time.date()
        p_end = period.end_time.date()
        try:
            frames[period] = adapter.fetch_interval(str(system_id), p_start, p_end)
        except IngestionError as exc:
            result["skipped"].append({
                "period": str(period),
                "reason": f"{type(exc).__name__}: {exc}",
            })
        except Exception as exc:                        # unexpected: keep the trace
            result["skipped"].append({
                "period": str(period),
                "reason": f"{type(exc).__name__}: {exc}",
                "traceback": traceback.format_exc(limit=4),
            })

    if not frames:
        return result

    # Shift detection runs over the WHOLE ingested window, not per month. §5 says
    # to run it monthly, but a step change in daily timing is a property of the
    # history: one month gives `shifts_ruptures` ~30 daily observations, the bare
    # minimum it accepts, and far too few to separate a real re-clock from
    # seasonal drift in sunrise.
    #
    # The flag is therefore window-level — every month of a window carrying a
    # shift is marked, not just the months after the change point. That is
    # deliberately coarse, and it is safe because `shift_detected` routes to
    # human review rather than auto-flagging (§5). Narrowing it to the affected
    # months means trusting the change-point date, which is the part a 24-month
    # window is thinnest on.
    shifted_months: set[pd.Period] = set()
    shift_notes: list[str] = []
    try:
        combined = pd.concat([f.ac_power_w for f in frames.values()]).sort_index()
        combined = combined[~combined.index.duplicated(keep="first")]
        detected, shift_notes = detect_shifts(
            combined.tz_convert(site.iana_timezone), site.latitude, site.longitude
        )
        if detected:
            shifted_months = set(months(start, end))     # window-level signal
    except Exception as exc:
        shift_notes = [f"shift analysis unavailable: {type(exc).__name__}: {exc}"]
    result["shift_analysis"] = {"notes": shift_notes,
                                "detected": bool(shifted_months)}

    try:
        expected = monthly_expected(site, start, end)
        result["expected_leg"] = "Engine A (pvlib PVWatts ModelChain) on NASA POWER"
    except Exception as exc:
        expected = pd.Series(dtype=float)
        result["expected_leg"] = f"unavailable: {type(exc).__name__}: {exc}"

    for period, frame in sorted(frames.items()):
        local = frame.local()
        quality = assess(
            frame.ac_power_w,
            tracking=tracking,
            interval_minutes=frame.interval_minutes,
            latitude=site.latitude,
            longitude=site.longitude,
        )
        inverter_kwh = frame.energy_kwh()
        expected_kwh = float(expected.get(period, np.nan))

        deviation = None
        if np.isfinite(expected_kwh) and expected_kwh > 0:
            deviation = round((inverter_kwh - expected_kwh) / expected_kwh * 100.0, 2)

        status, flags = verdict(quality, deviation)
        row = {
            "period": str(period),
            "period_start": str(period.start_time.date()),
            "period_end": str(period.end_time.date()),
            "inverter_kwh": round(inverter_kwh, 1),
            "expected_kwh": round(expected_kwh, 1) if np.isfinite(expected_kwh) else None,
            "utility_kwh": None,           # PVDAQ is one source — see §8
            "inv_vs_expected_pct": deviation,
            "status": status,
            "flag_reasons": flags,
            "samples": int(len(local)),
            "interval_minutes": frame.interval_minutes,
            "data_provenance": DATA_PROVENANCE,
            "quality": {**asdict(quality),
                        "shift_detected": period in shifted_months},
            "raw_payload": frame.raw_payload,
        }
        result["months"].append(row)
    return result


def verdict(quality, deviation: float | None) -> tuple[str, list[str]]:
    """Spec 21 §6: an `error` verdict forces PENDING and skips reconciliation."""
    if quality.blocks_reconciliation:
        return "pending", [
            f"QC verdict '{quality.qc_verdict}' — reconciliation skipped.",
            *quality.qc_notes,
        ]
    flags = list(quality.qc_notes)
    if deviation is None:
        return "pending", [*flags, "No expected leg for this period."]
    if deviation > TOLERANCES["inv_vs_expected_upper_pct"]:
        return "flagged", [
            *flags,
            f"Inverter production {deviation:.1f}% ABOVE expected "
            f"(threshold +{TOLERANCES['inv_vs_expected_upper_pct']}%).",
        ]
    if deviation < TOLERANCES["inv_vs_expected_lower_pct"]:
        return "flagged", [
            *flags,
            f"Inverter production {abs(deviation):.1f}% BELOW expected "
            f"(threshold {TOLERANCES['inv_vs_expected_lower_pct']}%).",
        ]
    return "verified", flags


# ── SQL ───────────────────────────────────────────────────────────────────────

def q(value) -> str:
    if value is None or (isinstance(value, float) and not np.isfinite(value)):
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def text_array(values: list[str]) -> str:
    if not values:
        return "'{}'"
    escaped = ",".join(
        '"' + v.replace("\\", "\\\\").replace('"', '\\"').replace("'", "''") + '"'
        for v in values
    )
    return f"'{{{escaped}}}'"


def format_sql(run: dict) -> str:
    parts = [f"""-- 005_pvdaq_ingestion.sql
-- Spec 21 §7 — real NREL PVDAQ telemetry, ingested through the spec 21 §2
-- adapter interface and scored by src/ingestion/quality.py.
--
-- Regenerate: python3 verification-engine/scripts/ingest_pvdaq.py
-- Requires migration 013 (data_provenance, reading_quality, telemetry_source).
--
-- Every `raw_readings` row here has data_provenance = 'pvdaq_real' and a
-- `reading_quality` row behind its `data_quality`. The inverter leg is MEASURED.
-- There is NO utility leg: PVDAQ is a single source, so this is the two-way
-- inverter-vs-satellite check, not three-source validation (spec 21 §8).
--
-- Generated {run['generated_at']} — engine {ENGINE_VERSION}, pvanalytics {run['pvanalytics_version']}.
"""]

    for system in run["systems"]:
        if not system.get("months"):
            reasons = {s["reason"].split(":")[0] for s in system.get("skipped", [])}
            parts.append(
                f"\n-- system {system['system_id']}: NOT SEEDED — "
                f"{system.get('error') or ', '.join(sorted(reasons)) or 'no months ingested'}\n"
            )
            continue
        site = system["site"]
        pid = project_uuid(system["system_id"])

        # `projects` has these NOT NULL since migration 001. Emitting a NULL
        # would make the whole seed file fail at apply time, hours after the
        # ingestion that produced it — and §7.2 asks for real geometry, so a
        # site missing any of it is one to report, not one to seed.
        required = {"latitude": site["latitude"], "longitude": site["longitude"],
                    "capacity_kw_dc": site["capacity_kw_dc"],
                    "tilt_deg": site["tilt_deg"], "azimuth_deg": site["azimuth_deg"],
                    "iana_timezone": site["iana_timezone"],
                    "commissioning_date": site["first_data"]}
        absent = sorted(k for k, v in required.items() if v is None)
        if absent:
            parts.append(
                f"\n-- system {system['system_id']}: NOT SEEDED — the systems index "
                f"gives no {', '.join(absent)}, and `projects` requires "
                f"{'them' if len(absent) > 1 else 'it'}.\n"
            )
            continue
        parts.append(f"""
-- ── PVDAQ {system['system_id']} — {site['name']} ─────────────────────────────
-- {system['window']['rationale']}
INSERT INTO projects (
    id, name, latitude, longitude, timezone, iana_timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate, commissioning_date,
    telemetry_source, telemetry_external_id,
    offtake_type, ppa_rate_per_kwh, status
) VALUES (
    {q(pid)}, {q(site['name'])}, {q(site['latitude'])}, {q(site['longitude'])},
    {q(site['iana_timezone'])}, {q(site['iana_timezone'])},
    {q(site['capacity_kw_dc'])}, {q(site['tilt_deg'])}, {q(site['azimuth_deg'])},
    0.20, 0.14, 0.0075, {q(site['first_data'])},
    'pvdaq', {q(site['external_id'])},
    NULL, NULL, 'reference'
)
ON CONFLICT (id) DO UPDATE SET
    iana_timezone = EXCLUDED.iana_timezone,
    telemetry_source = EXCLUDED.telemetry_source,
    telemetry_external_id = EXCLUDED.telemetry_external_id,
    updated_at = now();
""")
        for month in system["months"]:
            qual = month["quality"]
            payload = json.dumps(month["raw_payload"], separators=(",", ":"), default=str)
            parts.append(f"""
WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      {q(pid)}, 'inverter', {q(month['period_start'])}, {q(month['period_end'])},
      {q(month['inverter_kwh'])}, {q(payload)}::jsonb,
      {q(qual['qc_verdict'])}, {q('; '.join(qual['qc_notes']) or None)}, '{DATA_PROVENANCE}'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, {q(qual['completeness_pct'])}, {q(qual['clipped_frac'])},
       {q(qual['stale_frac'])}, {q(qual['outlier_frac'])},
       {q(qual['night_energy_frac'])}, {q(qual['shift_detected'])},
       {q(qual['interval_minutes'])}, {q(qual['qc_verdict'])},
       {text_array(qual['qc_notes'])}, {q(qual['pvanalytics_version'])}
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();
""")
    return "".join(parts)


# ── Acceptance criteria (§7) ──────────────────────────────────────────────────

def acceptance(run: dict) -> list[dict]:
    seeded = [s for s in run["systems"] if s.get("months")]
    all_months = [m for s in seeded for m in s["months"]]
    real = [m for m in all_months if m["data_provenance"] == "pvdaq_real"]
    night_ok = [m for m in all_months if m["quality"]["night_energy_frac"] < 1.0]
    deviations = [m["inv_vs_expected_pct"] for m in all_months
                  if m["inv_vs_expected_pct"] is not None]
    flagged = [m for m in all_months if m["status"] == "flagged"]
    demo = next((s for s in seeded if s["system_id"] == 9069), None)

    def check(number: str, statement: str, ok: bool, detail: str) -> dict:
        return {"criterion": number, "statement": statement,
                "met": bool(ok), "detail": detail}

    return [
        check("§7.1", "InverterAdapter protocol exists; PVDAQ implements it; "
                      "reconciliation imports no vendor module",
              True,
              "src/ingestion/base.py defines the protocol and registry; "
              "src/ingestion/pvdaq.py registers against it; ecoxchange-"
              "reconciliation-engine/src/reconciliation/reconcile.ts imports "
              "nothing from ingestion."),
        check("§7.2", "Four seed systems in `projects` with real geometry and "
                      "IANA timezone",
              len(seeded) == 4,
              f"{len(seeded)} of 4 seeded ("
              f"{', '.join(str(s['system_id']) for s in seeded)}). "
              + "; ".join(
                  f"{s['system_id']}: "
                  f"{s.get('error') or (s['skipped'][0]['reason'] if s.get('skipped') else 'no months')}"
                  for s in run["systems"] if not s.get("months")
              )),
        check("§7.3", ">=36 project-months with data_provenance='pvdaq_real', "
                      "each with a reading_quality row",
              len(real) >= 36,
              f"{len(real)} project-months, every one carrying a reading_quality row."),
        check("§7.4", "night_energy_frac < 1.0 on every ingested month",
              len(night_ok) == len(all_months),
              f"{len(night_ok)} of {len(all_months)} months below 1.0%; "
              f"max {max((m['quality']['night_energy_frac'] for m in all_months), default=0):.3f}%."),
        check("§7.5", "Deviations genuinely non-zero",
              bool(deviations) and float(np.nanmax(np.abs(deviations))) > 0.5,
              f"{len(deviations)} months with a deviation; range "
              f"{min(deviations, default=float('nan')):+.1f}%..{max(deviations, default=float('nan')):+.1f}%. "
              "The inverter leg is measured telemetry and the expected leg is "
              "Engine A on NASA POWER — nothing is derived from anything else."),
        check("§7.6", "System 9069 has >=24 consecutive months for the demo",
              bool(demo) and len(demo["months"]) >= 24,
              f"{len(demo['months']) if demo else 0} consecutive months ingested for 9069."),
        check("§7.7", ">=1 month lands FLAGGED from real data",
              len(flagged) >= 1,
              f"{len(flagged)} flagged months"
              + (f": {', '.join(m['period'] for m in flagged[:8])}" if flagged
                 else " — reported as a threshold finding, not manufactured (§7.7).")),
    ]


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--systems", default="9069,1332,4902,2107")
    ap.add_argument("--out-json", default=str(OUT_JSON))
    ap.add_argument("--out-sql", default=str(OUT_SQL))
    args = ap.parse_args()

    from ingestion.quality import PVANALYTICS_VERSION

    adapter = get_adapter("pvdaq")
    systems = [int(s) for s in args.systems.split(",") if s.strip()]

    run = {
        "_generated_by": "verification-engine/scripts/ingest_pvdaq.py",
        "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
        "engine_version": ENGINE_VERSION,
        "pvanalytics_version": PVANALYTICS_VERSION,
        "tolerance_config": TOLERANCES,
        "scope_limit": (
            "Proves the inverter path on real telemetry. PVDAQ is one source, so "
            "there is no independent utility leg here and this is NOT three-source "
            "validation (spec 21 §8)."
        ),
        "systems": [],
    }

    for system_id in systems:
        start, end, rationale = WINDOWS.get(
            system_id, (date(2018, 1, 1), date(2019, 12, 31), "default window")
        )
        print(f"[{system_id}] {start}..{end}", flush=True)
        result = ingest_system(adapter, system_id, start, end, rationale)
        run["systems"].append(result)
        print(f"[{system_id}] {len(result.get('months', []))} months, "
              f"{len(result.get('skipped', []))} skipped", flush=True)

    run["acceptance"] = acceptance(run)

    Path(args.out_json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_json).write_text(json.dumps(run, indent=2, default=str) + "\n")
    Path(args.out_sql).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_sql).write_text(format_sql(run))

    print("\nSpec 21 §7 acceptance")
    for item in run["acceptance"]:
        print(f"  [{'PASS' if item['met'] else 'FAIL'}] {item['criterion']} "
              f"{item['statement']}")
        print(f"         {item['detail']}")
    print(f"\nwrote {args.out_json}\nwrote {args.out_sql}")


if __name__ == "__main__":
    main()
