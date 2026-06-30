"""PVDAQ validation harness — benchmark the engine against measured ground truth.

NREL PVDAQ publishes real instrumented PV system data (measured AC production
plus on-site sensors) for free. Running the engine's satellite-only estimate
against a PVDAQ system and reporting RMSE / MBE / correlation is what converts
the engine from "founder's backtest" into a *benchmarked, validated methodology* —
the artifact you put in front of an IE firm or an institutional allocator. This
directly closes the "validate against independent third-party telemetry" milestone
at zero cost.

DATA ACCESS (free):
  - NREL Developer key: https://developer.nrel.gov/signup/
  - PVDAQ API:          https://developer.nrel.gov/docs/solar/pvdaq-v3/
  - Bulk/public mirror: NREL OEDI PVDAQ bucket on AWS Open Data

NOTE FOR CLAUDE CODE: the exact PVDAQ endpoint paths and column names must be
confirmed against the live API docs before relying on them — schemas drift, and
per-system column naming (e.g. 'ac_power', 'inverter_ac_power_w') varies. The
metric math below is correct regardless; only the fetch/column-mapping needs
verification. Wire NREL_API_KEY / NREL_EMAIL from environment, never hardcode.
"""
from __future__ import annotations

from dataclasses import dataclass
import os

import numpy as np
import pandas as pd
import requests

from .config import SystemConfig
from . import irradiance as irr
from .modelchain import expected_ac_energy
from .losses import apply_losses_series

PVDAQ_BASE = "https://developer.nrel.gov/api/pvdaq/v3"


@dataclass
class ValidationMetrics:
    n: int
    rmse_kwh: float
    mbe_kwh: float          # mean bias error (signed) -> systematic over/under-estimate
    mae_kwh: float
    nrmse_pct: float        # RMSE normalized by mean measured
    nmbe_pct: float         # MBE normalized by mean measured
    correlation: float

    def as_dict(self) -> dict:
        return {
            "n": self.n,
            "rmse_kwh": round(self.rmse_kwh, 3),
            "mbe_kwh": round(self.mbe_kwh, 3),
            "mae_kwh": round(self.mae_kwh, 3),
            "nrmse_pct": round(self.nrmse_pct, 2),
            "nmbe_pct": round(self.nmbe_pct, 2),
            "pearson_r": round(self.correlation, 4),
        }


def fetch_pvdaq_power(system_id: int, year: int,
                      api_key: str | None = None) -> pd.DataFrame:
    """Pull measured time-series for one PVDAQ system-year.

    Returns a DataFrame indexed by tz-aware timestamp with a 'measured_ac_kwh'
    column. Column mapping below is a STARTING POINT — verify per system.
    """
    api_key = api_key or os.environ.get("NREL_API_KEY")
    if not api_key:
        raise RuntimeError("Set NREL_API_KEY (free at developer.nrel.gov/signup).")

    resp = requests.get(
        f"{PVDAQ_BASE}/data_file",
        params={"api_key": api_key, "system_id": system_id, "year": year},
        timeout=60,
    )
    resp.raise_for_status()
    raw = pd.DataFrame(resp.json().get("outputs", resp.json()))

    # --- column mapping: confirm against the chosen system's schema ---
    ts_col = _first_present(raw, ["measured_on", "timestamp", "date"])
    pwr_col = _first_present(raw, ["ac_power", "inverter_ac_power_w", "ac_power_w"])
    if ts_col is None or pwr_col is None:
        raise ValueError(f"Could not map PVDAQ columns from {list(raw.columns)[:12]}")

    df = pd.DataFrame(index=pd.to_datetime(raw[ts_col]))
    interval_h = _interval_hours(df.index)
    df["measured_ac_kwh"] = pd.to_numeric(raw[pwr_col].values, errors="coerce") / 1000.0 * interval_h
    return df.dropna()


def validate_against_pvdaq(cfg: SystemConfig,
                           pvdaq_measured_kwh: pd.Series,
                           irradiance_weather: pd.DataFrame) -> ValidationMetrics:
    """Compare engine estimate (satellite irradiance -> modelchain -> losses)
    against PVDAQ measured energy on the shared index."""
    gross = expected_ac_energy(cfg, irradiance_weather)
    estimated = apply_losses_series(cfg, gross)

    df = pd.concat(
        {"est": estimated, "meas": pvdaq_measured_kwh}, axis=1
    ).dropna()
    if df.empty:
        raise ValueError("No overlap between estimate and PVDAQ measurement.")

    err = df["est"] - df["meas"]
    mean_meas = df["meas"].mean()
    rmse = float(np.sqrt((err ** 2).mean()))
    mbe = float(err.mean())
    mae = float(err.abs().mean())
    corr = float(df["est"].corr(df["meas"]))

    return ValidationMetrics(
        n=len(df),
        rmse_kwh=rmse,
        mbe_kwh=mbe,
        mae_kwh=mae,
        nrmse_pct=100.0 * rmse / mean_meas if mean_meas else float("nan"),
        nmbe_pct=100.0 * mbe / mean_meas if mean_meas else float("nan"),
        correlation=corr,
    )


def _first_present(df: pd.DataFrame, candidates: list[str]) -> str | None:
    return next((c for c in candidates if c in df.columns), None)


def _interval_hours(index: pd.DatetimeIndex) -> float:
    if len(index) < 2:
        return 1.0
    return float(pd.Series(index).diff().median().total_seconds() / 3600.0)
