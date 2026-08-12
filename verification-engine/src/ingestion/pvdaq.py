"""NREL PVDAQ adapter (spec 21 §3).

Real telemetry, today, with no credentials and no sales cycle. Everything here
reads the public `oedi-data-lake` bucket anonymously.

What the lake actually looks like
---------------------------------
Spec 21 §3.3 describes one time-series layout. There are two, and the split
does not follow the systems index:

  ``partitioned``  ``pvdaq/parquet/pvdata/system_id={id}/year=/month=/day=``
                   Long format, one small parquet per day, 157 systems.
                   Seeds 1332 and 4902 live here.

  ``data_prize``   ``pvdaq/2023-solar-data-prize/{id}_OEDI/data/*.csv``
                   Wide CSVs, one row per timestamp, no date partitioning.
                   Seeds 9069 and 2107 live here, and ONLY here — neither has
                   a single object under ``parquet/pvdata`` or ``csv/pvdata``,
                   despite the index advertising 7.8 and 7.9 years of record.

Because ``data_prize`` is not partitioned by date, a one-month fetch costs the
same as a seven-year fetch (9069's AC file is 1.77 GB). `fetch_interval` on that
store therefore materializes the site-total series once into `cache_dir` and
slices it thereafter. `cache_dir` holds derived data only and is disposable.

Metric resolution (§3.4, corrected)
-----------------------------------
§3.4 sends metric resolution to
``csv/system_metadata/{id}_system_metadata.json``. That file carries System,
Site, Mount, Inverters, Modules, Meters and Other Instruments — and no metric
ids at all, for any system. It cannot resolve a channel.

The dictionary is ``pvdaq/parquet/metrics/``, which is **per system**:
``metrics__system_{id}__part000.parquet``, 160 files. The spec's "14 rows, all
for ``system_id=10``" is one of those files read as though it were the whole
table. System 1332 resolves there in full — sensor name, common name, raw
units, canonical units and a scale factor, for each of its 22 metric ids.

The one rule §3.4 gets exactly right is the important one: **never default a
metric id**. A wrong channel produces plausible wrong numbers, which is the
failure class that cost a debugging cycle in spec 20 §2.1. Every unresolved or
ambiguous case below raises and the caller skips the system.
"""
from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import numpy as np
import pandas as pd

from .base import (
    IngestionError,
    MissingChannelError,
    SiteDescriptor,
    TelemetryFrame,
    infer_interval_minutes,
    infer_interval_seconds,
    register,
)

BUCKET = "oedi-data-lake"
SYSTEMS_INDEX = f"{BUCKET}/pvdaq/csv/systems_20250729.csv"
PVDATA_ROOT = f"{BUCKET}/pvdaq/parquet/pvdata"
METRICS_ROOT = f"{BUCKET}/pvdaq/parquet/metrics"
PRIZE_ROOT = f"{BUCKET}/pvdaq/2023-solar-data-prize"

DEFAULT_CACHE = Path(__file__).resolve().parents[2] / "data" / "pvdaq_cache"

#: Multipliers onto watts. A unit not in here is not a power unit, whatever the
#: dictionary's `common_name` says — 4902 labels four cumulative kWh and kVARh
#: channels "AC power".
POWER_UNITS_TO_W: dict[str, float] = {"W": 1.0, "kW": 1e3, "MW": 1e6}
ENERGY_UNITS_TO_WH: dict[str, float] = {"Wh": 1.0, "kWh": 1e3, "MWh": 1e6}

#: A converted AC power series may not exceed this multiple of the site's DC
#: nameplate, in either direction. Guards against a units convention that
#: changed under a stable dictionary — see `ImplausibleMagnitudeError`.
MAX_AC_TO_DC_RATIO = 1.5

#: PVDAQ writes missing samples as a sentinel VALUE rather than a null, and the
#: sentinel is negative and enormous. Whole days of system 4902 read -999 (all
#: of June 2015; May 2015, April and October 2016), and system 1332's voltage
#: and current channels sit at -7999 for entire files. Read as measurements they
#: are catastrophic and invisible at once: June 2015 for 4902 integrates to
#: -520 MWh on a 271 kW plant, and — worse — the month still looks 100%
#: COMPLETE to the QC layer, because a sentinel is a value where a gap is not.
#: Masking them to NaN is what turns the fault back into the gap it is.
#:
#: Matched exactly, not by threshold: the overnight tare draw at these sites is a
#: genuine -5 to -8 kW, and a threshold wide enough to be safe would swallow it.
MISSING_VALUE_SENTINELS: tuple[float, ...] = (-999.0, -7999.0, -9999.0, -99999.0)


class MetricResolutionError(IngestionError):
    """A site's channel dictionary does not yield an unambiguous AC power leg."""


class ImplausibleMagnitudeError(IngestionError):
    """Converted AC power is impossible for the site's nameplate.

    Raised, not clamped or rescaled. Observed on system 1332 from 2021: the
    metrics dictionary still declares `raw_units=kW, calc_scale=1000`, but the
    stored values are already in watts, so dictionary-driven conversion yields a
    501 MW peak on a 1.15 MW plant. Guessing which years need the scale and
    which do not is exactly the silent-wrong-number failure this package is
    built to avoid, so the affected period is skipped and reported.
    """


