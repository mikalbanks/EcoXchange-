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


# ── Piecewise NREL degradation model (upgrade spec 6) ─────────────────────
# Based on Jordan et al. (2016), "Compendium of photovoltaic degradation
# rates", Progress in Photovoltaics 24(7); Jordan & Kurtz (2013), Progress
# in Photovoltaics 21(1); IEC TS 63209:2021. Crystalline-silicon defaults:
# light-induced degradation (LID) dominates year 0–1, then the rate
# stabilizes, slows in mid-life, and may re-accelerate at end of life.
PIECEWISE_YEAR_0_1_RATE = 0.02    # 2% total first-year drop (LID)
PIECEWISE_YEAR_1_5_RATE = 0.007   # 0.7%/yr, years 1–5
PIECEWISE_YEAR_5_25_RATE = 0.005  # 0.5%/yr, years 5–25
PIECEWISE_YEAR_25_PLUS_RATE = 0.008  # 0.8%/yr past year 25


def piecewise_nrel_degradation_factor(years_operating: float) -> float:
    """Cumulative output factor (0..1) under the piecewise NREL model.

    Transcribed from the upgrade spec's PiecewiseDegradation.factor()
    verbatim: multiplicative phases, each linear within its segment.
    NOTE: the spec's prose acceptance table quotes ~0.945 @ year 10 and
    ~0.831 @ year 25, which its own formula does not produce (it yields
    0.9287 and 0.8573). The formula is the implementation of record; the
    discrepancy is documented in tests/test_degradation.py.
    """
    if years_operating <= 0:
        return 1.0

    factor = 1.0

    # Phase 1: LID (year 0–1)
    if years_operating <= 1:
        factor *= 1.0 - PIECEWISE_YEAR_0_1_RATE * years_operating
        return max(0.0, factor)
    factor *= 1.0 - PIECEWISE_YEAR_0_1_RATE  # full first-year LID

    # Phase 2: early life (year 1–5)
    remaining = years_operating - 1
    if remaining <= 4:
        factor *= 1.0 - PIECEWISE_YEAR_1_5_RATE * remaining
        return max(0.0, factor)
    factor *= 1.0 - PIECEWISE_YEAR_1_5_RATE * 4

    # Phase 3: mature (year 5–25)
    remaining = years_operating - 5
    if remaining <= 20:
        factor *= 1.0 - PIECEWISE_YEAR_5_25_RATE * remaining
        return max(0.0, factor)
    factor *= 1.0 - PIECEWISE_YEAR_5_25_RATE * 20

    # Phase 4: end of life (year 25+)
    remaining = years_operating - 25
    factor *= 1.0 - PIECEWISE_YEAR_25_PLUS_RATE * remaining

    return max(0.0, factor)


def _degradation_factor_for_years(cfg: SystemConfig, years: float) -> float:
    if getattr(cfg, "degradation_model", "linear") == "piecewise_nrel":
        return piecewise_nrel_degradation_factor(years)
    return (1.0 - cfg.degradation_rate_per_year) ** years


def degradation_factor(cfg: SystemConfig, as_of: date) -> Tuple[float, float]:
    """Return (factor, loss_pct) for the configured degradation model.

    "linear" (default) is the historical behavior — geometric
    (1-rate)**years despite the docstring legacy name — kept bit-for-bit
    for back-compat. "piecewise_nrel" uses the segmented model above.
    """
    years = cfg.years_since_commission(as_of)
    factor = _degradation_factor_for_years(cfg, years)
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

    dates = (gross.index.date)
    deg = pd.Series(
        [_degradation_factor_for_years(cfg, cfg.years_since_commission(d))
         for d in dates],
        index=gross.index,
    )
    return gross * comp_factor * deg
