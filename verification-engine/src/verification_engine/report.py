"""Report assembly: an independent-engineering-style verification record.

The output deliberately mirrors what an IE report and an investor's data room
expect: P50/P90, performance ratio, a loss waterfall, an itemized uncertainty
budget, the reconciliation verdict, flagged anomalies, and a full audit trail
(every data source, version, parameter, and a config hash). Formatting the
output this way now means an independent engineer's eventual review reconciles
cleanly against your numbers — the cheapest path toward "bankable" data.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List, Optional
import json
import platform

import pvlib

from .config import SystemConfig
from .losses import WaterfallLine
from .uncertainty import UncertaintyBudget
from .reconcile import ReconciliationResult


@dataclass
class VerificationReport:
    project: str
    period_start: str
    period_end: str
    p50_kwh: float
    p90_kwh: float
    waterfall: List[WaterfallLine]
    uncertainty: UncertaintyBudget
    reconciliation: Optional[ReconciliationResult]
    audit_trail: dict

    def to_dict(self) -> dict:
        return {
            "project": self.project,
            "period": {"start": self.period_start, "end": self.period_end},
            "energy_estimate_kwh": {
                "p50": round(self.p50_kwh, 1),
                "p90": round(self.p90_kwh, 1),
            },
            "loss_waterfall": [
                {"step": w.name, "loss_pct": round(w.loss_pct, 3),
                 "energy_after_kwh": round(w.energy_after_kwh, 1)}
                for w in self.waterfall
            ],
            "uncertainty_budget": self.uncertainty.as_dict(),
            "reconciliation": (
                self.reconciliation.summary() if self.reconciliation else None
            ),
            "audit_trail": self.audit_trail,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


def build_audit_trail(cfg: SystemConfig, sources_used: list,
                      extra: Optional[dict] = None) -> dict:
    from . import __version__ as engine_version  # lazy: avoid __init__ circular import

    trail = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "config_hash": cfg.config_hash(),
        "engine_version": engine_version,
        "irradiance_sources": sources_used,
        "degradation_rate_per_year": cfg.degradation_rate_per_year,
        "commission_date": cfg.commission_date.isoformat(),
        "versions": {
            "pvlib": pvlib.__version__,
            "python": platform.python_version(),
        },
        "model": "pvlib PVWatts ModelChain (aoi=physical, spectral=no_loss)",
    }
    if extra:
        trail.update(extra)
    return trail
