"""Result models for the analytics module (spec 22 §3, §4).

Dataclasses rather than pydantic, for the reason `ingestion/base.py` already
gives: this package models config with dataclasses, the engine has no pydantic
dependency, and a `pd.DataFrame` field would need `arbitrary_types_allowed`
anyway. Validation pydantic would do by type is done explicitly in
`__post_init__`.

One invariant is enforced here rather than left to the caller: **a degradation
rate is never stored without its confidence interval.** §3 puts it plainly — a
rate without an uncertainty band is not a defensible number, and defensibility is
the entire premise of the paid tier. The database carries the same rule as a
CHECK (migration 014); this is the copy that fails at the point the mistake would
be made, with a message naming what went wrong.

A NULL rate is a legitimate result and needs no bounds: under 24 months there is
nothing meaningful to report, and saying so is the correct output (§4).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime


class AnalyticsError(Exception):
    """Base class for every failure this package raises on purpose."""


class InsufficientHistoryError(AnalyticsError):
    """The record is too short for the analysis requested.

    Raised only where a caller asked for a value that cannot exist. The normal
    path for a short record is a `DegradationResult` with `rate_pct_per_yr=None`
    and a note — a reported absence, not an exception.
    """


#: §4: "YoY degradation compares each point to the same point one year prior;
#: under 24 months it returns nothing meaningful."
MIN_MONTHS_FOR_DEGRADATION = 24.0

#: The band §6.2 calls a bug rather than a finding, for crystalline silicon.
#: Applied as a reported check, never as a filter — a rate outside it is
#: surfaced with its evidence, not dropped or clamped.
PLAUSIBLE_DEGRADATION_RANGE = (-2.5, -0.2)

#: §2.2: disagreement beyond this between clearsky and sensor "is itself a
#: diagnostic and should be surfaced, not averaged away."
METHOD_DISAGREEMENT_THRESHOLD = 0.5

#: Annual soiling losses above this are real only in specific circumstances — a
#: desert site with no cleaning programme, or heavy local industrial or
#: agricultural dust. Elsewhere a large SRR result is usually the method
#: recognising something that is not soiling.
#:
#: The mechanism matters, because it is not obvious: SRR looks for gradual
#: decline followed by abrupt recovery. Any process with that shape reads as
#: soiling. Snow cover and melt has it. So does weather itself, if the
#: normalization has not successfully removed it — a run of cloudy days followed
#: by a clear one is a decline and a recovery. That makes an unfiltered or
#: weakly-filtered series prone to reporting large "soiling" that is entirely
#: meteorological, and the result looks perfectly well-formed when it does.
PLAUSIBLE_SOILING_MAX_PCT = 6.0


@dataclass
class DegradationResult:
    """A year-on-year degradation rate, or a stated reason there is not one."""

    project_id: str
    method: str                             # 'clearsky' | 'sensor'
    window_start: date
    window_end: date
    n_days_analyzed: int
    #: Percent per year. Negative means losing output. None where the record is
    #: under 24 months — never a point estimate in that case.
    rate_pct_per_yr: float | None = None
    ci_low: float | None = None             # 2.5th percentile
    ci_high: float | None = None            # 97.5th percentile
    #: The confidence level actually requested of RdTools. Recorded because the
    #: library's default is 68.2, not 95, and a band stored under the wrong label
    #: is exactly the kind of quiet error this module exists to avoid.
    confidence_level: float = 95.0
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.method not in ("clearsky", "sensor"):
            raise ValueError(
                f"degradation method must be 'clearsky' or 'sensor', got "
                f"{self.method!r}"
            )
        if self.rate_pct_per_yr is not None and (
            self.ci_low is None or self.ci_high is None
        ):
            raise ValueError(
                f"degradation rate {self.rate_pct_per_yr:.3f} %/yr was produced "
                f"without a confidence interval (low={self.ci_low}, "
                f"high={self.ci_high}). Spec 22 §3: a rate with no uncertainty "
                f"band is not a defensible number, and it is the number most "
                f"likely to end up in a warranty claim. Fix the caller rather "
                f"than relaxing this — RdTools always returns "
                f"`rd_confidence_interval` alongside `p50_rd`."
            )
        if (
            self.ci_low is not None
            and self.ci_high is not None
            and self.ci_low > self.ci_high
        ):
            raise ValueError(
                f"confidence bounds are inverted: low={self.ci_low} > "
                f"high={self.ci_high}. An inverted interval still reads as "
                f"well-formed downstream."
            )

    @property
    def reported(self) -> bool:
        """Whether this carries a rate at all."""
        return self.rate_pct_per_yr is not None

    @property
    def within_plausible_range(self) -> bool | None:
        """Whether the rate sits inside §6.2's sanity band. None if no rate.

        A property, not a gate. §6.2 calls anything outside "a bug, not a
        finding" — but that judgement belongs to a reader looking at the
        evidence, and for at least one seed system the evidence points the other
        way. Nothing in this module drops or clamps a rate on this basis.
        """
        if self.rate_pct_per_yr is None:
            return None
        low, high = PLAUSIBLE_DEGRADATION_RANGE
        return low <= self.rate_pct_per_yr <= high

    def to_dict(self) -> dict:
        return _serializable(asdict(self))


@dataclass
class SoilingResult:
    """An SRR soiling result, or a stated finding of no soiling signal.

    RdTools reports a soiling **ratio** (0.98 = 2% loss); the schema stores a
    **loss percentage**. `trend.py` does the conversion, which inverts the bound
    order — see the note there. This model holds both so the artifact can show
    the number RdTools actually produced alongside the number stored.
    """

    project_id: str
    method: str
    window_start: date
    window_end: date
    #: None where SRR found no soiling signal. §6.4: that is a legitimate result
    #: for many sites and must be recorded rather than forced to a number.
    loss_pct: float | None = None
    ci_low: float | None = None
    ci_high: float | None = None
    ratio: float | None = None
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if (
            self.ci_low is not None
            and self.ci_high is not None
            and self.ci_low > self.ci_high
        ):
            raise ValueError(
                f"soiling loss bounds are inverted: low={self.ci_low} > "
                f"high={self.ci_high}. RdTools reports a RATIO confidence "
                f"interval and this field stores a LOSS interval, so the bounds "
                f"swap on conversion: loss_low comes from ratio_high. Carrying "
                f"them across in order produces exactly this."
            )

    @property
    def signal_found(self) -> bool:
        return self.loss_pct is not None

    @property
    def implausibly_large(self) -> bool:
        """Whether the loss is too large to take at face value.

        A property, not a filter. The result is reported either way; this exists
        so the report can say "treat this as a flag that something is wrong,
        not as a cleaning budget."
        """
        return (
            self.loss_pct is not None
            and self.loss_pct > PLAUSIBLE_SOILING_MAX_PCT
        )

    def to_dict(self) -> dict:
        return _serializable(asdict(self))


@dataclass
class AvailabilityResult:
    """Uptime and lost production over a window, rolled up monthly."""

    project_id: str
    window_start: date
    window_end: date
    availability_pct: float | None = None
    lost_production_kwh: float | None = None
    #: Genuine outages only. RdTools separates these from communication
    #: interruptions; a comms dropout costs nothing and is not counted.
    outage_count: int | None = None
    #: 'metered' where a real cumulative energy channel backed the analysis,
    #: 'derived_from_power' where it was integrated from the same power series.
    #: The distinction is load-bearing, not bookkeeping: the comms-vs-real split
    #: depends on a meter that keeps counting through a dropout, and a derived
    #: cumulative goes NaN exactly when the power does. Every figure built on a
    #: derived cumulative is labelled wherever it is shown.
    basis: str = "derived_from_power"
    #: Per-period rollup: [{period, availability_pct, lost_production_kwh}, ...]
    monthly: list[dict] = field(default_factory=list)
    #: How many independent power channels the analysis actually saw. 1 means
    #: the site-total fallback, which cannot attribute a loss to a subsystem.
    n_subsystems: int = 1
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.basis not in ("metered", "derived_from_power"):
            raise ValueError(
                f"availability basis must be 'metered' or "
                f"'derived_from_power', got {self.basis!r}"
            )

    @property
    def reported(self) -> bool:
        return self.availability_pct is not None

    def to_dict(self) -> dict:
        return _serializable(asdict(self))


@dataclass
class EconomicTranslation:
    """§4.1 — the number an owner acts on is dollars, not percent."""

    ppa_rate_per_kwh: float
    #: 'cited' where projects.ppa_rate_per_kwh was set, 'estimated' where the
    #: stated default stood in. Cited-vs-estimated discipline applies here as
    #: everywhere: an estimated rate makes every dollar figure downstream an
    #: estimate, and it is labelled as one on the report.
    basis: str
    soiling_loss_usd: float | None = None
    availability_loss_usd: float | None = None
    expected_annual_kwh: float | None = None
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.basis not in ("cited", "estimated"):
            raise ValueError(
                f"ppa rate basis must be 'cited' or 'estimated', got "
                f"{self.basis!r}"
            )

    def to_dict(self) -> dict:
        return _serializable(asdict(self))


@dataclass
class PlantAnalyticsRow:
    """One `plant_analytics` row, assembled from the three analyses.

    Mirrors migration 014 column for column. `refresh_analytics()` produces one
    of these per (project, method) and hands it to a sink.
    """

    id: str
    project_id: str
    as_of_date: date
    window_start: date
    window_end: date

    degradation_pct_per_yr: float | None
    degradation_ci_low: float | None
    degradation_ci_high: float | None
    degradation_method: str

    soiling_loss_pct: float | None
    soiling_ci_low: float | None
    soiling_ci_high: float | None
    soiling_ratio: float | None

    availability_pct: float | None
    lost_production_kwh: float | None
    outage_count: int | None

    ppa_rate_per_kwh: float | None
    soiling_loss_usd: float | None
    availability_loss_usd: float | None

    n_days_analyzed: int
    rdtools_version: str
    engine_version: str
    computed_at: datetime

    # -- carried into the artifact, not into the table -------------------------
    #: Everything a reader needs that the columns cannot hold: the window
    #: rationale, the normalization inputs frozen for this row, the PPA and
    #: availability bases, the pre-run caveats, and any method disagreement.
    provenance: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.degradation_pct_per_yr is not None and (
            self.degradation_ci_low is None or self.degradation_ci_high is None
        ):
            raise ValueError(
                f"project {self.project_id}: a degradation rate is being written "
                f"without confidence bounds. Migration 014 has the same rule as a "
                f"CHECK; this raises first so the failure names the row rather "
                f"than arriving as a constraint violation on load."
            )

    def to_dict(self) -> dict:
        return _serializable(asdict(self))


def _serializable(obj):
    """Dates, datetimes and NaN-free floats, for JSON and SQL alike."""
    if isinstance(obj, dict):
        return {k: _serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_serializable(v) for v in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, float) and obj != obj:      # NaN
        # NaN is not JSON, and `json.dumps` emits a bare `NaN` that most parsers
        # reject. An absent number is None here.
        return None
    return obj
