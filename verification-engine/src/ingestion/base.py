"""The ingestion interface (spec 21 §2).

Every telemetry source implements `InverterAdapter`. Reconciliation knows this
module and nothing else: it resolves an adapter from `projects.telemetry_source`
through `get_adapter()` and never imports a vendor module. Spec 24 adds
SolarEdge and Enphase by writing an adapter and calling `register()`; no file
downstream of here changes.

Two rules carry most of the weight:

**`ac_power_w` is mandatory.** A frame without it is not a partial success, it
is a failed fetch. Returning one would let a site through the pipeline with no
production leg at all, and the deviation it eventually produces would be
against nothing.

**`interval_minutes` is inferred, never declared.** Vendors that report energy
per interval need the interval to convert to power, and a 15-minute interval
read as hourly inflates production by exactly 4x — silently, with a plausible
shape and a plausible annual total. `infer_interval_minutes()` is the only way
an adapter is allowed to learn it.

Models are dataclasses rather than pydantic: this package already models config
with dataclasses (`verification_engine.config`), the engine has no pydantic
dependency, and a `pd.DataFrame` field needs `arbitrary_types_allowed` anyway.
Validation that pydantic would do by type is done explicitly in `__post_init__`.
"""
from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Protocol, runtime_checkable

import pandas as pd

try:                                    # py3.8+ has Literal in typing
    from typing import Literal
except ImportError:                     # pragma: no cover
    from typing_extensions import Literal  # type: ignore

SourceKind = Literal[
    "pvdaq", "solaredge", "enphase", "fronius", "sma", "manual_csv"
]

#: Every source kind the schema's CHECK constraint accepts. Kept next to the
#: Literal so the two cannot drift apart unnoticed.
SOURCE_KINDS: tuple[str, ...] = (
    "pvdaq", "solaredge", "enphase", "fronius", "sma", "manual_csv",
)

#: The normalized column vocabulary (spec 21 §2.1). Anything an adapter cannot
#: map to one of these names is DROPPED, not passed through — a frame with a
#: vendor-native column in it is a frame the QC layer cannot read.
NORMALIZED_COLUMNS: dict[str, str] = {
    "ac_power_w": "W",
    "dc_power_w": "W",
    "poa_irradiance_wm2": "W/m^2",
    "ghi_wm2": "W/m^2",
    "module_temp_c": "degC",
    "ambient_temp_c": "degC",
    "wind_speed_ms": "m/s",
    "meter_export_wh": "Wh",          # cumulative
}

REQUIRED_COLUMNS: tuple[str, ...] = ("ac_power_w",)


class IngestionError(Exception):
    """Base class for every failure this package raises on purpose."""


class MissingChannelError(IngestionError):
    """A required normalized channel could not be produced for a site.

    Raised by `TelemetryFrame` when a frame arrives without `ac_power_w`, and by
    adapters when a site's channel dictionary does not resolve one. Both are the
    same failure: there is no production leg, so there is nothing to reconcile.
    Skipping the site is correct; substituting a plausible channel is not.
    """


class AdapterNotRegisteredError(IngestionError):
    """No adapter is registered (or importable) for a source kind."""


class IntervalInferenceError(IngestionError):
    """The sampling interval could not be inferred from the data."""


# ── Interval inference ────────────────────────────────────────────────────────

def infer_interval_seconds(index: pd.DatetimeIndex) -> float:
    """Sampling interval in seconds, from the MEDIAN index delta.

    Median, not mode or `index.freq`: real telemetry has dropouts, duplicated
    stamps, and DST seams, and any of those move the mean or defeat
    `pd.infer_freq()` outright. The median survives all three as long as most
    samples are on the nominal grid.

    Raises `IntervalInferenceError` rather than defaulting. There is no safe
    default — see the module docstring on the 4x error.
    """
    idx = pd.DatetimeIndex(index)
    if len(idx) < 2:
        raise IntervalInferenceError(
            f"cannot infer a sampling interval from {len(idx)} sample(s)"
        )
    deltas = pd.Series(idx.sort_values()).diff().dropna()
    deltas = deltas[deltas > pd.Timedelta(0)]        # drop duplicate stamps
    if deltas.empty:
        raise IntervalInferenceError(
            "every timestamp in the index is identical; no interval to infer"
        )
    seconds = float(deltas.median().total_seconds())
    if seconds <= 0:
        raise IntervalInferenceError(f"inferred a non-positive interval: {seconds}s")
    return seconds


