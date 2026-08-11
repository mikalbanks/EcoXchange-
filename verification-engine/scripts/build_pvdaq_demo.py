"""Build the real-telemetry demo bundle for NREL PVDAQ system 9068 (spec 19).

Why this exists
---------------
The Savannah demo's inverter series was *derived from* its expected series
(`ecoxchange-dashboard/scripts/generate-realistic-seed.mjs`: inverter =
expected x noise, then rescaled so the annual totals match exactly). Three-way
reconciliation between algebraically dependent legs verifies nothing, and it is
what produced the INV->EXP 0.0% the demo has been showing.

This script builds a demo asset whose production leg is *measured*: NREL PVDAQ
system 9068, a public research dataset, aggregated from 5-minute AC power that
no part of this codebase generated.

Provenance of each leg (rule #7 — cited vs. estimated)
------------------------------------------------------
  inverter  CITED     measured 5-min AC power, PVDAQ system 9068
  expected  ESTIMATED Engine A (pvlib ModelChain) on NASA POWER irradiance
  utility   ESTIMATED modelled from the inverter leg — NOT an independent
                      measurement, and must never be presented as one

Two of three legs are independent. That is the whole claim, and it is the claim
the sequence doc permits before a real utility-meter connection exists.

What is NOT available here
--------------------------
A measured meter record for 9068 does exist
(`attached_assets/9068_meter_data_*.csv`) but it covers 2024-01-01..2025-04-30,
while the inverter record ends 2023-11-16. They do not overlap, so they cannot
form two measured legs for the same period. Hence the modelled utility leg.

Time standard (spec 20 §2.1)
----------------------------
PVDAQ timestamps are naive LOCAL time — the 2022 mean-power profile peaks at
timestamp hour 12, not hour 19, so they are America/Denver, not UTC. They are
localized explicitly below. Engine A returns UTC and is converted to site-local
before monthly bucketing, so both legs are bucketed on the same calendar.

Run: python3 scripts/build_pvdaq_demo.py [--year 2022] [--offline]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.verification_engine.config import (
    ArrayConfig, Location, LossAssumptions, SystemConfig,
)
from src.verification_engine.irradiance import fetch_nasa_power
from src.verification_engine.losses import apply_losses_series
from src.verification_engine.modelchain import expected_ac_energy

REPO = Path(__file__).resolve().parent.parent.parent

TELEMETRY_ZIP = REPO / "attached_assets" / "ecoxchange_pvdaq_package_1772767814104.zip"
TELEMETRY_MEMBER = "ecoxchange_pvdaq_package/pvdaq_9068_cleaned_5min.csv"

OUT_JSON = REPO / "ecoxchange-dashboard" / "src" / "data" / "demo-pvdaq-9068.json"
OUT_SQL = (REPO / "ecoxchange-reconciliation-engine" / "supabase" / "seed"
           / "004_pvdaq_9068_measured.sql")

PROJECT_UUID = "9068da91-0000-4000-8000-000000009068"

# ── Site facts ────────────────────────────────────────────────────────────────
# Coordinates and DC capacity match the site config already committed at
# server/services/backtest-engine.ts:60. 9068 is a horizontal single-axis
# tracking CdTe array near Greeley, Colorado.
SITE_TZ = "America/Denver"
LATITUDE = 40.3864
LONGITUDE = -104.5512
DC_CAPACITY_KW = 4738.0
# AC nameplate is not published in the dataset; inferred from the measured power
# ceiling (~3,700-3,790 kW across every year of the record). ESTIMATED, not cited.
AC_CAPACITY_KW = 3800.0
COMMISSION_DATE = date(2017, 8, 1)   # first telemetry in the PVDAQ record

PPA_RATE_USD_PER_KWH = 0.085
# Line/transformer losses between the inverter and the revenue meter. A modelling
# assumption for the estimated utility leg, not a measurement.
UTILITY_LOSS_FACTOR = 0.03
UTILITY_NOISE_SEED = 90682022

# Engine tolerance bands, matching the tolerance_config already seeded for the
# Savannah project (ecoxchange-reconciliation-engine/supabase/seed/001).
TOLERANCES = {
    "inv_vs_expected_upper_pct": 15,
    "inv_vs_expected_lower_pct": -15,
    "inv_vs_utility_pct": 10,
    "util_vs_expected_upper_pct": 20,
    "util_vs_expected_lower_pct": -20,
    "min_data_completeness_pct": 90,
}
MIN_COMPLETENESS_PCT = TOLERANCES["min_data_completeness_pct"]


def site_config() -> SystemConfig:
    return SystemConfig(
        name="NREL PVDAQ 9068 — Greeley, CO",
        location=Location(LATITUDE, LONGITUDE, altitude=1450.0, tz=SITE_TZ),
        array=ArrayConfig(
            surface_tilt=0.0, surface_azimuth=180.0,
            dc_capacity_kw=DC_CAPACITY_KW, ac_capacity_kw=AC_CAPACITY_KW,
            tracking=True, axis_tilt=0.0, axis_azimuth=180.0,
        ),
        losses=LossAssumptions(),
        commission_date=COMMISSION_DATE,
    )


# ── Measured inverter leg ─────────────────────────────────────────────────────

def load_measured_5min(year: int) -> pd.DataFrame:
    """Measured 5-minute AC power for one calendar year, indexed in site-local time."""
    with zipfile.ZipFile(TELEMETRY_ZIP) as z, z.open(TELEMETRY_MEMBER) as fh:
        df = pd.read_csv(fh, parse_dates=["timestamp"])

    if df["timestamp"].dt.tz is not None:
        raise ValueError("PVDAQ export unexpectedly carries a tz; revisit the localization below")
    # Naive timestamps are site-local standard/daylight time (see module docstring).
    df = df.set_index(df["timestamp"].dt.tz_localize(
        SITE_TZ, ambiguous="NaT", nonexistent="NaT"))
    df = df[df.index.notna()]
    return df[df.index.year == year]


def infer_interval_hours(index: pd.DatetimeIndex) -> float:
    """Interval from the median index delta — never hardcoded (standing rule #4)."""
    if len(index) < 2:
        raise ValueError("cannot infer an interval from fewer than two samples")
    delta = pd.Series(index).diff().median()
    return float(delta.total_seconds() / 3600.0)


def monthly_measured(df: pd.DataFrame, year: int) -> pd.DataFrame:
    """Aggregate measured 5-min power to calendar months, with completeness.

    Rule #3: a missing reading is NaN, never 0. Coercing a gap to zero fabricates
    a shortfall and trips the gate on what is really a data problem. Negative
    values are KEPT — at this site they are the ~-7 kW overnight tare draw, which
    is genuine net consumption, not a bad reading.
    """
    interval_hours = infer_interval_hours(df.index)

    power = pd.to_numeric(df["ac_power_kw"], errors="coerce")
    power = power.where(df["quality_flag"].eq("ok"))     # non-ok -> NaN, not 0
    energy = power * interval_hours

    # Reindex onto the complete expected grid so absent rows surface as NaN.
    full = pd.date_range(f"{year}-01-01", f"{year}-12-31 23:59:59",
                         freq=f"{int(round(interval_hours * 60))}min", tz=SITE_TZ)
    energy = energy.reindex(full)

    # Bucket on the site-local wall clock: drop the offset only after converting,
    # so a month boundary is local midnight rather than 07:00 local.
    months = energy.index.tz_localize(None).to_period("M")
    grouped = energy.groupby(months)
    out = pd.DataFrame({
        "inverter_kwh": grouped.sum(min_count=1),
        "observed": grouped.count(),
        "expected_samples": grouped.size(),
    })
    out["completeness_pct"] = (out["observed"] / out["expected_samples"] * 100).round(2)
    return out


# ── Modelled expected leg ─────────────────────────────────────────────────────

def monthly_expected(cfg: SystemConfig, year: int) -> pd.Series:
    """Engine A net expected energy per calendar month, bucketed in site-local time."""
    weather = fetch_nasa_power(cfg.location, f"{year}-01-01", f"{year}-12-31")
    gross = expected_ac_energy(cfg, weather)          # kWh per interval, tz-aware
    net = apply_losses_series(cfg, gross)
    local = net.tz_convert(SITE_TZ)
    local = local[local.index.year == year]
    # Same local-wall-clock bucketing as the measured leg, so both are on one calendar.
    return local.groupby(local.index.tz_localize(None).to_period("M")).sum()


# ── Modelled utility leg ──────────────────────────────────────────────────────

def monthly_utility(inverter: pd.Series) -> pd.Series:
    """Estimated revenue-meter energy: inverter minus line losses, plus meter noise.

    This leg is MODELLED. It exists so the three-way reconciliation surface has a
    third input to render, and it is labelled `estimated` everywhere it appears.
    It is not evidence of anything and must not be described as a measurement.
    """
    rng = np.random.default_rng(UTILITY_NOISE_SEED)
    noise = rng.normal(0.0, 0.012, size=len(inverter))
    return inverter * (1.0 - UTILITY_LOSS_FACTOR) * (1.0 + noise)


# ── Assembly ──────────────────────────────────────────────────────────────────

def pct(a: float, b: float) -> float | None:
    if b is None or not np.isfinite(b) or b == 0:
        return None
    return round((a - b) / b * 100.0, 2)


def build_records(year: int, offline: bool) -> list[dict]:
    cfg = site_config()
    measured = monthly_measured(load_measured_5min(year), year)

    if offline:
        raise SystemExit(
            "--offline needs a cached expected-energy series; rerun with network "
            "so the expected leg comes from Engine A rather than a placeholder."
        )
    expected = monthly_expected(cfg, year)
    utility = monthly_utility(measured["inverter_kwh"])

    records = []
    for period in measured.index:
        inv = measured.at[period, "inverter_kwh"]
        exp = float(expected.get(period, np.nan))
        utl = float(utility.get(period, np.nan))
        completeness = float(measured.at[period, "completeness_pct"])

        inv_vs_exp = pct(inv, exp)
        inv_vs_utl = pct(inv, utl)
        utl_vs_exp = pct(utl, exp)

        flags: list[str] = []
        # QC gate first: incomplete data is PENDING, never a verdict (rule #5/#6).
        if completeness < MIN_COMPLETENESS_PCT:
            status = "pending"
            flags.append(
                f"Data completeness {completeness:.1f}% is below the "
                f"{MIN_COMPLETENESS_PCT}% minimum; the period cannot be reconciled."
            )
        else:
            status = "verified"
            if inv_vs_exp is not None and (
                inv_vs_exp > TOLERANCES["inv_vs_expected_upper_pct"]
                or inv_vs_exp < TOLERANCES["inv_vs_expected_lower_pct"]
            ):
                status = "flagged"
                direction = "ABOVE" if inv_vs_exp > 0 else "BELOW"
                flags.append(
                    f"Inverter production {abs(inv_vs_exp):.1f}% {direction} expected "
                    f"(tolerance: ±{TOLERANCES['inv_vs_expected_upper_pct']}%)."
                )
            if utl_vs_exp is not None and (
                utl_vs_exp > TOLERANCES["util_vs_expected_upper_pct"]
                or utl_vs_exp < TOLERANCES["util_vs_expected_lower_pct"]
            ):
                status = "flagged"
                direction = "ABOVE" if utl_vs_exp > 0 else "BELOW"
                flags.append(
                    f"Utility meter {abs(utl_vs_exp):.1f}% {direction} expected "
                    f"(tolerance: ±{TOLERANCES['util_vs_expected_upper_pct']}%)."
                )

        records.append({
            "period_start": str(period.start_time.date()),
            "period_end": str(period.end_time.date()),
            "inverter_kwh": round(float(inv), 1),
            "utility_kwh": round(utl, 1),
            "expected_kwh": round(exp, 1),
            "inv_vs_expected_pct": inv_vs_exp,
            "inv_vs_utility_pct": inv_vs_utl,
            "util_vs_expected_pct": utl_vs_exp,
            "status": status,
            "flag_reasons": flags,
            "data_completeness_pct": completeness,
            "estimated_revenue": round(float(inv) * PPA_RATE_USD_PER_KWH),
        })
    return records


PROVENANCE = {
    "inverter_kwh": {
        "basis": "cited",
        "source": "NREL PVDAQ system 9068, measured 5-minute AC power",
        "note": "Public research dataset. Not generated by this codebase.",
    },
    "expected_kwh": {
        "basis": "estimated",
        "source": "Engine A (pvlib PVWatts ModelChain) on NASA POWER irradiance",
        "note": (
            "Single-axis tracking mount. The fixed-tilt fleet backtest does not "
            "validate tracking plants, so this leg carries no cohort-level "
            "accuracy claim."
        ),
    },
    "utility_kwh": {
        "basis": "estimated",
        "source": "Modelled from the inverter leg (line losses + meter noise)",
        "note": (
            "NOT an independent measurement. A measured meter record for 9068 "
            "exists for 2024-01-01..2025-04-30 but does not overlap the inverter "
            "record, which ends 2023-11-16."
        ),
    },
}


def build_bundle(year: int, offline: bool) -> dict:
    cfg = site_config()
    records = build_records(year, offline)
    reconciled = [r for r in records if r["status"] != "pending"]
    total_kwh = sum(r["inverter_kwh"] for r in records)

    return {
        "_generated_by": "verification-engine/scripts/build_pvdaq_demo.py",
        "project": {
            "id": "demo-pvdaq-9068",
            "name": "NREL PVDAQ 9068 — Greeley, CO",
            "location": "Greeley, Colorado",
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "timezone": SITE_TZ,
            "capacity_kw": DC_CAPACITY_KW,
            "ac_capacity_kw": AC_CAPACITY_KW,
            "array_type": "horizontal_single_axis_tracking",
            "commissioning_date": COMMISSION_DATE.isoformat(),
            "ppa_rate_per_kwh": PPA_RATE_USD_PER_KWH,
            "status": "active",
            "telemetry_year": year,
            "engine_config_hash": cfg.config_hash(),
        },
        "provenance": PROVENANCE,
        "tolerance_config": TOLERANCES,
        "verification_records": records,
        "summary": {
            "annual_production_mwh": round(total_kwh / 1000.0, 1),
            "capacity_factor_pct": round(total_kwh / (DC_CAPACITY_KW * 8760) * 100, 1),
            "months_verified": sum(1 for r in records if r["status"] == "verified"),
            "months_flagged": sum(1 for r in records if r["status"] == "flagged"),
            "months_pending": sum(1 for r in records if r["status"] == "pending"),
            "months_reconciled": len(reconciled),
            "total_revenue_estimate": sum(r["estimated_revenue"] for r in records),
            "ppa_rate": PPA_RATE_USD_PER_KWH,
        },
    }


def sql_literal(values: list[str]) -> str:
    if not values:
        return "'{}'"
    escaped = ",".join('"' + v.replace("'", "''").replace('"', '\\"') + '"' for v in values)
    return f"'{{{escaped}}}'"


def format_sql(bundle: dict) -> str:
    p = bundle["project"]
    tol = json.dumps(bundle["tolerance_config"], separators=(",", ":"))
    rows = []
    for r in bundle["verification_records"]:
        def num(v):
            return "NULL" if v is None else repr(v)
        rows.append(
            f"('{PROJECT_UUID}', '{r['period_start']}', '{r['period_end']}', "
            f"{num(r['inverter_kwh'])}, {num(r['utility_kwh'])}, {num(r['expected_kwh'])}, "
            f"{num(r['inv_vs_expected_pct'])}, {num(r['inv_vs_utility_pct'])}, "
            f"{num(r['util_vs_expected_pct'])}, '{r['status']}', "
            f"{sql_literal(r['flag_reasons'])}, '{tol}', "
            f"{r['estimated_revenue']}, '2.0.0')"
        )
    values_block = ",\n".join(rows)
    return f"""-- 004_pvdaq_9068_measured.sql
-- NREL PVDAQ system 9068 (Greeley, CO) — {p['telemetry_year']} verification records.
--
-- The inverter leg is MEASURED: 5-minute AC power from the public PVDAQ dataset,
-- aggregated by verification-engine/scripts/build_pvdaq_demo.py. The expected leg
-- is Engine A on NASA POWER. The utility leg is MODELLED from the inverter leg and
-- is not an independent measurement — see the `provenance` block in
-- ecoxchange-dashboard/src/data/demo-pvdaq-9068.json.
--
-- Regenerate with: python3 verification-engine/scripts/build_pvdaq_demo.py
--
-- `inverter_brand` below is a SCHEMA PLACEHOLDER. The column is NOT NULL with a
-- CHECK against a four-vendor enum, and the PVDAQ dataset does not publish the
-- inverter make for this system. It is not a claim about the hardware.

INSERT INTO projects (
    id, name, latitude, longitude, timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate,
    commissioning_date, inverter_brand, inverter_api_key_ref, inverter_plant_id,
    offtake_type, ppa_rate_per_kwh, ppa_escalator, status
) VALUES (
    '{PROJECT_UUID}',
    '{p['name'].replace("'", "''")}',
    {p['latitude']}, {p['longitude']}, '{p['timezone']}',
    {p['capacity_kw']}, 0, 180,
    0.18, 0.14, 0.0075,
    '{p['commissioning_date']}', 'sma', 'pvdaq-public-dataset', '9068',
    'ppa', {p['ppa_rate_per_kwh']}, 0.02, 'active'
);

INSERT INTO verification_records (
    project_id, period_start, period_end,
    inverter_kwh, utility_kwh, expected_kwh,
    inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct,
    status, flag_reasons, tolerance_config, estimated_revenue, engine_version
) VALUES
{values_block};
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year", type=int, default=2022,
                    help="calendar year of measured telemetry (default: 2022, the "
                         "last year of the PVDAQ record that is 100%% complete)")
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    bundle = build_bundle(args.year, args.offline)

    OUT_JSON.write_text(json.dumps(bundle, indent=2, ensure_ascii=False) + "\n")
    OUT_SQL.write_text(format_sql(bundle))

    s = bundle["summary"]
    devs = [r["inv_vs_expected_pct"] for r in bundle["verification_records"]
            if r["inv_vs_expected_pct"] is not None]
    inv_total = sum(r["inverter_kwh"] for r in bundle["verification_records"])
    exp_total = sum(r["expected_kwh"] for r in bundle["verification_records"])

    print(f"PVDAQ 9068 — {args.year}")
    print(f"  measured inverter : {inv_total:,.0f} kWh")
    print(f"  modelled expected : {exp_total:,.0f} kWh")
    print(f"  annual INV->EXP   : {(inv_total / exp_total - 1) * 100:+.1f}%  "
          f"(legs are independent; this is NOT forced to zero)")
    print(f"  monthly INV->EXP  : {', '.join(f'{d:+.1f}' for d in devs)}")
    print(f"  capacity factor   : {s['capacity_factor_pct']}%")
    print(f"  verified/flagged/pending: {s['months_verified']}/"
          f"{s['months_flagged']}/{s['months_pending']}")
    print(f"  wrote {OUT_JSON.relative_to(REPO)}")
    print(f"  wrote {OUT_SQL.relative_to(REPO)}")


if __name__ == "__main__":
    main()