class TelemetryUnavailableError(IngestionError):
    """The site exists in the index but has no time-series objects in the lake."""


# ── S3 ────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _fs():
    import s3fs

    return s3fs.S3FileSystem(anon=True)


# ── Systems index ─────────────────────────────────────────────────────────────

def _circular_mean_deg(values: pd.Series, weights: pd.Series) -> float | None:
    """Weighted circular mean of azimuths, or None when the answer is degenerate.

    Arrays that face opposite ways (NIST_Canopy_1: 90° and 270°) have no mean
    orientation. The arithmetic answer, 180°, is due south and describes neither
    array. None is the honest result; a site that needs one azimuth and cannot
    have one is a site to model per-array.
    """
    w = weights.to_numpy(dtype=float)
    rad = np.deg2rad(values.to_numpy(dtype=float))
    x = float(np.sum(w * np.cos(rad)))
    y = float(np.sum(w * np.sin(rad)))
    if np.hypot(x, y) < 1e-6 * max(float(np.sum(w)), 1e-9):
        return None
    return float(np.rad2deg(np.arctan2(y, x)) % 360.0)


@lru_cache(maxsize=1)
def load_systems_index() -> pd.DataFrame:
    """The 1,862-row systems index, deduplicated to one row per system.

    Systems appear on several rows when their arrays differ in tilt or azimuth.
    The index carries only a system-total `dc_capacity_kW`, repeated on each
    row, so a DC weighting has nothing to discriminate with and collapses to the
    unweighted mean — the weights are kept in the call so a future per-array
    capacity column changes the numbers without changing the code.
    """
    fs = _fs()
    with fs.open(SYSTEMS_INDEX) as fh:
        raw = pd.read_csv(fh)
    raw = raw[[c for c in raw.columns if not re.match(r"^Unnamed", str(c))]]

    rows = []
    for system_id, group in raw.groupby("system_id", sort=True):
        head = group.iloc[0].to_dict()
        weights = group["dc_capacity_kW"].astype(float).fillna(0.0)
        if float(weights.sum()) <= 0:
            weights = pd.Series(1.0, index=group.index)

        tilt = group["tilt"].astype(float)
        if tilt.notna().any():
            mask = tilt.notna()
            head["tilt"] = float(
                np.average(tilt[mask].to_numpy(), weights=weights[mask].to_numpy())
            )
        else:
            head["tilt"] = np.nan

        az = group["azimuth"].astype(float)
        head["azimuth"] = (
            _circular_mean_deg(az[az.notna()], weights[az.notna()])
            if az.notna().any() else None
        )
        head["n_index_rows"] = len(group)
        # Keep what was merged. 1332's two rows are 16.77° and 60°, so its
        # merged 38.4° describes neither array; a reader needs to see that
        # rather than a single number that looks measured.
        head["tilt_rows"] = [_none_if_nan(v) for v in group["tilt"].astype(float)]
        head["azimuth_rows"] = [_none_if_nan(v) for v in group["azimuth"].astype(float)]
        rows.append(head)

    out = pd.DataFrame(rows).set_index("system_id", drop=False)
    out.index = out.index.astype(int)
    return out


# ── Timezone ──────────────────────────────────────────────────────────────────

#: Standard-time UTC offset (hours west) -> IANA zone, for US systems. Used only
#: when the index gives a bare number, and only after the longitude cross-check
#: below agrees. Arizona keeps mountain standard time year-round and so cannot
#: share America/Denver; it is resolved from `site_location` before this table.
_OFFSET_TO_IANA: dict[int, str] = {
    5: "America/New_York",
    6: "America/Chicago",
    7: "America/Denver",
    8: "America/Los_Angeles",
    9: "America/Anchorage",
    10: "Pacific/Honolulu",
}
_STATE_OVERRIDES: dict[str, str] = {"AZ": "America/Phoenix"}
#: How far the zone's standard offset may sit from `-longitude/15` before the
#: pairing is rejected. One hour of longitude is 15°, and zone borders routinely
#: run a full hour off solar time (Georgia at -83.7° keeps UTC-5), so the band
#: has to be wide enough to admit those and narrow enough to reject a swap.
_OFFSET_LONGITUDE_TOLERANCE_H = 1.75


class TimezoneResolutionError(IngestionError):
    """The site's timezone field could not be turned into a validated IANA zone."""


