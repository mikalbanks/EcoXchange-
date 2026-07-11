#!/usr/bin/env python3
"""Enrich existing benchmark results with geometry fields from the federal files.

Reads the three federal datasets (USPVDB, EIA-860, EIA-923), joins them into
JoinedPlant records, and merges lat/lon/tilt/azimuth/commissioning_year/
panel_technology into the existing results JSON.  No NASA POWER calls needed.

Usage:
  python scripts/enrich_results.py                     # defaults
  python scripts/enrich_results.py --results path.json # custom results path
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from collections import Counter
from src.validate_eia_fleet import load_and_join
from src.run_eia_benchmark import (
    BENCHMARK_JOIN_OPTIONS,
    build_summary,
    publication_cohort,
    render_markdown,
    summarize,
)
from src.validate_eia_fleet import PlantResult


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description="Enrich benchmark results with geometry fields.")
    ap.add_argument("--data-dir", default=os.path.join(root, "data", "fleet"))
    ap.add_argument("--results", default=os.path.join(root, "reports", "eia_fleet_benchmark_results.json"))
    ap.add_argument("--year", type=int, default=2024)
    args = ap.parse_args()

    print(f"[info] Loading federal files from {args.data_dir} ...")
    plants = load_and_join(args.data_dir, args.year, BENCHMARK_JOIN_OPTIONS)
    lookup = {p.eia_plant_id: p for p in plants}
    print(f"[info] Joined {len(plants)} plants from federal files")

    with open(args.results) as fh:
        data = json.load(fh)

    records = data["plants"]
    enriched = 0
    for rec in records:
        pid = rec["eia_plant_id"]
        plant = lookup.get(pid)
        if plant:
            rec["latitude"] = round(plant.latitude, 6)
            rec["longitude"] = round(plant.longitude, 6)
            rec["tilt_deg"] = round(plant.tilt_deg, 1)
            rec["azimuth_deg"] = round(plant.azimuth_deg, 1)
            rec["tilt_source"] = plant.tilt_source
            rec["azimuth_source"] = plant.azimuth_source
            rec["commissioning_year"] = plant.commissioning_year
            rec["panel_technology"] = plant.panel_technology
            rec["capacity_ac_mw"] = round(plant.capacity_ac_mw, 3) if plant.capacity_ac_mw else None
            enriched += 1

    print(f"[info] Enriched {enriched}/{len(records)} plant records with geometry")

    exclusions = data.get("publication_exclusions", [])
    for exc in exclusions:
        plant = lookup.get(exc["eia_plant_id"])
        if plant:
            exc["latitude"] = round(plant.latitude, 6)
            exc["longitude"] = round(plant.longitude, 6)
            exc["capacity_mw"] = round(plant.capacity_dc_mw, 3)
            exc["tilt_deg"] = round(plant.tilt_deg, 1)
            exc["azimuth_deg"] = round(plant.azimuth_deg, 1)
            exc["axis_type"] = plant.axis_type
            exc["commissioning_year"] = plant.commissioning_year

    # Rebuild summary with mode statistic
    plant_results = []
    for r in records:
        if r.get("status") == "failed":
            continue
        fields = {k: r[k] for k in PlantResult.__dataclass_fields__ if k in r}
        plant_results.append(PlantResult(**fields))

    summary_data = data["summary"]
    new_summary = build_summary(
        records, attempted=summary_data["plants_attempted"],
        failure_reasons=Counter(summary_data.get("failure_reasons", {})),
        year=summary_data["benchmark_year"],
        plant_results=plant_results,
    )
    # Preserve original benchmark_date
    new_summary["benchmark_date"] = summary_data["benchmark_date"]

    # Write enriched results
    with open(args.results, "w") as fh:
        json.dump({
            "summary": new_summary,
            "publication_exclusions": sorted(exclusions, key=lambda e: e["eia_plant_id"]),
            "plants": sorted(records, key=lambda r: r["eia_plant_id"]),
        }, fh, indent=1)

    # Write markdown
    out_dir = os.path.dirname(args.results)
    md_path = os.path.join(out_dir, "eia_fleet_benchmark_summary.md")
    with open(md_path, "w") as fh:
        fh.write(render_markdown(new_summary))

    # Write dashboard JSON (summary-only)
    dash_path = os.path.join(out_dir, "eia_fleet_benchmark_dashboard.json")
    with open(dash_path, "w") as fh:
        json.dump(new_summary, fh, indent=1)

    pub = new_summary["publication"]
    mode = new_summary.get("mode_absolute_deviation_pct", "?")
    pub_mode = pub.get("mode_absolute_deviation_pct", "?")
    print(f"[done] Full fleet: MAD ±{new_summary['mean_absolute_deviation_pct']}%, "
          f"mode ±{mode}%")
    print(f"[done] Publication cohort ({pub['n']} plants): "
          f"MAD ±{pub.get('mean_absolute_deviation_pct')}%, mode ±{pub_mode}%")
    print(f"[done] Wrote {args.results}, {md_path}, {dash_path}")


if __name__ == "__main__":
    main()
