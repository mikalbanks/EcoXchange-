"""End-to-end verification run.

Usage:
    python -m src.run_verification \
        --config config/system_example.yaml \
        --year 2023 \
        --meter data/meter_2023.csv \
        --out report.json

The meter CSV must have a timestamp column and an energy column (kWh per
interval); adjust --meter-ts-col / --meter-kwh-col to match your export.

Environment (for live data fetch):
    NREL_API_KEY, NREL_EMAIL   -> NSRDB
(NASA POWER and PVGIS need no key.)
"""
from __future__ import annotations

import argparse
import os
import sys

import pandas as pd

# Allow running as a script or module.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.verification_engine import (
    load_config, triangulate, fetch_nsrdb, fetch_nasa_power, fetch_pvgis,
    expected_ac_energy, apply_losses, apply_losses_series, build_budget,
    reconcile, VerificationReport, build_audit_trail, load_meter_from_supabase,
    get_or_compute_site_sigma,
)


def gather_irradiance(cfg, year, use_nsrdb=True, use_nasa=True, use_pvgis=False):
    start, end = f"{year}-01-01", f"{year}-12-31"
    sources = {}
    if use_nsrdb and os.environ.get("NREL_API_KEY"):
        try:
            sources["nsrdb"] = fetch_nsrdb(
                cfg.location, year,
                os.environ["NREL_API_KEY"], os.environ.get("NREL_EMAIL", ""))
        except Exception as e:  # noqa: BLE001
            print(f"[warn] NSRDB fetch failed: {e}")
    if use_nasa:
        try:
            sources["nasa_power"] = fetch_nasa_power(cfg.location, start, end)
        except Exception as e:  # noqa: BLE001
            print(f"[warn] NASA POWER fetch failed: {e}")
    if use_pvgis:
        try:
            sources["pvgis"] = fetch_pvgis(cfg.location, year, year)
        except Exception as e:  # noqa: BLE001
            print(f"[warn] PVGIS fetch failed: {e}")
    return triangulate(sources)


def load_meter(path, ts_col, kwh_col, tz):
    df = pd.read_csv(path)
    s = pd.Series(
        pd.to_numeric(df[kwh_col], errors="coerce").values,
        index=pd.to_datetime(df[ts_col]),
    ).dropna()
    if s.index.tz is None:
        s = s.tz_localize(tz)
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--meter", help="CSV of metered energy (optional)")
    ap.add_argument("--meter-ts-col", default="timestamp")
    ap.add_argument("--meter-kwh-col", default="energy_kwh")
    ap.add_argument("--meter-supabase", metavar="PROJECT_ID",
                    help="load metered energy from Supabase for this project_id "
                         "(needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")
    ap.add_argument("--out", default="report.json")
    ap.add_argument("--pvgis", action="store_true", help="include PVGIS source")
    ap.add_argument("--per-site-sigma", action="store_true",
                    help="compute per-site interannual variability from NSRDB years "
                         "(cached in site_uncertainty) instead of the 3.5%% default")
    args = ap.parse_args()

    cfg = load_config(args.config)
    print(f"[info] Verifying {cfg.name} (config {cfg.config_hash()})")

    irr_result = gather_irradiance(cfg, args.year, use_pvgis=args.pvgis)
    print(f"[info] Irradiance sources: {irr_result.sources_used} "
          f"(spread {irr_result.ghi_spread_frac*100:.1f}%)")

    gross_series = expected_ac_energy(cfg, irr_result.weather)
    gross_total = float(gross_series.sum())

    as_of = pd.Timestamp(f"{args.year}-07-01").date()
    net_total, waterfall = apply_losses(cfg, gross_total, as_of)

    overrides = None
    if args.per_site_sigma:
        site_sigma = get_or_compute_site_sigma(cfg.location)
        overrides = {"interannual_variability": site_sigma}
        print(f"[info] Per-site interannual variability: {site_sigma*100:.2f}% "
              f"(default {3.5:.1f}%)")
    budget = build_budget(net_total, irradiance_spread_frac=irr_result.ghi_spread_frac,
                          overrides=overrides)

    recon = None
    meter = None
    if args.meter_supabase:
        meter = load_meter_from_supabase(
            args.meter_supabase,
            start=f"{args.year}-01-01T00:00:00Z",
            end=f"{args.year + 1}-01-01T00:00:00Z",
            tz=cfg.location.tz,
        )
    elif args.meter:
        meter = load_meter(args.meter, args.meter_ts_col, args.meter_kwh_col,
                           cfg.location.tz)
    if meter is not None:
        modeled_net = apply_losses_series(cfg, gross_series)
        recon = reconcile(modeled_net, meter)
        print(f"[info] Reconciliation: PR={recon.performance_ratio:.3f} "
              f"bias={recon.bias_pct:+.2f}% anomalies={len(recon.anomalies)}")

    report = VerificationReport(
        project=cfg.name,
        period_start=f"{args.year}-01-01",
        period_end=f"{args.year}-12-31",
        p50_kwh=budget.p50_kwh,
        p90_kwh=budget.p90_kwh,
        waterfall=waterfall,
        uncertainty=budget,
        reconciliation=recon,
        audit_trail=build_audit_trail(cfg, irr_result.sources_used),
    )

    with open(args.out, "w") as fh:
        fh.write(report.to_json())
    print(f"[done] Wrote {args.out}  |  P50={budget.p50_kwh:,.0f} kWh  "
          f"P90={budget.p90_kwh:,.0f} kWh")


if __name__ == "__main__":
    main()