def resolve_iana_timezone(
    raw_value, longitude: float | None, site_location: str | None = None
) -> tuple[str, str]:
    """Return (IANA zone, how it was derived).

    Spec 21 §3.1 describes `timezone_or_utc_offset` as an IANA string. For three
    of the four seed systems it is not: 1332 and 9069 carry the bare integers 7
    and 5, and 2107 carries `PST8PDT`. So the field is parsed three ways and,
    where it is a number, cross-checked against the site's longitude — a
    plausible-looking zone that disagrees with where the site physically is
    raises rather than being accepted, since a wrong zone shifts every monthly
    bucket boundary without ever looking wrong.
    """
    text = "" if raw_value is None else str(raw_value).strip()

    if text:
        try:                                   # already a zone key (incl. PST8PDT)
            ZoneInfo(text)
            return text, "index_iana_string"
        except (ZoneInfoNotFoundError, ValueError):
            pass

    try:
        offset_west = int(round(float(text)))
    except (TypeError, ValueError):
        raise TimezoneResolutionError(
            f"timezone field {raw_value!r} is neither an IANA zone nor a UTC offset"
        ) from None

    state = None
    if site_location:
        match = re.search(r"\b([A-Z]{2})\b\s*$", site_location.strip())
        state = match.group(1) if match else None
    if state in _STATE_OVERRIDES:
        return _STATE_OVERRIDES[state], f"state_override:{state}"

    zone = _OFFSET_TO_IANA.get(offset_west)
    if zone is None:
        raise TimezoneResolutionError(
            f"UTC offset {offset_west} has no US IANA zone in the lookup table"
        )
    if longitude is not None and np.isfinite(longitude):
        solar_offset = -float(longitude) / 15.0
        if abs(solar_offset - offset_west) > _OFFSET_LONGITUDE_TOLERANCE_H:
            raise TimezoneResolutionError(
                f"declared UTC offset {offset_west}h disagrees with longitude "
                f"{longitude:.3f}° (solar offset {solar_offset:.2f}h); refusing to "
                f"bucket months on {zone}"
            )
    return zone, f"utc_offset_{offset_west}_validated_against_longitude"


# ── Channel dictionary (partitioned store) ────────────────────────────────────

@dataclass(frozen=True)
class ChannelPlan:
    """How to build one normalized column out of one or more metric ids."""

    column: str                 # normalized name
    metric_ids: tuple[int, ...]
    scale: float                # multiply raw `value` by this to reach the unit
    combine: str                # "single" | "sum"
    detail: str                 # human-readable provenance for raw_payload


@lru_cache(maxsize=64)
def load_metrics(system_id: int) -> pd.DataFrame:
    """The per-system channel dictionary. See the module docstring on §3.4."""
    fs = _fs()
    path = f"{METRICS_ROOT}/metrics__system_{system_id}__part000.parquet"
    if not fs.exists(path):
        raise MetricResolutionError(
            f"system {system_id} has no metrics dictionary at {path}; without it a "
            f"metric id cannot be resolved and must not be guessed"
        )
    with fs.open(path) as fh:
        return pd.read_parquet(fh)


_INVERTER_NAME = re.compile(r"^inv[_\d]", re.I)
_SITE_TOTAL_NAME = re.compile(r"(^|_)(metered|total)", re.I)
_METER_NAME = re.compile(r"meter", re.I)


def _power_candidates(metrics: pd.DataFrame) -> pd.DataFrame:
    ac = metrics[metrics["common_name"].astype(str).str.strip() == "AC power"].copy()
    ac["_unit_scale"] = ac["units"].astype(str).str.strip().map(POWER_UNITS_TO_W)
    return ac[ac["_unit_scale"].notna()]


def _role(row: pd.Series) -> str:
    source = str(row.get("source_type") or "").strip().upper()
    name = str(row.get("sensor_name") or "")
    if _SITE_TOTAL_NAME.search(name) and not _METER_NAME.search(name.replace("metered", "")):
        return "site_total"
    if source == "INVERTER" or _INVERTER_NAME.match(name):
        return "inverter"
    if source == "METER" or _METER_NAME.search(name):
        return "meter"
    return "other"


