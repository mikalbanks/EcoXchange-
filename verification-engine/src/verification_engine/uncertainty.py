"""Uncertainty quantification -> P50 / P90 exceedance estimates.

Solar finance speaks in P50/P90, not point estimates. P50 is the central
(median) expected energy; P90 is the energy level exceeded in 90% of years
(a conservative number lenders/investors underwrite to).

We build an explicit uncertainty budget: each independent source of error is a
relative standard deviation, combined in quadrature (root-sum-square) into a
total sigma. Assuming a roughly normal annual-energy distribution:

    P90 = P50 * (1 - 1.282 * sigma)      (one-sided, lower tail)
    P99 = P50 * (1 - 2.326 * sigma)

The 1.282 / 2.326 are standard normal z-scores. Swap to a lognormal fit if you
later have enough operating years to justify it.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict
import math


# Default relative uncertainties (1-sigma). These are conservative literature
# values; tighten them with project-specific data and an IE report over time.
DEFAULT_UNCERTAINTIES: Dict[str, float] = {
    "irradiance_source": 0.04,     # overridden by inter-source spread when available
    "transposition_model": 0.02,   # GHI -> plane-of-array
    "soiling_estimate": 0.015,
    "interannual_variability": 0.035,  # year-to-year weather
    "power_model": 0.02,           # PVWatts DC/AC modeling
}

Z_P90 = 1.2816
Z_P99 = 2.3263


@dataclass
class UncertaintyBudget:
    components: Dict[str, float]
    total_sigma: float
    p50_kwh: float
    p90_kwh: float
    p99_kwh: float

    def as_dict(self) -> dict:
        return {
            "components_pct": {k: round(v * 100, 3) for k, v in self.components.items()},
            "total_sigma_pct": round(self.total_sigma * 100, 3),
            "p50_kwh": round(self.p50_kwh, 1),
            "p90_kwh": round(self.p90_kwh, 1),
            "p99_kwh": round(self.p99_kwh, 1),
            "p90_p50_ratio": round(self.p90_kwh / self.p50_kwh, 4) if self.p50_kwh else None,
        }


def build_budget(p50_energy_kwh: float,
                 irradiance_spread_frac: float | None = None,
                 overrides: Dict[str, float] | None = None) -> UncertaintyBudget:
    comps = dict(DEFAULT_UNCERTAINTIES)
    if irradiance_spread_frac is not None and irradiance_spread_frac > 0:
        # Use the measured inter-source spread rather than the literature default.
        comps["irradiance_source"] = irradiance_spread_frac
    if overrides:
        comps.update(overrides)

    total_sigma = math.sqrt(sum(v ** 2 for v in comps.values()))
    p90 = p50_energy_kwh * (1.0 - Z_P90 * total_sigma)
    p99 = p50_energy_kwh * (1.0 - Z_P99 * total_sigma)
    return UncertaintyBudget(comps, total_sigma, p50_energy_kwh, p90, p99)
