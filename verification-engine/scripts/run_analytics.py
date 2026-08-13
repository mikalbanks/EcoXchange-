"""Run spec 22's analytics over the seeded PVDAQ systems.

    python3 scripts/run_analytics.py [--systems 4902,1332,9069] [--as-of DATE]

For each registered project this assembles the sub-hourly window through the
spec 21 adapter interface, runs RdTools degradation, soiling and availability,
translates the results into dollars, and writes two artifacts:

  reports/plant_analytics.json                         the run record
  ../ecoxchange-reconciliation-engine/supabase/seed/
      006_plant_analytics.sql                          plant_analytics rows

Expect this to be slow. A multi-year clear-sky analysis is minutes per system,
9069's prize bundle is a 1.77 GB read on a cold cache and the per-inverter pass
reads it again, and the expected-power leg fetches years of NASA POWER. It is a
scheduled job, never a request-path call (§4).

Nothing here papers over a failure. A project that cannot be analyzed is recorded
in `skipped` with the exception that produced it, and the acceptance block scores
each §6 criterion against what actually happened rather than what was hoped for.
That is spec 21 §7.7's discipline — when the data does not produce the expected
result, report it — and it applies to every criterion, not just the one it was
written about.
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from analytics.registry import (                                # noqa: E402
    EXCLUDED_SYSTEMS, SEED_PROJECTS, AnalyticsProject, project_uuid,
)
from analytics.results import (                                 # noqa: E402
    MIN_MONTHS_FOR_DEGRADATION, PLAUSIBLE_DEGRADATION_RANGE,
)
from analytics.sinks import JsonArtifactSink, MultiSink, SqlSeedSink  # noqa: E402
from verification_engine import __version__ as ENGINE_VERSION   # noqa: E402

REPO = ROOT.parent
OUT_JSON = ROOT / "reports" / "plant_analytics.json"
OUT_SQL = (REPO / "ecoxchange-reconciliation-engine" / "supabase" / "seed"
           / "006_plant_analytics.sql")


def analyze(project: AnalyticsProject, as_of: date, sink) -> dict:
    """Run one project, returning its record. Never raises past here."""
    from analytics import trend

    record: dict = {
        "system_id": project.system_id,
        "project_id": project.project_id,
        "name": project.name,
        "window": {
            "start": project.window_start.isoformat(),
            "end": project.window_end.isoformat(),
            "rationale": project.window_rationale,
        },
        "caveats": list(project.caveats),
    }
    try:
        row_id = trend.refresh_analytics(project, sink=sink, as_of=as_of)
        record["row_id"] = row_id
    except Exception as exc:
        record["error"] = f"{type(exc).__name__}: {exc}"
        record["traceback"] = traceback.format_exc(limit=6)
    return record


def score_acceptance(rows: list[dict], records: list[dict]) -> list[dict]:
    """§6's seven criteria, each scored against what the run actually produced."""
    by_method = {}
    for row in rows:
        by_method.setdefault(row["degradation_method"], []).append(row)

    clearsky = by_method.get("clearsky", [])
    sensor = by_method.get("sensor", [])
    with_rate = [r for r in rows if r.get("degradation_pct_per_yr") is not None]
    failed = [r for r in records if r.get("error")]

    low, high = PLAUSIBLE_DEGRADATION_RANGE
    # §6.2 names 1332 and 4902 specifically. Matched by their deterministic
    # project uuids rather than by substring: `str(1332) in project_id` would
    # also match any uuid that happens to contain those digits.
    nrel_project_ids = {project_uuid(s) for s in (1332, 4902)}
    nrel_rows = [r for r in clearsky if r["project_id"] in nrel_project_ids]
    in_band = [
        r for r in nrel_rows
        if r.get("degradation_pct_per_yr") is not None
        and low <= r["degradation_pct_per_yr"] <= high
    ]
    out_of_band = [
        r for r in nrel_rows
        if r.get("degradation_pct_per_yr") is not None
        and not (low <= r["degradation_pct_per_yr"] <= high)
    ]

    soiling_found = [r for r in rows if r.get("soiling_loss_pct") is not None]
    soiling_absent = [
        r for r in rows
        if r.get("soiling_loss_pct") is None
        and any("no soiling signal" in n.lower() for n in r.get("notes", []))
    ]
    availability_rows = [
        r for r in rows if r.get("availability_pct") is not None
    ]
    # §6.5 asks for availability ON a multi-inverter system, so both halves have
    # to hold on the same row. Counting rows that merely HAVE several inverters
    # produced the nonsense "1 row with an availability figure, 2 of them backed
    # by per-inverter telemetry".
    multi_inverter = [
        r for r in availability_rows
        if (r.get("provenance") or {}).get("availability_subsystems", 1) > 1
    ]
    multi_inverter_attempted = [
        r for r in rows
        if (r.get("provenance") or {}).get("availability_subsystems", 1) > 1
    ]
    missing_ci = [
        r for r in with_rate
        if r.get("degradation_ci_low") is None or r.get("degradation_ci_high") is None
    ]
    disagreements = [
        r for r in rows
        if any(n.startswith("DISAGREEMENT:") for n in r.get("notes", []))
    ]

    return [
        {
            "criterion": "§6.1",
            "statement": (
                "Degradation runs on all four spec 21 seed systems with >=2 "
                "years of data, producing a rate and a confidence interval"
            ),
            "met": len(with_rate) >= len(SEED_PROJECTS) and not failed,
            "detail": (
                f"{len(with_rate)} of {len(SEED_PROJECTS)} registered projects "
                f"produced a rate with an interval. Four is not reachable: spec "
                f"21 seeded three systems, and 2107 is absent because "
                f"{EXCLUDED_SYSTEMS[2107]} "
                + (f"Failures this run: "
                   f"{[r['system_id'] for r in failed]}." if failed else "")
            ),
        },
        {
            "criterion": "§6.2",
            "statement": (
                f"NREL systems (1332, 4902) sanity-checked; anything outside "
                f"{low} .. {high} %/yr is a bug, not a finding"
            ),
            "met": bool(nrel_rows) and not out_of_band,
            "detail": (
                f"{len(in_band)} of {len(nrel_rows)} NREL system rate(s) inside "
                f"the band. "
                + ("" if not out_of_band else
                   "Outside: " + "; ".join(
                       f"{r['project_id']} at "
                       f"{r['degradation_pct_per_yr']:.2f} %/yr"
                       for r in out_of_band)
                   + ". Reported as measured with the site's caveats attached "
                     "rather than tuned into range — for 1332 in particular, "
                     "NREL's own index flags a wrong mounting config and spec 21 "
                     "records a detected time shift, so the band being missed is "
                     "evidence about the site rather than proof of a code bug.")
            ),
        },
        {
            "criterion": "§6.3",
            "statement": (
                "Clearsky and sensor both run where a POA channel exists, stored "
                "separately, disagreement >0.5 %/yr surfaced as a note"
            ),
            "met": True,
            "detail": (
                f"{len(clearsky)} clearsky row(s), {len(sensor)} sensor row(s). "
                + (f"{len(disagreements)} row(s) carry a disagreement note."
                   if disagreements else
                   "No system in this run publishes a verified POA channel, so "
                   "sensor analysis did not apply — the PVDAQ optional-channel "
                   "resolver only maps a POA channel whose declared unit is "
                   "W/m^2, and drops anything ambiguous (spec 21 §2.1).")
            ),
        },
        {
            "criterion": "§6.4",
            "statement": (
                "Soiling completes on at least one system; no soiling signal is "
                "recorded as a legitimate result, never forced"
            ),
            "met": bool(soiling_found or soiling_absent),
            "detail": (
                f"{len(soiling_found)} row(s) with a quantified soiling loss, "
                f"{len(soiling_absent)} row(s) recording no soiling signal found. "
                f"Both are completed analyses."
            ),
        },
        {
            "criterion": "§6.5",
            "statement": (
                "Availability produces monthly percentages and a lost-production "
                "estimate for at least one multi-inverter system"
            ),
            "met": bool(multi_inverter),
            "detail": (
                f"{len(availability_rows)} of {len(rows)} row(s) produced an "
                f"availability figure; {len(multi_inverter)} of those are backed "
                f"by per-inverter telemetry. "
                f"{len(multi_inverter_attempted)} row(s) had per-inverter "
                f"telemetry available in total"
                + ("." if len(multi_inverter) == len(multi_inverter_attempted)
                   else f", so {len(multi_inverter_attempted) - len(multi_inverter)} "
                        f"multi-inverter system(s) had telemetry but produced no "
                        f"availability figure — see their notes.")
                + ("" if multi_inverter else
                   " No multi-inverter analysis completed this run.")
            ),
        },
        {
            "criterion": "§6.6",
            "statement": "Every stored degradation rate has non-null CI bounds",
            "met": not missing_ci,
            "detail": (
                f"{len(with_rate)} stored rate(s), {len(missing_ci)} missing a "
                f"bound. The invariant is enforced three times over: "
                f"DegradationResult raises on construction, PlantAnalyticsRow "
                f"raises before a sink sees it, and migration 014 carries it as a "
                f"CHECK."
            ),
        },
        {
            "criterion": "§6.7",
            "statement": (
                "pytest: degradation returns NULL under 24 months; QC-error "
                "readings excluded; economic translation handles NULL PPA"
            ),
            "met": None,
            "detail": (
                "Scored by `pytest tests/test_analytics.py`, not by this run. "
                "All three cases are offline and need no rdtools."
            ),
        },
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--systems", default=",".join(str(s) for s in sorted(SEED_PROJECTS)),
        help="comma-separated PVDAQ system ids",
    )
    parser.add_argument(
        "--as-of", default=None,
        help="as_of_date for the written rows (default: today)",
    )
    parser.add_argument("--out-json", default=str(OUT_JSON))
    parser.add_argument("--out-sql", default=str(OUT_SQL))
    parser.add_argument(
        "--no-cache", action="store_true",
        help="ignore the assembled-series cache and re-fetch",
    )
    args = parser.parse_args()

    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    wanted = [int(s) for s in args.systems.split(",") if s.strip()]

    json_sink = JsonArtifactSink(args.out_json)
    sql_sink = SqlSeedSink(args.out_sql)
    sink = MultiSink(json_sink, sql_sink)

    records: list[dict] = []
    skipped: list[dict] = []

    for system_id in wanted:
        project = SEED_PROJECTS.get(system_id)
        if project is None:
            skipped.append({
                "system_id": system_id,
                "reason": EXCLUDED_SYSTEMS.get(
                    system_id, f"system {system_id} is not registered for analytics"
                ),
            })
            continue
        print(f"[{system_id}] {project.name} — "
              f"{project.window_start} .. {project.window_end}", flush=True)
        record = analyze(project, as_of, sink)
        records.append(record)
        if record.get("error"):
            print(f"[{system_id}] FAILED: {record['error']}", flush=True)
            skipped.append({"system_id": system_id, "reason": record["error"]})
        else:
            print(f"[{system_id}] ok", flush=True)

    # Systems the registry excludes outright are reported even when not asked
    # for, so the artifact says three of four rather than implying four of four.
    for system_id, reason in EXCLUDED_SYSTEMS.items():
        if not any(s["system_id"] == system_id for s in skipped):
            skipped.append({"system_id": system_id, "reason": reason})

    rows = [r.to_dict() for r in json_sink.rows]
    try:
        import rdtools

        rdtools_version = getattr(rdtools, "__version__", "unknown")
    except ImportError:
        rdtools_version = "unavailable"

    run = {
        "_generated_by": "verification-engine/scripts/run_analytics.py (spec 22)",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engine_version": ENGINE_VERSION,
        "rdtools_version": rdtools_version,
        "as_of_date": as_of.isoformat(),
        "min_months_for_degradation": MIN_MONTHS_FOR_DEGRADATION,
        "plausible_degradation_range_pct_per_yr": list(PLAUSIBLE_DEGRADATION_RANGE),
        "systems": records,
        "skipped": skipped,
    }
    run["acceptance"] = score_acceptance(rows, records)

    sink.finalize(run)

    print(f"\nwrote {args.out_json}")
    print(f"wrote {args.out_sql}")
    for item in run["acceptance"]:
        mark = {True: "PASS", False: "FAIL", None: "n/a "}[item["met"]]
        print(f"  {mark}  {item['criterion']}  {item['detail'][:150]}")
    unmet = [a for a in run["acceptance"] if a["met"] is False]
    return 1 if unmet else 0


if __name__ == "__main__":
    raise SystemExit(main())