def resolve_ac_power(system_id: int, present_ids: set[int]) -> ChannelPlan:
    """Pick the site's AC power channel(s), or raise.

    `present_ids` is what the fetched data actually contains, which is not what
    the dictionary contains: 1332 declares `inv_total_ac_power` (2654) and
    `dc_power` (2655) as calculated channels that appear in no data file, and
    drops `inv3_ac_power` (2650) partway through the record. Resolving against
    the dictionary alone would pick a channel with no rows, or silently sum two
    of three inverters and under-report the site by a third.

    Order of preference:
      1. a single site-level total channel (`metered_ac_power`, `*_total_*`)
      2. the sum of the per-inverter channels — but only if EVERY inverter
         channel in the dictionary is present in the data
      3. a single revenue-meter channel, noted as such
    Anything else raises.
    """
    metrics = load_metrics(system_id)
    candidates = _power_candidates(metrics)
    if candidates.empty:
        raise MetricResolutionError(
            f"system {system_id}: no AC power metric with a power unit in the "
            f"dictionary (units seen: "
            f"{sorted(set(metrics['units'].astype(str)))})"
        )
    candidates = candidates.assign(_role=candidates.apply(_role, axis=1))
    available = candidates[candidates["metric_id"].astype(int).isin(present_ids)]

    def _scale_of(rows: pd.DataFrame) -> float:
        scales = {float(s) * float(c) for s, c in
                  zip(rows["_unit_scale"], rows["calc_scale"].fillna(1.0))}
        if len(scales) != 1:
            raise MetricResolutionError(
                f"system {system_id}: AC power channels disagree on scaling "
                f"({scales}); refusing to sum channels in mixed units"
            )
        return scales.pop()

    totals = available[available["_role"] == "site_total"]
    if len(totals) == 1:
        row = totals.iloc[0]
        return ChannelPlan(
            column="ac_power_w",
            metric_ids=(int(row["metric_id"]),),
            scale=_scale_of(totals),
            combine="single",
            detail=f"site total channel {row['sensor_name']} "
                   f"({row['raw_units']}->W, metric_id={int(row['metric_id'])})",
        )
    if len(totals) > 1:
        raise MetricResolutionError(
            f"system {system_id}: {len(totals)} site-total AC power channels "
            f"({list(totals['sensor_name'])}); ambiguous, not defaulting"
        )

    declared_inverters = candidates[candidates["_role"] == "inverter"]
    if not declared_inverters.empty:
        present_inverters = declared_inverters[
            declared_inverters["metric_id"].astype(int).isin(present_ids)
        ]
        missing = sorted(
            set(declared_inverters["sensor_name"]) - set(present_inverters["sensor_name"])
        )
        if missing:
            raise MetricResolutionError(
                f"system {system_id}: inverter AC power channels {missing} are in "
                f"the dictionary but absent from the data. Summing the remaining "
                f"{len(present_inverters)} would under-report the site by roughly "
                f"{len(missing)}/{len(declared_inverters)} and still look plausible."
            )
        return ChannelPlan(
            column="ac_power_w",
            metric_ids=tuple(sorted(int(i) for i in present_inverters["metric_id"])),
            scale=_scale_of(present_inverters),
            combine="sum" if len(present_inverters) > 1 else "single",
            detail=f"sum of {len(present_inverters)} inverter AC power channels "
                   f"({list(present_inverters['sensor_name'])})",
        )

    meters = available[available["_role"] == "meter"]
    if len(meters) == 1:
        row = meters.iloc[0]
        return ChannelPlan(
            column="ac_power_w",
            metric_ids=(int(row["metric_id"]),),
            scale=_scale_of(meters),
            combine="single",
            detail=f"revenue-meter channel {row['sensor_name']} — NOT the inverter "
                   f"leg; the AC power series is metered export "
                   f"(metric_id={int(row['metric_id'])})",
        )

    raise MetricResolutionError(
        f"system {system_id}: could not resolve ac_power_w. Candidates in the "
        f"dictionary: {list(candidates['sensor_name'])}; present in data: "
        f"{sorted(present_ids & set(candidates['metric_id'].astype(int)))}"
    )


def resolve_optional_channels(system_id: int, present_ids: set[int]) -> list[ChannelPlan]:
    """Best-effort mapping of the non-required vocabulary (§2.1).

    Optional means optional: anything whose unit or identity is not unambiguous
    is dropped rather than guessed. 4902's pyranometers report millivolts, so
    they never become `ghi_wm2`; its reference cell reports W/m² and does.
    """
    metrics = load_metrics(system_id)
    plans: list[ChannelPlan] = []

    def add(subset: pd.DataFrame, column: str, unit_map: dict[str, float]) -> None:
        subset = subset.copy()
        subset["_unit_scale"] = subset["units"].astype(str).str.strip().map(unit_map)
        subset = subset[subset["_unit_scale"].notna()]
        subset = subset[subset["metric_id"].astype(int).isin(present_ids)]
        if len(subset) != 1:               # 0 = absent, >1 = ambiguous; both drop
            return
        row = subset.iloc[0]
        plans.append(ChannelPlan(
            column=column,
            metric_ids=(int(row["metric_id"]),),
            scale=float(row["_unit_scale"]) * float(row["calc_scale"] or 1.0),
            combine="single",
            detail=f"{row['sensor_name']} ({row['raw_units']})",
        ))

    common = metrics["common_name"].astype(str).str.strip()
    name = metrics["sensor_name"].astype(str)
    source = metrics["source_type"].astype(str).str.upper()
    identity = {"C": 1.0, "degC": 1.0}
    add(metrics[common == "DC power"], "dc_power_w", POWER_UNITS_TO_W)
    add(metrics[common == "Irradiance POA"], "poa_irradiance_wm2", {"W/m^2": 1.0})
    add(metrics[common == "Irradiance GHI"], "ghi_wm2", {"W/m^2": 1.0})
    add(metrics[common == "Temperature module"], "module_temp_c", identity)
    add(metrics[common == "Temperature ambient"], "ambient_temp_c", identity)
    # 4902 files its anemometer under common_name "AC other". Match on the unit
    # and the sensor name instead of trusting the label.
    add(metrics[name.str.contains("wind", case=False) & (metrics["units"] == "m/s")],
        "wind_speed_ms", {"m/s": 1.0})
    add(metrics[(common == "AC energy") & (source == "METER")],
        "meter_export_wh", ENERGY_UNITS_TO_WH)
    return plans


