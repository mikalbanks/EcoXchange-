"""EcoXchange production-verification engine.

Pipeline:
    config -> multi-source irradiance (triangulated) -> pvlib expected energy
           -> loss waterfall + degradation -> P50/P90 -> reconcile vs meter
           -> IE-style report + audit trail

Public API kept intentionally small so it's easy to wire into a job runner.
"""
from .config import SystemConfig, load_config, Location, ArrayConfig, LossAssumptions
from .irradiance import triangulate, fetch_nsrdb, fetch_nasa_power, fetch_pvgis, IrradianceResult
from .modelchain import expected_ac_energy, build_modelchain
from .losses import apply_losses, apply_losses_series, degradation_factor, WaterfallLine
from .uncertainty import build_budget, UncertaintyBudget
from .reconcile import reconcile, ReconciliationResult
from .report import VerificationReport, build_audit_trail

__all__ = [
    "SystemConfig", "load_config", "Location", "ArrayConfig", "LossAssumptions",
    "triangulate", "fetch_nsrdb", "fetch_nasa_power", "fetch_pvgis", "IrradianceResult",
    "expected_ac_energy", "build_modelchain",
    "apply_losses", "apply_losses_series", "degradation_factor", "WaterfallLine",
    "build_budget", "UncertaintyBudget",
    "reconcile", "ReconciliationResult",
    "VerificationReport", "build_audit_trail",
]
__version__ = "2.0.0"
