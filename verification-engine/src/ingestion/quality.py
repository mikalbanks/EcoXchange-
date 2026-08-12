"""Data-quality scoring for ingested telemetry (spec 21 §5).

`raw_readings.data_quality` has been in the schema since 001 and nothing has
ever written it. This module is what writes it: one `assess()` call per
project-month produces the `reading_quality` row and the verdict that
orchestration gates on.

Two judgements are deliberate and go the opposite way from each other:

**Clipping is a note, never a downgrade.** An inverter-limited plant is healthy
and, above DC:AC 1.25, normal. Downgrading on clipping flags the best assets in
the portfolio and teaches everyone to ignore the flag.

**Time misalignment is always `error`.** Energy below the horizon is physically
impossible, so it is never a tolerance question. A misaligned series still has
a plausible shape and a plausible total, which is exactly why it must be
stopped here rather than at reconciliation — spec 20 §2.1 cost a debugging
cycle to the same class of error.

`outliers.zscore` is not used: it defaults to `nan_policy='raise'` and real
gapped telemetry throws immediately. `outliers.hampel` is the robust one.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

import pvanalytics
from pvanalytics.features import clipping, daytime
from pvanalytics.quality import gaps, outliers
from pvanalytics.quality import time as qtime

PVANALYTICS_VERSION: str = pvanalytics.__version__

#: Verdict thresholds (spec 21 §5).
COMPLETENESS_MISSING_PCT = 50.0
COMPLETENESS_PARTIAL_PCT = 90.0
STALE_PARTIAL_FRAC = 0.10
CLIPPING_NOTE_FRAC = 0.15
NIGHT_ENERGY_ERROR_PCT = 1.0

#: How "at the inverter ceiling" is decided when excluding clipped samples from
#: the staleness measure. The 99th percentile rather than the max so one spike
#: cannot lift the bar above the plateau it is supposed to describe.
CLIPPING_CEILING_QUANTILE = 0.99
CLIPPING_CEILING_TOLERANCE = 0.98

QCVerdict = str  # one of: complete | partial | missing | error


@dataclass
class QualityResult:
    """One `reading_quality` row, plus the verdict `raw_readings` carries.

    Field names match the table columns so persistence is a `asdict()` away.
    """

    completeness_pct: float
    night_energy_frac: float            # PERCENT of positive energy below the horizon
    interval_minutes: int
    qc_verdict: QCVerdict
    clipped_frac: float | None = None
    stale_frac: float | None = None
    outlier_frac: float | None = None
    shift_detected: bool = False
    qc_notes: list[str] = field(default_factory=list)
    pvanalytics_version: str = PVANALYTICS_VERSION

    #: `raw_readings.data_quality` uses the same four-value vocabulary as
    #: `qc_verdict`, so the mapping is the identity. It is spelled out rather
    #: than assumed because reconcile() gates on `data_quality` and the two
    #: columns are free to diverge in a later migration.
    @property
    def data_quality(self) -> str:
        return self.qc_verdict

    @property
    def blocks_reconciliation(self) -> bool:
        """`error` and `missing` are not verdicts, they are 'do not reconcile'."""
        return self.qc_verdict in ("error", "missing")

    @property
    def quality_notes(self) -> str | None:
        return "; ".join(self.qc_notes) if self.qc_notes else None


def _freq_alias(interval_minutes: int) -> str:
    return f"{int(interval_minutes)}min"


def _fraction_true(mask) -> float:
    arr = np.asarray(pd.Series(mask).fillna(False), dtype=bool)
    return float(arr.mean()) if arr.size else 0.0


def _night_mask(
    index: pd.DatetimeIndex,
    latitude: float | None,
    longitude: float | None,
    observed_day: np.ndarray,
) -> tuple[np.ndarray, str]:
    """Where the sun is below the horizon — from solar geometry when possible.

    This is the correction that makes the night-energy guard mean anything.
    Spec 21 §5 derives the mask from `daytime.power_or_irradiance`, which infers
    day and night FROM THE SERIES ITSELF. Shift a whole month by seven hours and
    the inferred daylight window shifts with it, so the guard reports ~0% night
    energy on a badly misaligned series — measured, not argued: a +7 h shift of a
    clear-sky Golden CO month scores 0.005%, indistinguishable from the aligned
    original.

    Real solar geometry does not move when the index does, so it catches the
    error the guard exists for. When coordinates are unavailable the observed
    mask is used and the caller says so in `qc_notes`; that path detects a
    within-day anomaly but not a whole-series shift.
    """
    if latitude is None or longitude is None:
        return ~observed_day, "observed"

    import pvlib

    solpos = pvlib.solarposition.get_solarposition(index, latitude, longitude)
    return (solpos["apparent_elevation"] < 0).to_numpy(), "solar_geometry"


def assess(
    ac_power: pd.Series,
    tracking: bool = False,
    interval_minutes: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> QualityResult:
    """Score one project-period of AC power (W, tz-aware index).

    `tracking` is passed through to `clipping.geometric`: a tracked array's
    clear-sky profile is a plateau rather than a peak, and the fixed-tilt
    detector reads that plateau as clipping across the whole day.

    `latitude`/`longitude` drive the night-energy guard off real solar geometry
    — see `_night_mask` for why that is not optional in practice. Adapters have
    the coordinates in `SiteDescriptor`; pass them.
    """
    from .base import infer_interval_minutes   # local: keeps base import-light

    if not isinstance(ac_power.index, pd.DatetimeIndex):
        raise TypeError("assess() needs a DatetimeIndex")
    if ac_power.index.tz is None:
        raise ValueError(
            "assess() needs a tz-aware index; a naive one cannot be checked for "
            "the night-energy signature that this function exists to catch"
        )

    series = pd.to_numeric(ac_power, errors="coerce").sort_index()
    series = series[~series.index.duplicated(keep="first")]
    if interval_minutes is None:
        interval_minutes = infer_interval_minutes(series.index)
    freq = _freq_alias(interval_minutes)

    # Put the series on a complete grid so an absent row is a NaN gap that
    # completeness can see, rather than a row that was never counted.
    #
    # `resample`, not `reindex` onto a `date_range`. A reindexed grid keeps only
    # timestamps that land on it exactly, so a logger with a few seconds of
    # jitter drops nearly everything: measured on a complete clear-sky month at
    # 15-minute sampling with +/-40 s of jitter, reindexing scores 1.4%
    # completeness and resampling scores 74.7%. A jittery logger is a real
    # source; 1.4% would send every one of its months to `missing`.
    #
    # Resampling still loses something — jitter pushes two samples into one bin
    # and leaves the next empty — so the number is a floor, not the truth. That
    # is the right direction for a completeness measure to be wrong in.
    series = series.resample(freq).mean()

    notes: list[str] = []

    completeness = float(gaps.completeness_score(series, freq=freq).mean() * 100.0)

    filled = series.fillna(0.0)         # detectors below need a gap-free input
    is_outlier = outliers.hampel(filled, window=5, max_deviation=3.0)
    is_clipped = clipping.geometric(filled, freq=freq, tracking=tracking)

    # `power_or_irradiance(clipping=<Series>)` is unusable in pvanalytics 0.2.2:
    # daytime.py:224 evaluates `clipping or False`, which raises
    # "truth value of a Series is ambiguous" for every Series it is given. The
    # spec 21 §5 call signature hits it directly. The correction that line
    # intends is `night = ~(clipping | ~night)` — no clipped sample is ever
    # night — so it is applied here instead, against the default (None) call.
    # Ours lands after pvanalytics' edge-of-day correction rather than before
    # it; the direction is the same and the result is strictly conservative,
    # since it can only move samples out of night and never into it.
    observed_day = np.asarray(
        daytime.power_or_irradiance(filled, freq=freq), dtype=bool
    ) | np.asarray(is_clipped, dtype=bool)

    # Staleness is measured on DAYLIGHT samples, minus the clipped ceiling.
    # Overnight a healthy plant reports the same near-zero value for hours, and
    # a clipped plant holds its ceiling for hours: both are flat by physics, and
    # counting either puts a perfectly healthy site over the 10% stale threshold
    # — which would downgrade on clipping through the back door, the thing §5 is
    # explicit that we must not do. Measured on a clear-sky June month at
    # Golden: clipped-at-500 kW scores 55% stale unguarded, 0% guarded.
    #
    # The exclusion is *at the ceiling*, not merely "flagged as clipping".
    # `clipping.geometric` also fires on a channel frozen mid-ramp, and dropping
    # everything it flags would hide exactly the fault this check is for. Same
    # fixture, frozen for five days at a low daytime value: 14% stale, kept.
    clipped_arr = np.asarray(is_clipped, dtype=bool)
    ceiling = float(series.quantile(CLIPPING_CEILING_QUANTILE))
    at_ceiling = (series >= CLIPPING_CEILING_TOLERANCE * ceiling).to_numpy(na_value=False)
    measurable = pd.Series(observed_day & ~(clipped_arr & at_ceiling),
                           index=series.index)
    daylight = series[measurable]
    is_stale = (
        gaps.stale_values_diff(daylight.fillna(0.0), window=6)
        if len(daylight) > 6 else pd.Series(False, index=daylight.index)
    )

    stale_frac = _fraction_true(is_stale)
    outlier_frac = _fraction_true(is_outlier)
    clipped_frac = _fraction_true(is_clipped)

    is_night, night_basis = _night_mask(series.index, latitude, longitude, observed_day)
    positive = series.clip(lower=0)
    total = float(positive.sum(skipna=True))
    night = float(positive[is_night].sum(skipna=True))
    night_frac = night / max(total, 1e-9) * 100.0
    if night_basis == "observed":
        notes.append(
            "night-energy guard ran on the data-derived daylight mask because the "
            "site has no coordinates; it cannot see a whole-series time shift"
        )

    # -- verdict ---------------------------------------------------------------
    if completeness < COMPLETENESS_MISSING_PCT:
        verdict = "missing"
        notes.append(
            f"Completeness {completeness:.1f}% is below {COMPLETENESS_MISSING_PCT:.0f}%; "
            "the period has too little data to reconcile."
        )
    elif completeness < COMPLETENESS_PARTIAL_PCT:
        verdict = "partial"
        notes.append(
            f"Completeness {completeness:.1f}% is below {COMPLETENESS_PARTIAL_PCT:.0f}%."
        )
    else:
        verdict = "complete"

    if stale_frac > STALE_PARTIAL_FRAC:
        if verdict == "complete":
            verdict = "partial"
        notes.append(
            f"{stale_frac * 100:.1f}% of samples are stale (repeated value); "
            "a frozen channel reads as production that did not happen."
        )

    if outlier_frac > 0:
        notes.append(f"{outlier_frac * 100:.2f}% of samples are Hampel outliers.")

    # Note only — never a downgrade. See the module docstring.
    if clipped_frac > CLIPPING_NOTE_FRAC:
        notes.append(
            f"inverter-limited (clipping) on {clipped_frac * 100:.1f}% of samples — "
            "expected above DC:AC 1.25, not a data-quality problem"
        )

    # Always an error, whatever else is true. Ordered last so nothing overrides it.
    if night_frac > NIGHT_ENERGY_ERROR_PCT:
        verdict = "error"
        notes.append(
            f"{night_frac:.2f}% of positive energy falls below the horizon "
            f"(limit {NIGHT_ENERGY_ERROR_PCT:.1f}%). The series is time-misaligned; "
            "it must not be reconciled at any tolerance."
        )

    return QualityResult(
        completeness_pct=round(completeness, 4),
        clipped_frac=round(clipped_frac, 6),
        stale_frac=round(stale_frac, 6),
        outlier_frac=round(outlier_frac, 6),
        night_energy_frac=round(night_frac, 6),
        interval_minutes=int(interval_minutes),
        qc_verdict=verdict,
        qc_notes=notes,
    )


def detect_shifts(
    ac_power: pd.Series,
    latitude: float,
    longitude: float,
    period_min: int = 15,
    shift_min: int = 15,
) -> tuple[bool, list[str]]:
    """Look for a step change in the daily timing of the series (v2 edge case 4).

    An inverter swapped mid-history, or a logger re-clocked, shows up as a
    persistent shift in sunrise/sunset timing against solar geometry.
    `shifts_ruptures` finds the change points; this returns whether any exceeded
    `shift_min` and a human-readable note per segment.

    Deliberately advisory. Sets `reading_quality.shift_detected` and routes to
    human review — it does not auto-flag, because a real inverter replacement is
    an asset event to record, not a verdict about the month's production.
    """
    import pvlib

    if ac_power.index.tz is None:
        raise ValueError("detect_shifts() needs a tz-aware index")

    daily = daytime.power_or_irradiance(ac_power.fillna(0.0))
    # Midpoint of the detected daylight window, in minutes past local midnight.
    local = pd.Series(np.asarray(daily, dtype=bool), index=ac_power.index)
    minutes = local.index.hour * 60 + local.index.minute
    day_key = local.index.normalize()

    frame = pd.DataFrame({"day": day_key, "minute": minutes, "is_day": local.to_numpy()})
    lit = frame[frame["is_day"]]
    if lit.empty:
        return False, ["no daylight detected; shift analysis skipped"]
    observed = lit.groupby("day")["minute"].mean()

    solpos_index = pd.DatetimeIndex(observed.index)
    transit = pvlib.solarposition.sun_rise_set_transit_spa(
        solpos_index, latitude, longitude
    )["transit"]
    reference = (
        transit.dt.tz_convert(ac_power.index.tz).dt.hour * 60
        + transit.dt.tz_convert(ac_power.index.tz).dt.minute
    )

    aligned = pd.DataFrame({"observed": observed.to_numpy(),
                            "reference": reference.to_numpy()},
                           index=solpos_index).dropna()
    if len(aligned) < 30:
        return False, [f"only {len(aligned)} days available; shift analysis skipped"]

    shifted, amount = qtime.shifts_ruptures(
        aligned["observed"], aligned["reference"],
        period_min=period_min, shift_min=shift_min,
    )
    detected = bool(np.asarray(shifted, dtype=bool).any())
    notes: list[str] = []
    if detected:
        magnitudes = pd.Series(np.asarray(amount, dtype=float), index=aligned.index)
        worst = magnitudes.abs().max()
        notes.append(
            f"time shift of up to {worst:.0f} min detected against solar transit; "
            "routed to human review (possible inverter replacement or logger re-clock)"
        )
    return detected, notes