# ── Adapter ───────────────────────────────────────────────────────────────────

class PVDAQAdapter:
    """`InverterAdapter` over the public NREL PVDAQ lake."""

    source = "pvdaq"

    def __init__(self, cache_dir: Path | str | None = None, max_workers: int = 8):
        self.cache_dir = Path(cache_dir) if cache_dir else DEFAULT_CACHE
        self.max_workers = max_workers

    # -- discovery -------------------------------------------------------------

    def list_sites(self) -> list[SiteDescriptor]:
        index = load_systems_index()
        sites: list[SiteDescriptor] = []
        for system_id in index.index:
            try:
                sites.append(self.describe_site(str(system_id)))
            except IngestionError:
                # A site we cannot describe honestly is a site we do not list.
                continue
        return sites

    def describe_site(self, external_id: str) -> SiteDescriptor:
        row = self._row(external_id)
        longitude = _opt_float(row.get("longitude"))
        zone, derivation = resolve_iana_timezone(
            row.get("timezone_or_utc_offset"), longitude, row.get("site_location")
        )
        store = self._store(int(external_id))
        return SiteDescriptor(
            external_id=str(external_id),
            source="pvdaq",
            name=str(row.get("system_public_name") or f"PVDAQ system {external_id}"),
            latitude=_opt_float(row.get("latitude")),
            longitude=longitude,
            capacity_kw_dc=_opt_float(row.get("dc_capacity_kW")),
            tilt_deg=_opt_float(row.get("tilt")),
            azimuth_deg=_opt_float(row.get("azimuth")),
            iana_timezone=zone,
            first_data=_opt_date(row.get("first_timestamp")),
            last_data=_opt_date(row.get("last_timestamp")),
            extra={
                "store": store,
                "tilt_rows": row.get("tilt_rows"),
                "azimuth_rows": row.get("azimuth_rows"),
                "site_location": row.get("site_location"),
                "tracking": row.get("tracking"),
                "qa_status": row.get("qa_status"),
                "qa_issue": row.get("qa_issue"),
                "years": _opt_float(row.get("years")),
                "timezone_field": row.get("timezone_or_utc_offset"),
                "timezone_derivation": derivation,
                "index_rows_merged": int(row.get("n_index_rows", 1)),
            },
        )

    def native_resolution(self, external_id: str) -> int:
        """Sampling interval in minutes, inferred from one real day of data."""
        site = self.describe_site(external_id)
        probe_end = site.last_data or date.today()
        frame = self.fetch_interval(external_id, probe_end, probe_end)
        return frame.interval_minutes

    def supports_backfill_years(self) -> float:
        """The lake is a static archive; the longest record it holds is the answer."""
        return float(load_systems_index()["years"].max())

    # -- fetch -----------------------------------------------------------------

    def fetch_interval(
        self, external_id: str, start: date, end: date
    ) -> TelemetryFrame:
        """Normalized telemetry for `[start, end]` inclusive, on the site's calendar.

        The window is interpreted in the site's own timezone — a month runs from
        local midnight to local midnight, not UTC midnight — and returned on a
        UTC index, as `TelemetryFrame` requires.
        """
        if end < start:
            raise ValueError(f"end {end} precedes start {start}")
        site = self.describe_site(external_id)
        store = site.extra["store"]
        if store == "partitioned":
            series, payload = self._fetch_partitioned(site, start, end)
        elif store == "data_prize":
            series, payload = self._fetch_prize(site, start, end)
        else:
            raise TelemetryUnavailableError(
                f"system {external_id} has no time-series objects in the lake "
                f"(checked {PVDATA_ROOT} and {PRIZE_ROOT}). The systems index "
                f"advertises {site.extra.get('years')} years of record for it."
            )

        if series.empty:
            raise TelemetryUnavailableError(
                f"system {external_id}: no rows in {start}..{end}"
            )

        series, resample_note = _to_minute_grid(series)
        if resample_note:
            payload.setdefault("conversion_applied", []).append(resample_note)
        interval = infer_interval_minutes(series.index)
        self._guard_magnitude(site, series["ac_power_w"])
        payload = {
            "adapter": "pvdaq",
            "store": store,
            "window": {"start": start.isoformat(), "end": end.isoformat()},
            "interval_minutes": interval,
            "interval_basis": "median index delta of the fetched rows",
            "conversion_applied": payload.pop("conversion_applied", []),
            **payload,
        }
        return TelemetryFrame(
            site=site,
            series=series,
            interval_minutes=interval,
            source="pvdaq",
            fetched_at=datetime.now(timezone.utc),
            raw_payload=payload,
        )

    # -- partitioned store -----------------------------------------------------

    def _fetch_partitioned(
        self, site: SiteDescriptor, start: date, end: date
    ) -> tuple[pd.DataFrame, dict]:
        system_id = int(site.external_id)
        fs = _fs()
        paths = _partition_paths(fs, system_id, start, end)
        if not paths:
            raise TelemetryUnavailableError(
                f"system {system_id}: no parquet partitions for {start}..{end}"
            )

        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            frames = [f for f in pool.map(_read_partition, paths) if f is not None]
        if not frames:
            raise TelemetryUnavailableError(
                f"system {system_id}: every partition in {start}..{end} was empty"
            )
        long = pd.concat(frames, ignore_index=True)

        sentinel_mask = long["value"].isin(MISSING_VALUE_SENTINELS)
        n_sentinels = int(sentinel_mask.sum())
        long.loc[sentinel_mask, "value"] = np.nan

        present = set(long["metric_id"].astype(int).unique())
        ac_plan = resolve_ac_power(system_id, present)
        plans = [ac_plan, *resolve_optional_channels(system_id, present)]

        index, index_basis = _partitioned_index(long, site)
        long = long.assign(_ts=index)
        long = long[long["_ts"].notna()]

        columns: dict[str, pd.Series] = {}
        for plan in plans:
            subset = long[long["metric_id"].astype(int).isin(plan.metric_ids)]
            if subset.empty:
                continue
            wide = subset.pivot_table(
                index="_ts", columns="metric_id", values="value", aggfunc="mean"
            )
            # A channel that drops out mid-period must not silently become 0 in
            # a sum of channels; require every member before adding the row.
            merged = wide.sum(axis=1, min_count=len(plan.metric_ids))
            columns[plan.column] = merged * plan.scale

        series = pd.DataFrame(columns).sort_index()
        series.index = pd.DatetimeIndex(series.index, name=None)
        series = _clip_to_local_window(series, site, start, end)

        return series, {
            "channels": {p.column: {"metric_ids": list(p.metric_ids),
                                    "scale_to_unit": p.scale,
                                    "combine": p.combine,
                                    "detail": p.detail} for p in plans},
            "metric_ids_present": sorted(present),
            "partitions_read": len(paths),
            "sentinel_values_masked": n_sentinels,
            "sentinel_values": list(MISSING_VALUE_SENTINELS),
            "timestamp_basis": index_basis,
            "conversion_applied": [
                f"{p.column}: raw value x {p.scale:g} ({p.combine})" for p in plans
            ],
        }

    # -- data prize store ------------------------------------------------------

    def _fetch_prize(
        self, site: SiteDescriptor, start: date, end: date
    ) -> tuple[pd.DataFrame, dict]:
        system_id = int(site.external_id)
        cached, meta = self._prize_series(site)
        series = _clip_to_local_window(cached, site, start, end)
        meta = {**meta, "cache": str(self._prize_cache_path(system_id))}
        return series, meta

    def _prize_cache_path(self, system_id: int) -> Path:
        return self.cache_dir / f"pvdaq_{system_id}_site_total.parquet"

    def _prize_series(self, site: SiteDescriptor) -> tuple[pd.DataFrame, dict]:
        """Whole-record site-total series for a data-prize system, cached on disk.

        The prize bundles are not partitioned by date, so slicing one month still
        reads the whole object. 9069's AC file is 1.77 GB; re-reading it per month
        would cost a 24-month backfill about 42 GB of transfer. One pass produces
        the cache and every later `fetch_interval` slices it.
        """
        system_id = int(site.external_id)
        cache = self._prize_cache_path(system_id)
        meta_path = cache.with_suffix(".json")
        if cache.exists() and meta_path.exists():
            return pd.read_parquet(cache), json.loads(meta_path.read_text())

        fs = _fs()
        data_dir = f"{PRIZE_ROOT}/{system_id}_OEDI/data"
        ac_file = f"{data_dir}/{system_id}_electrical_ac.csv"
        if not fs.exists(ac_file):
            candidates = [p for p in fs.ls(data_dir)
                          if p.endswith("_electrical_data.csv")]
            if not candidates:
                raise TelemetryUnavailableError(
                    f"system {system_id}: no AC electrical file under {data_dir}"
                )
            ac_file = candidates[0]

        with fs.open(ac_file) as fh:
            header = pd.read_csv(fh, nrows=0)
        power_cols, unit_scale = _prize_ac_power_columns(system_id, header.columns)

        totals: list[pd.Series] = []
        with fs.open(ac_file, block_size=32 * 1024 * 1024) as fh:
            for chunk in pd.read_csv(
                fh, usecols=["measured_on", *power_cols], chunksize=200_000
            ):
                stamps = pd.to_datetime(chunk["measured_on"], errors="coerce")
                values = chunk[power_cols].apply(pd.to_numeric, errors="coerce")
                # min_count: a timestamp where every inverter is missing stays
                # NaN (a gap), rather than summing to a fabricated 0 kW.
                total = values.sum(axis=1, min_count=1) * unit_scale
                totals.append(pd.Series(total.to_numpy(), index=stamps))

        combined = pd.concat(totals)
        combined = combined[combined.index.notna()]
        combined = combined[~combined.index.duplicated(keep="first")].sort_index()
        # Prize timestamps are naive site-local (spec 20 §2.1 discipline: state
        # the standard, never assume UTC). DST-ambiguous and nonexistent stamps
        # are dropped rather than snapped to a neighbouring hour.
        localized = combined.tz_localize(
            site.iana_timezone, ambiguous="NaT", nonexistent="NaT"
        )
        localized = localized[localized.index.notna()].tz_convert("UTC")

        frame = pd.DataFrame({"ac_power_w": localized})
        meta = {
            "channels": {
                "ac_power_w": {
                    "source_file": ac_file,
                    "columns": power_cols,
                    "scale_to_unit": unit_scale,
                    "combine": "sum",
                    "detail": f"sum of {len(power_cols)} inverter AC power columns",
                }
            },
            "timestamp_basis": (
                f"measured_on localized to {site.iana_timezone} "
                f"(naive site-local in the source), converted to UTC"
            ),
            "conversion_applied": [
                f"ac_power_w: sum of {len(power_cols)} columns x {unit_scale:g}"
            ],
        }
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        frame.to_parquet(cache)
        meta_path.write_text(json.dumps(meta, indent=2))
        return frame, meta

    # -- helpers ---------------------------------------------------------------

    def _row(self, external_id: str) -> dict:
        index = load_systems_index()
        try:
            key = int(external_id)
        except (TypeError, ValueError):
            raise IngestionError(f"PVDAQ system ids are integers; got {external_id!r}") from None
        if key not in index.index:
            raise IngestionError(f"system {key} is not in the PVDAQ systems index")
        return index.loc[key].to_dict()

    @staticmethod
    @lru_cache(maxsize=256)
    def _store(system_id: int) -> str:
        fs = _fs()
        if fs.exists(f"{PVDATA_ROOT}/system_id={system_id}"):
            return "partitioned"
        if fs.exists(f"{PRIZE_ROOT}/{system_id}_OEDI/data"):
            return "data_prize"
        return "none"

    @staticmethod
    def _guard_magnitude(site: SiteDescriptor, ac_power_w: pd.Series) -> None:
        nameplate_kw = site.capacity_kw_dc
        if not nameplate_kw or not np.isfinite(nameplate_kw):
            return
        # Two-sided: a sign-flipped or sentinel-laden channel is just as wrong as
        # an over-scaled one, and `quantile(0.999)` on the raw value would miss
        # a series that is uniformly, impossibly negative.
        magnitude = pd.to_numeric(ac_power_w, errors="coerce").abs()
        peak_w = float(magnitude.quantile(0.999))
        limit_w = nameplate_kw * 1000.0 * MAX_AC_TO_DC_RATIO
        if np.isfinite(peak_w) and peak_w > limit_w:
            raise ImplausibleMagnitudeError(
                f"system {site.external_id}: |AC power| p99.9 is {peak_w / 1e6:.2f} MW "
                f"against a {nameplate_kw / 1000:.2f} MW DC nameplate "
                f"({peak_w / (nameplate_kw * 1000):.1f}x, limit {MAX_AC_TO_DC_RATIO}x). "
                f"The stored values do not match the units the dictionary declares "
                f"for them. Skipping the period rather than picking a scale factor."
            )


