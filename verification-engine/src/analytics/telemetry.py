"""Assembling the sub-hourly series RdTools needs (spec 22 §4).

Why this module exists at all: **`raw_readings` cannot supply it.**

Spec 21's ingestion fetches sub-hourly frames, integrates each calendar month to
one `kwh_gross`, writes that, and discards the series. RdTools aggregates
internally at `aggregation_freq='D'` and its whole filtering stack — clear-sky
identification, clipping, stale-value and outlier rejection — operates on
sub-daily samples. §4 is explicit that monthly input "destroys the filtering it
depends on". Feeding it 24 monthly totals would not fail; it would return a
number computed from 24 points with none of the filtering that makes the number
mean anything.

So analytics re-fetches through the same adapter registry reconciliation uses.
`get_adapter(source)`, never a vendor import — spec 21 §2's rule holds here
exactly as it does downstream.

The fetch is expensive (months of parquet, or a 1.77 GB CSV) so the assembled
series is cached to `data/analytics_cache/` as parquet. Like
`ingestion/pvdaq.py`'s cache, it holds derived data only and is disposable.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import pandas as pd

from ingestion import assess, get_adapter
from ingestion.base import IngestionError

from .registry import AnalyticsProject

DEFAULT_CACHE = Path(__file__).resolve().parents[2] / "data" / "analytics_cache"


@dataclass
class AssembledSeries:
    """A window of sub-hourly telemetry, plus what happened while assembling it."""

    project_id: str
    series: pd.DataFrame               # tz-aware UTC index, normalized columns
    interval_minutes: int
    window_start: date
    window_end: date
    #: Months fetched successfully and kept.
    months_kept: list[str] = field(default_factory=list)
    #: Months dropped for `qc_verdict == 'error'`, with the verdict's reasons.
    months_qc_excluded: list[dict] = field(default_factory=list)
    #: Months the adapter refused, with the exception that produced each.
    months_unavailable: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def span_months(self) -> float:
        """Calendar span of the surviving data, in months.

        Measured on the data, not the requested window. A request for four years
        that returned eighteen usable months has eighteen months of history, and
        the 24-month degradation guard must see the second number.
        """
        if self.series.empty:
            return 0.0
        delta = self.series.index.max() - self.series.index.min()
        return delta.days / 30.437

    @property
    def n_days(self) -> int:
        if self.series.empty:
            return 0
        return int(self.series.index.normalize().nunique())

    @property
    def has_poa(self) -> bool:
        """Whether a real plane-of-array irradiance channel survived.

        Gates `sensor_analysis` (§2.2): running it without POA is not possible,
        and substituting GHI would silently make it a different analysis.
        """
        return (
            "poa_irradiance_wm2" in self.series.columns
            and self.series["poa_irradiance_wm2"].notna().any()
        )


def _cache_path(project: AnalyticsProject, cache_dir: Path) -> Path:
    return cache_dir / (
        f"{project.telemetry_source}_{project.external_id}_"
        f"{project.window_start:%Y%m}_{project.window_end:%Y%m}.parquet"
    )


def load_series(
    project: AnalyticsProject,
    *,
    cache_dir: Path | str | None = None,
    use_cache: bool = True,
) -> AssembledSeries:
    """Assemble the project's analytics window, month by month.

    QC-error months are excluded (§4). `reading_quality` is not reachable from
    Python — the engine has no database driver, and spec 21's verdicts live in a
    generated `.sql` seed — so the verdict is recomputed here with the same
    `ingestion.quality.assess()` that produced them. Same function, same
    thresholds, same pvanalytics pin, so the answer is the same answer; what it
    is not is a second implementation of the rule.

    Only `error` excludes. `partial` and `missing` are gaps, and a gap is
    something RdTools' filters are built to handle — dropping those months would
    throw away usable history to no purpose. `error` means the series is
    time-misaligned, which is the one fault that produces a plausible wrong
    degradation rate rather than a noisy one.
    """
    cache_dir = Path(cache_dir) if cache_dir else DEFAULT_CACHE
    cache = _cache_path(project, cache_dir)

    adapter = get_adapter(project.telemetry_source)
    periods = pd.period_range(project.window_start, project.window_end, freq="M")

    kept: list[str] = []
    qc_excluded: list[dict] = []
    unavailable: list[dict] = []
    notes: list[str] = []

    if use_cache and cache.exists():
        frame = pd.read_parquet(cache)
        meta_path = cache.with_suffix(".json")
        if meta_path.exists():
            import json

            meta = json.loads(meta_path.read_text())
            kept = meta.get("months_kept", [])
            qc_excluded = meta.get("months_qc_excluded", [])
            unavailable = meta.get("months_unavailable", [])
            notes = meta.get("notes", [])
        notes = [*notes, f"Series read from cache {cache.name}."]
        return AssembledSeries(
            project_id=project.project_id,
            series=frame,
            interval_minutes=_infer_minutes(frame.index),
            window_start=project.window_start,
            window_end=project.window_end,
            months_kept=kept,
            months_qc_excluded=qc_excluded,
            months_unavailable=unavailable,
            notes=notes,
        )

    site = adapter.describe_site(project.external_id)
    tracking = str(site.extra.get("tracking") or "").lower() == "tracking"

    pieces: list[pd.DataFrame] = []
    intervals: set[int] = set()

    for period in periods:
        p_start = period.start_time.date()
        p_end = period.end_time.date()
        try:
            frame = adapter.fetch_interval(project.external_id, p_start, p_end)
        except IngestionError as exc:
            unavailable.append({
                "period": str(period),
                "reason": f"{type(exc).__name__}: {exc}",
            })
            continue
        except Exception as exc:                    # unexpected: keep the type
            unavailable.append({
                "period": str(period),
                "reason": f"{type(exc).__name__}: {exc}",
            })
            continue

        quality = assess(
            frame.ac_power_w,
            tracking=tracking,
            interval_minutes=frame.interval_minutes,
            latitude=site.latitude,
            longitude=site.longitude,
        )
        if quality.qc_verdict == "error":
            qc_excluded.append({
                "period": str(period),
                "qc_verdict": quality.qc_verdict,
                "night_energy_frac": quality.night_energy_frac,
                "qc_notes": list(quality.qc_notes),
            })
            continue

        pieces.append(frame.series)
        intervals.add(frame.interval_minutes)
        kept.append(str(period))

    if not pieces:
        return AssembledSeries(
            project_id=project.project_id,
            series=pd.DataFrame(),
            interval_minutes=0,
            window_start=project.window_start,
            window_end=project.window_end,
            months_qc_excluded=qc_excluded,
            months_unavailable=unavailable,
            notes=[
                f"No usable telemetry in {project.window_start} .. "
                f"{project.window_end}: {len(unavailable)} month(s) unavailable, "
                f"{len(qc_excluded)} excluded by QC."
            ],
        )

    series = pd.concat(pieces).sort_index()
    series = series[~series.index.duplicated(keep="first")]

    if len(intervals) > 1:
        # Not fatal — RdTools interpolates — but it means the sampling rate
        # changed mid-record, and a rate change is the kind of thing that turns
        # out to be a logger replacement with a time shift attached.
        notes.append(
            f"Sampling interval is not constant across the window: "
            f"{sorted(intervals)} minutes seen. RdTools handles the mix, but a "
            f"changed logging rate often accompanies hardware changes worth "
            f"knowing about."
        )
    if qc_excluded:
        notes.append(
            f"{len(qc_excluded)} month(s) excluded for a QC verdict of 'error' "
            f"(time-misaligned; §4): {', '.join(m['period'] for m in qc_excluded)}."
        )
    if unavailable:
        notes.append(
            f"{len(unavailable)} month(s) had no usable telemetry: "
            f"{', '.join(m['period'] for m in unavailable)}."
        )

    assembled = AssembledSeries(
        project_id=project.project_id,
        series=series,
        interval_minutes=min(intervals),
        window_start=project.window_start,
        window_end=project.window_end,
        months_kept=kept,
        months_qc_excluded=qc_excluded,
        months_unavailable=unavailable,
        notes=notes,
    )

    if use_cache:
        import json

        cache.parent.mkdir(parents=True, exist_ok=True)
        series.to_parquet(cache)
        cache.with_suffix(".json").write_text(json.dumps({
            "months_kept": kept,
            "months_qc_excluded": qc_excluded,
            "months_unavailable": unavailable,
            "notes": notes,
        }, indent=2))

    return assembled


def load_subsystem_power(
    project: AnalyticsProject, series: pd.DataFrame
) -> tuple[pd.DataFrame, str]:
    """Per-inverter power for availability, or the site-total fallback.

    Returns `(frame, basis_note)`. Reached through `getattr` rather than a
    protocol method: spec 21's `InverterAdapter` contract is five methods, and
    per-inverter data is not something every vendor publishes. A source without
    it gets a one-column frame and says so — which is honest, and is also the
    documented input shape for a system that reports only aggregate AC power
    (§2.3).
    """
    adapter = get_adapter(project.telemetry_source)
    fetch = getattr(adapter, "fetch_subsystem_power", None)
    if fetch is None:
        return (
            series[["ac_power_w"]].rename(columns={"ac_power_w": "site_total"}),
            f"adapter for {project.telemetry_source!r} publishes no per-inverter "
            f"channels; availability is computed against the site total alone, "
            f"which cannot attribute a loss to a subsystem",
        )

    try:
        frame = fetch(project.external_id, project.window_start, project.window_end)
    except IngestionError as exc:
        return (
            series[["ac_power_w"]].rename(columns={"ac_power_w": "site_total"}),
            f"per-inverter fetch refused ({type(exc).__name__}: {exc}); fell back "
            f"to the site total",
        )

    if frame is None or frame.empty or not len(frame.columns):
        return (
            series[["ac_power_w"]].rename(columns={"ac_power_w": "site_total"}),
            "system publishes no per-inverter AC power channels; availability is "
            "computed against the site total alone",
        )

    aligned = frame.reindex(series.index)
    note = f"{len(aligned.columns)} per-inverter AC power channels"
    dormant = _long_dormant_channels(aligned)
    if dormant:
        # Named, but not all of them. On a 40-inverter site nearly every channel
        # trips this, and pasting forty column names into the note buried the
        # caution itself in a wall of identifiers — the reader skims past the
        # thing the note exists to say.
        shown = ", ".join(dormant[:3])
        if len(dormant) > 3:
            shown += f" and {len(dormant) - 3} other channel(s)"
        note += (
            f". CAUTION — {shown} "
            f"({len(dormant)} of {len(aligned.columns)} in total) "
            f"carries a run of more than 30 days "
            f"with no data at all. Spec 21 §2.11 records that a PVDAQ system's "
            f"available channels change within its own record (1332's "
            f"inv3_ac_power is present through 2016 and absent by mid-2017), so a "
            f"gap that long is ambiguous between an inverter that was offline and "
            f"a channel that stopped being logged. RdTools cannot tell those "
            f"apart: it separates a SYSTEM-level communications dropout from a "
            f"real outage, and this is neither. Lost production attributed to "
            f"that subsystem may be a metadata artifact"
        )
    return aligned, note


def _long_dormant_channels(frame: pd.DataFrame, days: int = 30) -> list[str]:
    """Columns with a contiguous all-missing run longer than `days`.

    Not a filter — the columns are returned to the caller as-is. This exists so
    the note can say which channel the caveat is about, because "some subsystem
    somewhere has a gap" is not something a reader can act on.
    """
    flagged: list[str] = []
    threshold = pd.Timedelta(days=days)
    for column in frame.columns:
        present = frame[column].dropna()
        if present.empty:
            flagged.append(str(column))
            continue
        stamps = present.index
        # Include the window edges: a channel absent for the first two years and
        # present thereafter has its longest gap at the start, not between
        # samples.
        gaps = pd.Series(stamps).diff().max()
        edges = max(
            stamps.min() - frame.index.min(),
            frame.index.max() - stamps.max(),
        )
        if (gaps is not pd.NaT and gaps > threshold) or edges > threshold:
            flagged.append(str(column))
    return flagged


def _infer_minutes(index: pd.Index) -> int:
    if len(index) < 2:
        return 0
    delta = pd.Series(pd.DatetimeIndex(index).sort_values()).diff().median()
    return int(round(delta.total_seconds() / 60.0))
