"""Performance analytics (spec 22) — degradation, soiling, availability.

The reconciliation engine answers *"did this plant produce what it should have
this month?"*. This package answers *"why not, and is it getting worse?"*, which
is the paid tier.

Nothing here reimplements a published method. Degradation, soiling and
availability all come from NREL's RdTools, which is peer-reviewed and
industry-validated; this package's job is to feed it the right series, freeze the
assumptions it was run under, and refuse to report a number without its
uncertainty.

    from analytics.trend import refresh_analytics
    refresh_analytics(project_id)          # -> one plant_analytics row

**Import cost is deliberate.** `registry`, `results`, `economics` and `sinks`
import nothing heavier than pandas, so the rules that matter most — the 24-month
guard, the confidence-interval invariant, the NULL-PPA path — are testable
without pulling rdtools' 200 MB dependency tree (matplotlib, plotly, xgboost,
statsmodels, scikit-learn, h5py). `trend` and `telemetry` are resolved lazily
below for the same reason; importing this package does not import rdtools.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from .economics import DEFAULT_PPA_RATE_PER_KWH, resolve_ppa_rate, translate
from .registry import (
    EXCLUDED_SYSTEMS,
    SEED_PROJECTS,
    AnalyticsProject,
    get_project,
    get_project_by_system,
    project_uuid,
)
from .results import (
    METHOD_DISAGREEMENT_THRESHOLD,
    MIN_MONTHS_FOR_DEGRADATION,
    PLAUSIBLE_DEGRADATION_RANGE,
    AnalyticsError,
    AvailabilityResult,
    DegradationResult,
    EconomicTranslation,
    InsufficientHistoryError,
    PlantAnalyticsRow,
    SoilingResult,
)
from .sinks import AnalyticsSink, JsonArtifactSink, MultiSink, SqlSeedSink

if TYPE_CHECKING:                       # for type checkers only; no runtime cost
    from .telemetry import load_series
    from .trend import (
        build_trend_analysis,
        refresh_analytics,
        run_availability,
        run_degradation,
        run_soiling,
    )

_LAZY = {
    "build_trend_analysis": "trend",
    "refresh_analytics": "trend",
    "run_availability": "trend",
    "run_degradation": "trend",
    "run_soiling": "trend",
    "load_series": "telemetry",
}


def __getattr__(name: str):
    """PEP 562 lazy re-export, so `import analytics` stays cheap."""
    module_name = _LAZY.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    import importlib

    module = importlib.import_module(f".{module_name}", __name__)
    return getattr(module, name)


__all__ = [
    # registry
    "AnalyticsProject", "SEED_PROJECTS", "EXCLUDED_SYSTEMS",
    "project_uuid", "get_project", "get_project_by_system",
    # results
    "DegradationResult", "SoilingResult", "AvailabilityResult",
    "EconomicTranslation", "PlantAnalyticsRow",
    "AnalyticsError", "InsufficientHistoryError",
    "MIN_MONTHS_FOR_DEGRADATION", "PLAUSIBLE_DEGRADATION_RANGE",
    "METHOD_DISAGREEMENT_THRESHOLD",
    # economics
    "translate", "resolve_ppa_rate", "DEFAULT_PPA_RATE_PER_KWH",
    # sinks
    "AnalyticsSink", "SqlSeedSink", "JsonArtifactSink", "MultiSink",
    # lazy
    "build_trend_analysis", "run_degradation", "run_soiling",
    "run_availability", "refresh_analytics", "load_series",
]