def _none_if_nan(value):
    value = float(value)
    return None if not np.isfinite(value) else value


def _opt_float(value) -> float | None:
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    return out if np.isfinite(out) else None


def _opt_date(value) -> date | None:
    stamp = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(stamp) else stamp.date()


def _partition_paths(fs, system_id: int, start: date, end: date) -> list[str]:
    """Day-file paths covering [start, end], listed one month at a time.

    Partition directories use unpadded `month=6`/`day=1` while the file inside
    is padded (`..._date_2018_06_01...`), and the suffix carries a part number.
    Globbing the month sidesteps both conventions and costs one LIST per month
    instead of one per day.
    """
    paths: list[str] = []
    # A local-time window can reach one day either side of the UTC dates.
    lo = start - pd.Timedelta(days=1)
    hi = end + pd.Timedelta(days=1)
    for period in pd.period_range(lo, hi, freq="M"):
        prefix = f"{PVDATA_ROOT}/system_id={system_id}/year={period.year}/month={period.month}"
        try:
            found = fs.glob(f"{prefix}/day=*/*.parquet")
        except FileNotFoundError:
            continue
        for path in found:
            day = _day_of_partition(path)
            if day is not None and lo <= day <= hi:
                paths.append(path)
    return sorted(paths)


_DAY_IN_PATH = re.compile(r"/year=(\d+)/month=(\d+)/day=(\d+)/")