def infer_interval_minutes(index: pd.DatetimeIndex) -> int:
    """`infer_interval_seconds` in whole minutes, which is what the schema stores.

    Sub-minute telemetry is real — system 1332 logs every 15 seconds — and
    rounding it to "0 minutes" or "1 minute" here would either divide by zero or
    inflate energy 4x. An adapter that meets sub-minute data must resample it to
    a minute grid and say so in `raw_payload["conversion_applied"]`; this
    function refuses the input rather than absorbing it.
    """
    seconds = infer_interval_seconds(index)
    if seconds < 60:
        raise IntervalInferenceError(
            f"inferred a sub-minute interval ({seconds:.1f}s). `interval_minutes` "
            f"is a whole number of minutes, so the adapter must resample to a "
            f"minute grid before building the frame — rounding here would either "
            f"be a divide-by-zero or a silent {60 / seconds:.0f}x energy error."
        )
    return int(round(seconds / 60.0))


def energy_kwh(power_w: pd.Series, interval_minutes: int) -> float:
    """Integrate instantaneous power (W) over an interval grid into kWh.

    Left-endpoint rectangles: each sample is taken to hold for `interval_minutes`.
    That is the convention PVDAQ, SolarEdge and Enphase all report against, and
    mixing it with a trapezoid would put the two legs of a reconciliation on
    different quadratures.

    NaN is a gap, and a gap contributes nothing — but it is NOT zero production
    either. The caller decides what a gap means by looking at
    `QualityResult.completeness_pct`; this function only refuses to invent
    energy for it.
    """
    if interval_minutes <= 0:
        raise ValueError(f"interval_minutes must be positive, got {interval_minutes}")
    hours = interval_minutes / 60.0
    return float(pd.to_numeric(power_w, errors="coerce").sum(skipna=True) * hours / 1000.0)


def energy_per_interval_to_power_w(
    energy_wh: pd.Series, interval_minutes: int
) -> pd.Series:
    """Convert energy-per-interval (Wh) to mean power over the interval (W).

    For the vendors that report energy rather than power. `interval_minutes`
    must come from `infer_interval_minutes()` on the same index — passing a
    declared value here is the 4x error in its natural habitat.
    """
    if interval_minutes <= 0:
        raise ValueError(f"interval_minutes must be positive, got {interval_minutes}")
    return energy_wh * (60.0 / interval_minutes)


# ── Models ────────────────────────────────────────────────────────────────────

@dataclass
class SiteDescriptor:
    """What an adapter knows about a site before any telemetry is fetched."""

    external_id: str                    # vendor site/system id, ALWAYS a string
    source: SourceKind
    name: str
    latitude: float | None = None
    longitude: float | None = None
    capacity_kw_dc: float | None = None
    tilt_deg: float | None = None
    azimuth_deg: float | None = None
    iana_timezone: str | None = None
    first_data: date | None = None
    last_data: date | None = None
    #: Free-form, adapter-specific. Never read by reconciliation; it exists so a
    #: fetch can explain itself in the audit trail (which store the site lives
    #: in, which channels resolved, what the vendor called them).
    extra: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.external_id = str(self.external_id)


