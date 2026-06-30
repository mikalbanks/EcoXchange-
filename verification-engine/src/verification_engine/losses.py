"""Loss stack and degradation -> an IE-style energy waterfall.

The PVWatts modelchain gives gross AC energy from clean panels at nameplate. Real
assets lose energy to soiling, shading, mismatch, wiring, availability, etc., and
they degrade with age. We apply these as explicit multiplicative factors so each
line is visible in the waterfall (this is what an independent engineer expects to
see), rather than collapsing them into a single opaque derate.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Tuple

import pandas as pd

from pvlib.pvsystem import pvwatts_losses

from .config import SystemConfig


@dataclass
class WaterfallLine:
    name: str
    loss_pct: float        # this step's loss, %
    energy_after_kwh: float


def degradation_factor(cfg: SystemConfig, as_of: date) -> Tuple[float, float]:
    """Return (factor, loss_pct) from linear annual degradation."""
    years = cfg.years_since_commission(as_of)
    factor = (1.0 - cfg.degradation_rate_per_year) ** years
    return factor, (1.0 - factor) * 100.0


def apply_losses(cfg: SystemConfig, gross_energy_kwh: float, as_of: date
                 ) -> Tuple[float, List[WaterfallLine]]:
    """Apply each loss as its own waterfall step; return (net_kwh, waterfall)."""
    waterfall: List[WaterfallLine] = []
    running = gross_energy_kwh
    waterfall.append(WaterfallLine("Gross (modeled, nameplate)", 0.0, running))

    components = [
        ("Soiling", cfg.losses.soiling),
        ("Shading", cfg.losses.shading),
        ("Snow", cfg.losses.snow),
        ("Mismatch", cfg.losses.mismatch),
        ("Wiring", cfg.losses.wiring),
        ("Connections", cfg.losses.connections),
        ("LID", cfg.losses.lid),
        ("Nameplate", cfg.losses.nameplate_rating),
        ("Availability", cfg.losses.availability),
    ]
    for name, pct in components:
        running *= (1.0 - pct / 100.0)
        waterfall.append(WaterfallLine(name, pct, running))

    # Degradation by commissioning age (its own line, separate from LID).
    deg_factor, deg_pct = degradation_factor(cfg, as_of)
    running *= deg_factor
    waterfall.append(WaterfallLine("Degradation (age)", deg_pct, running))

    return running, waterfall


def total_derate_pct(cfg: SystemConfig, as_of: date) -> float:
    """Single combined derate %, for cross-checking against pvlib's own total."""
    _, wf = apply_losses(cfg, 1.0, as_of)
    return (1.0 - wf[-1].energy_after_kwh) * 100.0


def pvlib_reference_loss_pct(cfg: SystemConfig) -> float:
    """pvlib's bundled pvwatts_losses total (component losses only), as a check."""
    return float(pvwatts_losses(**cfg.losses.as_pvwatts_kwargs()))


def apply_losses_series(cfg: SystemConfig, gross: pd.Series) -> pd.Series:
    """Vectorized net-energy series: applies component losses + per-timestamp
    degradation based on each timestamp's date. Used for reconciliation."""
    comp_factor = 1.0
    for pct in [cfg.losses.soiling, cfg.losses.shading, cfg.losses.snow,
                cfg.losses.mismatch, cfg.losses.wiring, cfg.losses.connections,
                cfg.losses.lid, cfg.losses.nameplate_rating, cfg.losses.availability]:
        comp_factor *= (1.0 - pct / 100.0)

    years = (gross.index.date)
    deg = pd.Series(
        [(1.0 - cfg.degradation_rate_per_year) ** cfg.years_since_commission(d)
         for d in years],
        index=gross.index,
    )
    return gross * comp_factor * deg