def _day_of_partition(path: str) -> date | None:
    match = _DAY_IN_PATH.search(path)
    if not match:
        return None
    year, month, day = (int(g) for g in match.groups())
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _read_partition(path: str) -> pd.DataFrame | None:
    with _fs().open(path) as fh:
        frame = pd.read_parquet(
            fh, columns=["measured_on", "utc_measured_on", "metric_id", "value"]
        )
    return None if frame.empty else frame


def _partitioned_index(long: pd.DataFrame, site: SiteDescriptor) -> tuple[pd.Series, str]:
    """Build the UTC index, preferring `utc_measured_on` where it exists.

    Spec 21 §3.3 says to use `utc_measured_on` unconditionally. It is null for
    entire years: every row of system 1332 in 2018 has NaT there, while 2021 is
    fully populated. Falling back means localizing `measured_on`, which is naive
    site-local — the same explicit localization spec 20 §2.1 requires of weather
    frames, and never an assumption that a naive stamp is UTC.
    """
    utc = pd.to_datetime(long["utc_measured_on"], errors="coerce")
    if utc.notna().all():
        return utc.dt.tz_localize("UTC"), "utc_measured_on"

    local = pd.to_datetime(long["measured_on"], errors="coerce")
    localized = local.dt.tz_localize(
        site.iana_timezone, ambiguous="NaT", nonexistent="NaT"
    ).dt.tz_convert("UTC")
    if utc.notna().any():
        # Mixed. Trust the explicit column where present; localize the rest.
        merged = utc.dt.tz_localize("UTC").fillna(localized)
        return merged, (
            f"utc_measured_on where present ({utc.notna().mean() * 100:.1f}% of rows), "
            f"else measured_on localized to {site.iana_timezone}"
        )
    return localized, (
        f"measured_on localized to {site.iana_timezone} "
        f"(utc_measured_on is null for every row in this window)"
    )