@dataclass
class TelemetryFrame:
    """A normalized telemetry fetch, plus everything needed to audit it.

    Invariants enforced here, not by convention:
      * the index is tz-aware UTC, sorted, and free of duplicate stamps
      * only names from `NORMALIZED_COLUMNS` survive; the rest are dropped
      * `ac_power_w` is present
      * `interval_minutes` is a positive whole number of minutes
    """

    site: SiteDescriptor
    series: pd.DataFrame                # tz-aware UTC index; normalized columns only
    interval_minutes: int               # INFERRED from the data, never hardcoded
    source: SourceKind
    fetched_at: datetime
    raw_payload: dict = field(default_factory=dict)
    #: Names the adapter saw and discarded. Recorded rather than silently
    #: swallowed so "where did that channel go?" has an answer in the artifact.
    dropped_columns: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        df = self.series
        if not isinstance(df, pd.DataFrame):
            raise TypeError(f"series must be a DataFrame, got {type(df).__name__}")
        if not isinstance(df.index, pd.DatetimeIndex):
            raise TypeError("series must be indexed by a DatetimeIndex")
        if df.index.tz is None:
            raise ValueError(
                "series index is naive. A frame that never stated its time "
                "standard is a programmer error, not a UTC frame — see "
                "spec 20 §2.1 and tests/test_time_alignment.py."
            )
        df = df.tz_convert("UTC")
        df = df[~df.index.duplicated(keep="first")].sort_index()

        keep = [c for c in df.columns if c in NORMALIZED_COLUMNS]
        dropped = [c for c in df.columns if c not in NORMALIZED_COLUMNS]
        self.dropped_columns = [*self.dropped_columns, *dropped]
        df = df[keep]

        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            raise MissingChannelError(
                f"{self.site.source}:{self.site.external_id} produced a frame without "
                f"{', '.join(missing)}. Required by spec 21 §2.1 — a frame with no "
                f"production leg cannot be reconciled, so the site is skipped rather "
                f"than ingested. Columns offered: {sorted(keep) or 'none'}; "
                f"dropped as unmapped: {sorted(dropped) or 'none'}."
            )

        if int(self.interval_minutes) != self.interval_minutes or self.interval_minutes <= 0:
            raise ValueError(
                f"interval_minutes must be a positive whole number of minutes, "
                f"got {self.interval_minutes!r}"
            )
        self.interval_minutes = int(self.interval_minutes)
        self.series = df

    # -- convenience -----------------------------------------------------------

    @property
    def ac_power_w(self) -> pd.Series:
        return self.series["ac_power_w"]

    def energy_kwh(self) -> float:
        return energy_kwh(self.ac_power_w, self.interval_minutes)

    def local(self, tz: str | None = None) -> pd.DataFrame:
        """The same frame on the site's wall clock, for calendar-month bucketing.

        Month boundaries are local midnight, not UTC midnight. Bucketing a
        Colorado site on UTC puts seven hours of every month into its neighbour.
        """
        zone = tz or self.site.iana_timezone
        if not zone:
            raise ValueError(
                f"{self.site.source}:{self.site.external_id} has no iana_timezone; "
                "refusing to bucket on a guessed calendar"
            )
        return self.series.tz_convert(zone)


# ── The protocol ──────────────────────────────────────────────────────────────

@runtime_checkable
class InverterAdapter(Protocol):
    """The whole contract. Spec 24's vendors implement exactly this."""

    source: SourceKind

    def list_sites(self) -> list[SiteDescriptor]: ...

    def describe_site(self, external_id: str) -> SiteDescriptor: ...

    def fetch_interval(
        self, external_id: str, start: date, end: date
    ) -> TelemetryFrame: ...

    def native_resolution(self, external_id: str) -> int: ...

    def supports_backfill_years(self) -> float: ...


# ── Registry ──────────────────────────────────────────────────────────────────

ADAPTERS: dict[str, InverterAdapter] = {}

#: Vendor modules that register an adapter on import. `get_adapter()` imports
#: these lazily so orchestration can resolve a source by name without any
#: caller — reconciliation included — importing a vendor module itself.
_ADAPTER_MODULES: dict[str, str] = {
    "pvdaq": "ingestion.pvdaq",
}


def register(adapter: InverterAdapter) -> InverterAdapter:
    """Register an adapter under its own `source`. Idempotent per source."""
    source = getattr(adapter, "source", None)
    if source not in SOURCE_KINDS:
        raise ValueError(
            f"adapter.source must be one of {SOURCE_KINDS}, got {source!r}"
        )
    ADAPTERS[source] = adapter
    return adapter


def get_adapter(source: str) -> InverterAdapter:
    """Resolve the adapter for a `projects.telemetry_source` value."""
    if source in ADAPTERS:
        return ADAPTERS[source]

    module = _ADAPTER_MODULES.get(source)
    if module:
        try:
            importlib.import_module(module)
        except ImportError as exc:      # missing optional dep, not a typo
            raise AdapterNotRegisteredError(
                f"adapter module {module!r} for source {source!r} could not be "
                f"imported: {exc}"
            ) from exc
        if source in ADAPTERS:
            return ADAPTERS[source]

    known = sorted(set(ADAPTERS) | set(_ADAPTER_MODULES))
    raise AdapterNotRegisteredError(
        f"no adapter registered for source {source!r}. Registered or importable: "
        f"{known or 'none'}. Spec 24 adds solaredge and enphase here."
    )
