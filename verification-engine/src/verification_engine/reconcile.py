"""Reconciliation of modeled expected energy against the revenue meter.

This is where verification actually happens. We compare modeled net energy to
metered energy, compute the Performance Ratio, and analyze the residuals with
ROBUST statistics (median / MAD), so a single bad interval or meter glitch
doesn't move the verdict. A stable, low-bias residual is the proof the asset is
performing; a sustained divergence is the signal of soiling, an outage, a meter
fault, or misreporting — which is exactly the value an investor pays for.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


MAD_TO_SIGMA = 1.4826  # scale factor making MAD a consistent estimator of sigma


@dataclass
class ReconciliationResult:
    performance_ratio: float
    bias_pct: float                 # median (metered-modeled)/modeled, robust
    mae_pct: float
    n_periods: int
    anomalies: pd.DataFrame         # rows flagged as outliers
    monthly: pd.DataFrame           # per-month modeled, metered, residual, PR

    def summary(self) -> dict:
        return {
            "performance_ratio": round(self.performance_ratio, 4),
            "robust_bias_pct": round(self.bias_pct, 3),
            "mae_pct": round(self.mae_pct, 3),
            "n_periods": self.n_periods,
            "n_anomalies": int(len(self.anomalies)),
        }


def _robust_z(residual_frac: pd.Series) -> pd.Series:
    med = residual_frac.median()
    mad = (residual_frac - med).abs().median()
    sigma = MAD_TO_SIGMA * mad if mad > 0 else residual_frac.std(ddof=0)
    if not sigma or np.isnan(sigma):
        return pd.Series(0.0, index=residual_frac.index)
    return (residual_frac - med) / sigma


def reconcile(modeled_kwh: pd.Series,
              metered_kwh: pd.Series,
              expected_poa_energy_kwh: Optional[pd.Series] = None,
              anomaly_z: float = 3.5) -> ReconciliationResult:
    """Compare two tz-aware kWh series on their shared index.

    `expected_poa_energy_kwh` (optional) is the ideal energy a perfectly clean
    nameplate array would make for the same irradiance, used as the Performance
    Ratio denominator. If omitted, PR is approximated as metered/modeled.
    """
    df = pd.concat(
        {"modeled": modeled_kwh, "metered": metered_kwh}, axis=1
    ).dropna()
    if df.empty:
        raise ValueError("No overlapping modeled/metered timestamps to reconcile.")

    df["residual"] = df["metered"] - df["modeled"]
    # Guard divide-by-zero on near-night / zero-output intervals.
    safe = df["modeled"].where(df["modeled"].abs() > 1e-6)
    df["residual_frac"] = df["residual"] / safe

    daytime = df[df["modeled"] > df["modeled"].max() * 0.01].copy()
    daytime["robust_z"] = _robust_z(daytime["residual_frac"])
    anomalies = daytime[daytime["robust_z"].abs() > anomaly_z]

    bias_pct = float(daytime["residual_frac"].median() * 100.0)
    mae_pct = float(daytime["residual_frac"].abs().median() * 100.0)

    if expected_poa_energy_kwh is not None:
        poa = expected_poa_energy_kwh.reindex(df.index).dropna()
        pr = float(df["metered"].reindex(poa.index).sum() / poa.sum()) if poa.sum() else float("nan")
    else:
        pr = float(df["metered"].sum() / df["modeled"].sum()) if df["modeled"].sum() else float("nan")

    monthly = df.resample("MS").agg(
        modeled=("modeled", "sum"),
        metered=("metered", "sum"),
    )
    monthly["residual_pct"] = (
        (monthly["metered"] - monthly["modeled"]) / monthly["modeled"] * 100.0
    )

    return ReconciliationResult(
        performance_ratio=pr,
        bias_pct=bias_pct,
        mae_pct=mae_pct,
        n_periods=len(df),
        anomalies=anomalies,
        monthly=monthly,
    )