def _to_minute_grid(series: pd.DataFrame) -> tuple[pd.DataFrame, str | None]:
    """Resample sub-minute telemetry onto a 1-minute grid of MEAN values.

    System 1332 logs every 15 seconds. `reading_quality.interval_minutes` is an
    INT and `energy_kwh()` multiplies by it, so a fractional interval has
    nowhere to live and rounding one is a 4x energy error. The mean over each
    minute is the right reduction for an instantaneous-power channel: it is
    exactly the energy-preserving one, since energy is power integrated over the
    same minute either way. `min_count=1` keeps a minute with no samples a gap.
    """
    seconds = infer_interval_seconds(series.index)
    if seconds >= 60:
        return series, None
    resampled = series.resample("1min").mean()
    return resampled, (
        f"resampled {seconds:.0f}s native sampling to a 1-minute grid "
        f"(mean of {60 / seconds:.0f} samples per minute; energy-preserving for "
        f"instantaneous power)"
    )


def _clip_to_local_window(
    series: pd.DataFrame, site: SiteDescriptor, start: date, end: date
) -> pd.DataFrame:
    """Trim a UTC-indexed frame to [start, end] on the SITE's wall clock."""
    zone = site.iana_timezone
    lo = pd.Timestamp(start).tz_localize(zone)
    hi = (pd.Timestamp(end) + pd.Timedelta(days=1)).tz_localize(zone)
    local = series.tz_convert(zone)
    return local[(local.index >= lo) & (local.index < hi)].tz_convert("UTC")


_PRIZE_AC_UNIT = re.compile(r"_ac_power_\((?P<unit>[a-z]+)\)_", re.I)
_PRIZE_AC_BARE = re.compile(r"_ac_power(_|$)", re.I)


def _prize_ac_power_columns(
    system_id: int, columns
) -> tuple[list[str], float]:
    """Inverter AC power columns in a prize CSV, plus the scale onto watts.

    The unit lives in the column name and nowhere else: 9069 writes
    `inverter_01_ac_power_(kw)_inv_150953`. 2107 writes
    `inv_01_ac_power_inv_149583` — no unit, and the prize bundle has neither a
    metrics dictionary nor a units field anywhere else in it. Inferring kW from
    the magnitudes against the 27.6 kW inverter nameplate would be a guess, and
    a wrong guess is a clean 1000x error, so this raises instead.
    """
    named = [c for c in columns if _PRIZE_AC_UNIT.search(str(c))]
    if named:
        units = {_PRIZE_AC_UNIT.search(str(c)).group("unit").lower() for c in named}
        if len(units) != 1:
            raise MetricResolutionError(
                f"system {system_id}: AC power columns carry mixed units {units}"
            )
        unit = units.pop()
        scale = {"w": 1.0, "kw": 1e3, "mw": 1e6}.get(unit)
        if scale is None:
            raise MetricResolutionError(
                f"system {system_id}: unrecognised AC power unit {unit!r}"
            )
        return sorted(named), scale

    bare = [c for c in columns if _PRIZE_AC_BARE.search(str(c))]
    if bare:
        raise MetricResolutionError(
            f"system {system_id}: {len(bare)} AC power columns (e.g. {bare[0]!r}) "
            f"state no unit, and the data-prize bundle carries no metrics "
            f"dictionary to resolve one. Ingesting them would mean guessing "
            f"between W and kW — a silent 1000x error. Skipping the system."
        )
    raise MissingChannelError(
        f"system {system_id}: no AC power column found among {len(list(columns))} "
        f"columns in the data-prize electrical file"
    )


ADAPTER = PVDAQAdapter()
register(ADAPTER)
