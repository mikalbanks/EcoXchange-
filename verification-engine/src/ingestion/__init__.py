"""Telemetry ingestion (spec 21).

One interface, many sources. `base` defines the contract every adapter
implements; `pvdaq` is the first implementation; `quality` scores what comes
back. Reconciliation depends on `base` only — it must never import a vendor
module, or the next vendor becomes a reconciliation change.

    from ingestion import get_adapter
    frame = get_adapter("pvdaq").fetch_interval("1332", date(2018, 6, 1),
                                                date(2018, 6, 30))
    verdict = assess(frame.series["ac_power_w"])
"""
from __future__ import annotations

from .base import (
    ADAPTERS,
    AdapterNotRegisteredError,
    InverterAdapter,
    MissingChannelError,
    NORMALIZED_COLUMNS,
    REQUIRED_COLUMNS,
    SiteDescriptor,
    SourceKind,
    TelemetryFrame,
    energy_kwh,
    energy_per_interval_to_power_w,
    get_adapter,
    infer_interval_minutes,
    infer_interval_seconds,
    register,
)
from .quality import (
    PVANALYTICS_VERSION,
    QualityResult,
    assess,
    detect_shifts,
)

__all__ = [
    "ADAPTERS",
    "AdapterNotRegisteredError",
    "InverterAdapter",
    "MissingChannelError",
    "NORMALIZED_COLUMNS",
    "PVANALYTICS_VERSION",
    "QualityResult",
    "REQUIRED_COLUMNS",
    "SiteDescriptor",
    "SourceKind",
    "TelemetryFrame",
    "assess",
    "detect_shifts",
    "energy_kwh",
    "energy_per_interval_to_power_w",
    "get_adapter",
    "infer_interval_minutes",
    "infer_interval_seconds",
    "register",
]
