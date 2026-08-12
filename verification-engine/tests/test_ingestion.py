"""Spec 21 §7.8 guardrails for the ingestion interface, adapter and QC layer.

Five failures are named in §7.8, and each one is a mistake that produces a
plausible number rather than a crash:

  * an interval read off an irregular index
  * energy integrated against the wrong interval
  * a time-misaligned series reconciled anyway
  * a metric id defaulted when it could not be resolved
  * a frame with no production leg accepted as a partial success

Every test here runs offline against fixtures. The network suites (a real S3
fetch) are marked `network` and excluded from CI, for the reason
`.github/workflows/ci.yml` already states: a red build must mean a regression,
not that an upstream bucket was briefly unreachable.
"""
import os
import sys
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))

from ingestion.base import (                                    # noqa: E402
    ADAPTERS,
    AdapterNotRegisteredError,
    IntervalInferenceError,
    MissingChannelError,
    SiteDescriptor,
    TelemetryFrame,
    energy_kwh,
    energy_per_interval_to_power_w,
    get_adapter,
    infer_interval_minutes,
    infer_interval_seconds,
    register,
)
from ingestion.quality import assess                            # noqa: E402

GOLDEN_CO = (39.7388, -105.1732)


def _site(**overrides) -> SiteDescriptor:
    base = dict(
        external_id="1332", source="pvdaq", name="fixture site",
        latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1], capacity_kw_dc=1153.488,
        tilt_deg=16.77, azimuth_deg=180.0, iana_timezone="America/Denver",
    )
    base.update(overrides)
    return SiteDescriptor(**base)


def _frame(series: pd.DataFrame, interval: int, **overrides) -> TelemetryFrame:
    kwargs = dict(
        site=_site(), series=series, interval_minutes=interval, source="pvdaq",
        fetched_at=datetime.now(timezone.utc), raw_payload={},
    )
    kwargs.update(overrides)
    return TelemetryFrame(**kwargs)


def _clearsky_power(days: int = 20, freq: str = "15min", peak_w: float = 800_000,
                    start: str = "2018-06-01") -> pd.Series:
    """A deterministic, correctly-aligned clear-sky AC power series in UTC."""
    import pvlib

    location = pvlib.location.Location(*GOLDEN_CO, tz="UTC")
    index = pd.date_range(start, periods=int(days * 24 * 60 / _minutes(freq)),
                          freq=freq, tz="UTC")
    ghi = location.get_clearsky(index)["ghi"]
    solpos = pvlib.solarposition.get_solarposition(index, *GOLDEN_CO)
    power = (ghi / 1000.0 * peak_w).clip(lower=0)
    power[solpos["apparent_elevation"] < 0] = 0.0
    return power


def _minutes(freq: str) -> int:
    return int(pd.Timedelta(freq).total_seconds() // 60)


# ── §7.8 (1) interval inference on an irregular index ────────────────────────

def test_interval_inference_survives_an_irregular_index():
    """A 15-minute site with dropouts, a duplicate stamp and a DST seam is 15 min.

    The mean delta of this index is 21.8 minutes and `pd.infer_freq` returns
    None, so either of those would have to be wrapped in a fallback — and a
    fallback here is the 4x error waiting to happen. The median is unmoved.
    """
    # Two days across the 2018-03-11 spring-forward seam in America/Denver, so
    # the index also contains a real one-hour discontinuity that is not a gap.
    nominal = pd.date_range("2018-03-10 12:00", periods=192, freq="15min",
                            tz="America/Denver")
    outages = [*range(20, 40), *range(70, 90), *range(140, 160)]  # 3 x 5 h
    irregular = nominal.delete(outages)
    irregular = irregular.append(pd.DatetimeIndex([irregular[5]]))  # duplicate stamp
    irregular = irregular.sort_values()

    assert infer_interval_minutes(irregular) == 15

    deltas = pd.Series(irregular).diff().dropna()
    assert deltas.mean() > pd.Timedelta(minutes=20), (
        "fixture must actually be irregular enough to move the mean"
    )
    assert pd.infer_freq(irregular.unique()) is None, (
        "fixture must actually defeat pd.infer_freq"
    )


def test_interval_inference_refuses_rather_than_defaults():
    with pytest.raises(IntervalInferenceError):
        infer_interval_minutes(pd.DatetimeIndex(["2018-06-01"], tz="UTC"))
    repeated = pd.DatetimeIndex(["2018-06-01 00:00"] * 5, tz="UTC")
    with pytest.raises(IntervalInferenceError):
        infer_interval_minutes(repeated)


def test_sub_minute_sampling_raises_instead_of_rounding():
    """System 1332 logs every 15 seconds; `interval_minutes` is a whole number.

    Rounding 0.25 up to 1 would inflate energy 4x and rounding it down would
    divide by zero, so the adapter has to resample and say so. The error message
    is the instruction.
    """
    index = pd.date_range("2018-06-01", periods=400, freq="15s", tz="UTC")
    assert infer_interval_seconds(index) == 15.0
    with pytest.raises(IntervalInferenceError, match="sub-minute"):
        infer_interval_minutes(index)


# ── §7.8 (2) energy integration against a hand-computed day ──────────────────

def test_energy_integration_matches_a_hand_computed_constant_power_day():
    """A day held at exactly 100 kW is exactly 2,400 kWh, at any sampling rate.

    100 kW x 24 h = 2,400 kWh. Computed by hand, not by a second implementation,
    so the test cannot agree with the code by sharing its mistake. Asserted at
    three sampling rates because the interval is the term that goes wrong.
    """
    for freq, interval in (("60min", 60), ("15min", 15), ("5min", 5)):
        index = pd.date_range("2018-06-01", periods=int(24 * 60 / interval),
                              freq=freq, tz="UTC")
        power = pd.Series(100_000.0, index=index)               # 100 kW in W
        assert energy_kwh(power, interval) == pytest.approx(2400.0)


def test_energy_integration_is_wrong_by_the_interval_ratio_when_the_interval_is():
    """The 4x error, made explicit: 15-minute data read as hourly.

    This is the failure spec 21 §2.1 warns about. It does not crash, it does not
    look odd, it returns a number four times too large.
    """
    index = pd.date_range("2018-06-01", periods=96, freq="15min", tz="UTC")
    power = pd.Series(100_000.0, index=index)
    assert energy_kwh(power, 15) == pytest.approx(2400.0)
    assert energy_kwh(power, 60) == pytest.approx(2400.0 * 4)


def test_gaps_contribute_no_energy_and_are_not_zero_production():
    index = pd.date_range("2018-06-01", periods=24, freq="60min", tz="UTC")
    power = pd.Series(100_000.0, index=index)
    power.iloc[6:12] = np.nan                                   # six-hour outage
    assert energy_kwh(power, 60) == pytest.approx(1800.0)       # 18 h x 100 kW


def test_energy_per_interval_converts_to_mean_power():
    """25 kWh in a 15-minute interval is 100 kW, not 25 kW."""
    index = pd.date_range("2018-06-01", periods=4, freq="15min", tz="UTC")
    energy = pd.Series(25_000.0, index=index)                   # Wh per interval
    power = energy_per_interval_to_power_w(energy, 15)
    assert power.iloc[0] == pytest.approx(100_000.0)
    assert energy_kwh(power, 15) == pytest.approx(100.0)        # 4 x 25 kWh


# ── §7.8 (3) the night guard fires on a deliberately shifted index ───────────

def test_night_guard_fires_on_a_shifted_index():
    """A whole-series shift is `error`, whatever else the month looks like."""
    power = _clearsky_power()
    aligned = assess(power, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])
    assert aligned.qc_verdict == "complete"
    assert aligned.night_energy_frac < 1.0

    shifted = power.copy()
    shifted.index = shifted.index + pd.Timedelta(hours=7)       # ~ round(lon/15)
    verdict = assess(shifted, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])
    assert verdict.qc_verdict == "error"
    assert verdict.night_energy_frac > 1.0
    assert verdict.blocks_reconciliation
    assert any("below the horizon" in note for note in verdict.qc_notes)


def test_night_guard_is_blind_to_a_shift_without_coordinates():
    """Why `assess` takes lat/lon at all — and why its absence is disclosed.

    Spec 21 §5 derives the daylight mask from `daytime.power_or_irradiance`,
    which infers day and night from the series itself. Shift the series and the
    inferred window shifts with it, so the guard sees nothing. That is not a
    hypothetical: the same +7 h shift the test above catches at 44% night energy
    scores under 0.01% on the data-derived mask.

    The degraded path is kept for sources with no coordinates, so this asserts
    both halves of the bargain: it misses the shift, and it says so.
    """
    power = _clearsky_power()
    shifted = power.copy()
    shifted.index = shifted.index + pd.Timedelta(hours=7)

    blind = assess(shifted)                                     # no lat/lon
    assert blind.night_energy_frac < 1.0, (
        "the data-derived mask cannot see a whole-series shift — if this starts "
        "passing, the degraded path became load-bearing and the disclosure below "
        "is no longer needed"
    )
    assert any("cannot see a whole-series time shift" in n for n in blind.qc_notes)


def test_clipping_is_a_note_and_never_a_downgrade():
    """A clipped plant is healthy. Downgrading it would flag the best assets.

    Includes the back door: a clipped ceiling is a long run of identical values,
    so an unguarded staleness measure downgrades on clipping without ever
    mentioning it.
    """
    clipped = _clearsky_power().clip(upper=500_000)
    verdict = assess(clipped, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])

    assert verdict.clipped_frac > 0.15
    assert verdict.qc_verdict == "complete"
    assert not verdict.blocks_reconciliation
    assert any("inverter-limited" in note for note in verdict.qc_notes)
    assert verdict.stale_frac <= 0.10, (
        "a clipped ceiling must not reach the staleness threshold, or clipping "
        "downgrades the period through the stale rule instead of the clip rule"
    )


def test_a_channel_frozen_mid_ramp_still_downgrades():
    """The other half: staleness must survive the clipping exclusion."""
    import pvlib

    power = _clearsky_power()
    solpos = pvlib.solarposition.get_solarposition(power.index, *GOLDEN_CO)
    daylight = (solpos["apparent_elevation"] > 10).to_numpy()
    frozen = power.copy()
    for day in range(5, 11):                                    # six frozen days
        rows = np.where((frozen.index.day == day) & daylight)[0]
        frozen.iloc[rows] = frozen.iloc[rows[0]]                # stuck mid-ramp

    verdict = assess(frozen, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])
    assert verdict.stale_frac > 0.10
    assert verdict.qc_verdict == "partial"


def test_gaps_downgrade_by_completeness():
    power = _clearsky_power()
    gapped = power.copy()
    gapped.iloc[: int(len(gapped) * 0.35)] = np.nan
    partial = assess(gapped, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])
    assert partial.qc_verdict == "partial"
    assert 50 <= partial.completeness_pct < 90

    gapped.iloc[: int(len(gapped) * 0.80)] = np.nan
    missing = assess(gapped, latitude=GOLDEN_CO[0], longitude=GOLDEN_CO[1])
    assert missing.qc_verdict == "missing"
    assert missing.blocks_reconciliation


# ── §7.8 (4) metric resolution failure raises rather than defaulting ─────────

def _metrics(rows: list[dict]) -> pd.DataFrame:
    columns = ["system_id", "metric_id", "sensor_name", "common_name", "raw_units",
               "units", "calc_scale", "calc_offset", "calc_details",
               "aggregation_type", "source_type", "source_id", "comments",
               "standard_name"]
    return pd.DataFrame(rows, columns=columns).fillna(
        {"calc_scale": 1.0, "calc_offset": 0.0, "calc_details": ""}
    )


def _metric(metric_id: int, sensor: str, common: str, units: str,
            source_type=None, calc_scale: float = 1.0) -> dict:
    return {
        "system_id": 4242, "metric_id": metric_id, "sensor_name": sensor,
        "common_name": common, "raw_units": units, "units": units,
        "calc_scale": calc_scale, "calc_offset": 0.0, "calc_details": "",
        "aggregation_type": "avg", "source_type": source_type, "source_id": None,
        "comments": "", "standard_name": sensor,
    }


@pytest.fixture
def patched_metrics(monkeypatch):
    """Install a fixture dictionary in place of the S3 metrics table."""
    from ingestion import pvdaq

    def install(rows):
        monkeypatch.setattr(pvdaq, "load_metrics", lambda system_id: _metrics(rows))

    return install


def test_metric_resolution_raises_when_nothing_resolves(patched_metrics):
    """No AC power channel at all — skip the system, never substitute DC power."""
    from ingestion.pvdaq import MetricResolutionError, resolve_ac_power

    patched_metrics([
        _metric(1, "inv1_dc_power", "DC power", "kW"),
        _metric(2, "poa_ref", "Irradiance POA", "W/m^2"),
    ])
    with pytest.raises(MetricResolutionError, match="no AC power metric"):
        resolve_ac_power(4242, {1, 2})


def test_cumulative_energy_labelled_ac_power_is_not_a_power_channel(patched_metrics):
    """System 4902 files four cumulative kWh and kVARh channels as "AC power".

    Integrating a lifetime kWh register as if it were watts is a ~10^6 error, so
    the unit decides, not the label.
    """
    from ingestion.pvdaq import MetricResolutionError, resolve_ac_power

    patched_metrics([
        _metric(10, "PwrMtrEdel_kWh_Max", "AC power", "kWh", "METER"),
        _metric(11, "PwrMtrErec_kVARh_Max", "AC power", "kVARh", "METER"),
    ])
    with pytest.raises(MetricResolutionError, match="no AC power metric"):
        resolve_ac_power(4242, {10, 11})


def test_metric_resolution_raises_when_an_inverter_channel_is_missing(patched_metrics):
    """1332 drops `inv3_ac_power` partway through its record.

    Summing the two that remain returns a number a third too low that still looks
    like a plant. The refusal names the missing channel.
    """
    from ingestion.pvdaq import MetricResolutionError, resolve_ac_power

    patched_metrics([
        _metric(101, "inv1_ac_power", "AC power", "kW", calc_scale=1000.0),
        _metric(102, "inv2_ac_power", "AC power", "kW", calc_scale=1000.0),
        _metric(103, "inv3_ac_power", "AC power", "kW", calc_scale=1000.0),
    ])
    with pytest.raises(MetricResolutionError, match="inv3_ac_power"):
        resolve_ac_power(4242, {101, 102})

    plan = resolve_ac_power(4242, {101, 102, 103})
    assert plan.metric_ids == (101, 102, 103)
    assert plan.combine == "sum"


def test_metric_resolution_prefers_a_site_total_and_ignores_absent_channels(patched_metrics):
    """The declared total that has no rows must not win over the one that has."""
    from ingestion.pvdaq import resolve_ac_power

    patched_metrics([
        _metric(2638, "metered_ac_power", "AC power", "kW", calc_scale=1000.0),
        _metric(2642, "inv1_ac_power", "AC power", "kW", calc_scale=1000.0),
        _metric(2654, "inv_total_ac_power", "AC power", "W"),   # calculated, no rows
    ])
    plan = resolve_ac_power(4242, {2638, 2642})
    assert plan.metric_ids == (2638,)
    assert plan.scale == pytest.approx(1e6)                     # kW->W x calc_scale
    assert "metered_ac_power" in plan.detail


def test_ambiguous_site_totals_raise(patched_metrics):
    from ingestion.pvdaq import MetricResolutionError, resolve_ac_power

    patched_metrics([
        _metric(1, "metered_ac_power", "AC power", "kW"),
        _metric(2, "total_ac_power", "AC power", "kW"),
    ])
    with pytest.raises(MetricResolutionError, match="ambiguous"):
        resolve_ac_power(4242, {1, 2})


def test_mixed_units_across_summed_channels_raise(patched_metrics):
    from ingestion.pvdaq import MetricResolutionError, resolve_ac_power

    patched_metrics([
        _metric(1, "inv1_ac_power", "AC power", "kW", calc_scale=1000.0),
        _metric(2, "inv2_ac_power", "AC power", "W"),
    ])
    with pytest.raises(MetricResolutionError, match="mixed units"):
        resolve_ac_power(4242, {1, 2})


def test_prize_columns_without_a_stated_unit_raise():
    """System 2107's AC columns state no unit and it has no dictionary.

    W or kW is a clean 1000x, so the adapter refuses the system.
    """
    from ingestion.pvdaq import MetricResolutionError, _prize_ac_power_columns

    named = ["measured_on", "inverter_01_ac_power_(kw)_inv_150953",
             "inverter_02_ac_power_(kw)_inv_150954"]
    columns, scale = _prize_ac_power_columns(9069, named)
    assert len(columns) == 2 and scale == pytest.approx(1000.0)

    bare = ["measured_on", "inv_01_ac_power_inv_149583", "inv_02_ac_power_inv_149588"]
    with pytest.raises(MetricResolutionError, match="state no unit"):
        _prize_ac_power_columns(2107, bare)


def test_sentinel_values_are_masked_not_measured():
    """PVDAQ writes -999 for a missing sample, and it is not a measurement.

    A month of 4902's June 2015 integrates to -520 MWh on a 271 kW plant if the
    sentinel is believed — and it reads 100% complete, because a value is not a
    gap. This asserts the constant is what the masking uses.
    """
    from ingestion.pvdaq import MISSING_VALUE_SENTINELS

    assert -999.0 in MISSING_VALUE_SENTINELS
    assert -7999.0 in MISSING_VALUE_SENTINELS

    raw = pd.Series([100.0, -999.0, 200.0, -7999.0])
    masked = raw.where(~raw.isin(MISSING_VALUE_SENTINELS))
    assert masked.isna().sum() == 2
    assert energy_kwh(masked * 1000.0, 60) == pytest.approx(300.0)


# ── §7.8 (5) a frame without ac_power_w raises ───────────────────────────────

def test_frame_without_ac_power_raises():
    """No production leg is a failed fetch, not a partial success."""
    index = pd.date_range("2018-06-01", periods=48, freq="60min", tz="UTC")
    series = pd.DataFrame({
        "poa_irradiance_wm2": np.linspace(0, 900, 48),
        "ambient_temp_c": np.linspace(5, 30, 48),
    }, index=index)
    with pytest.raises(MissingChannelError, match="ac_power_w"):
        _frame(series, 60)


def test_frame_drops_unmapped_columns_and_records_them():
    index = pd.date_range("2018-06-01", periods=48, freq="60min", tz="UTC")
    series = pd.DataFrame({
        "ac_power_w": np.full(48, 1000.0),
        "inv1_ac_power_kw": np.full(48, 1.0),                   # vendor-native
        "some_vendor_flag": np.zeros(48),
    }, index=index)
    frame = _frame(series, 60)
    assert list(frame.series.columns) == ["ac_power_w"]
    assert set(frame.dropped_columns) == {"inv1_ac_power_kw", "some_vendor_flag"}


def test_frame_rejects_a_naive_index():
    """Spec 20 §2.1: a frame that never stated its standard is a programmer error."""
    index = pd.date_range("2018-06-01", periods=48, freq="60min")   # naive
    series = pd.DataFrame({"ac_power_w": np.full(48, 1000.0)}, index=index)
    with pytest.raises(ValueError, match="naive"):
        _frame(series, 60)


def test_frame_normalizes_to_utc_and_buckets_on_the_site_clock():
    """Month boundaries are LOCAL midnight; bucketing a Colorado site on UTC
    puts seven hours of every month into its neighbour."""
    index = pd.date_range("2018-06-01", periods=48, freq="60min",
                          tz="America/Denver")
    series = pd.DataFrame({"ac_power_w": np.full(48, 1000.0)}, index=index)
    frame = _frame(series, 60)

    assert str(frame.series.index.tz) == "UTC"
    assert str(frame.local().index[0]) == "2018-06-01 00:00:00-06:00"
    assert frame.local().index[0].hour == 0
    assert frame.series.index[0].hour == 6                      # same instant, UTC


def test_frame_rejects_a_fractional_interval():
    index = pd.date_range("2018-06-01", periods=48, freq="60min", tz="UTC")
    series = pd.DataFrame({"ac_power_w": np.full(48, 1000.0)}, index=index)
    with pytest.raises(ValueError, match="whole number of minutes"):
        _frame(series, 0.25)


# ── §7.1 the interface itself ────────────────────────────────────────────────

def test_pvdaq_registers_against_the_protocol():
    from ingestion.base import InverterAdapter

    adapter = get_adapter("pvdaq")
    assert adapter.source == "pvdaq"
    assert isinstance(adapter, InverterAdapter)
    for method in ("list_sites", "describe_site", "fetch_interval",
                   "native_resolution", "supports_backfill_years"):
        assert callable(getattr(adapter, method)), method


def test_unregistered_source_raises_and_names_what_is_available():
    with pytest.raises(AdapterNotRegisteredError, match="solaredge"):
        get_adapter("solaredge")


def test_register_rejects_a_source_outside_the_vocabulary():
    class Bogus:
        source = "not_a_real_vendor"

    with pytest.raises(ValueError):
        register(Bogus())
    assert "not_a_real_vendor" not in ADAPTERS


def test_reconciliation_does_not_import_a_vendor_module():
    """§7.1's real claim, asserted against the file rather than asserted at all.

    `reconcile.ts` resolving an adapter by name is the whole point of the
    registry; the day it imports `pvdaq` directly, spec 24 becomes a
    reconciliation change.
    """
    import re
    from pathlib import Path

    reconcile = (Path(__file__).resolve().parents[2]
                 / "ecoxchange-reconciliation-engine" / "src" / "reconciliation"
                 / "reconcile.ts")
    if not reconcile.exists():                                  # engine not checked out
        pytest.skip(f"{reconcile} not present")
    source = reconcile.read_text()
    imports = re.findall(r'^\s*import[^;]+from\s+"([^"]+)"', source, re.M)
    vendors = ("pvdaq", "solaredge", "enphase", "fronius", "sma")
    offenders = [i for i in imports if any(v in i.lower() for v in vendors)]
    assert not offenders, f"reconcile.ts imports vendor modules: {offenders}"


# ── network ──────────────────────────────────────────────────────────────────

network = pytest.mark.skipif(
    not os.environ.get("RUN_NETWORK_TESTS"),
    reason="hits the public oedi-data-lake bucket; set RUN_NETWORK_TESTS=1",
)


@network
def test_seed_sites_describe_with_a_validated_timezone():
    adapter = get_adapter("pvdaq")
    expected = {
        "9069": ("America/New_York", "data_prize"),
        "2107": ("PST8PDT", "data_prize"),
        "1332": ("America/Denver", "partitioned"),
        "4902": ("America/New_York", "partitioned"),
    }
    for external_id, (zone, store) in expected.items():
        site = adapter.describe_site(external_id)
        assert site.iana_timezone == zone, external_id
        assert site.extra["store"] == store, external_id
        assert site.latitude and site.longitude


@network
def test_a_real_month_round_trips_through_the_interface():
    adapter = get_adapter("pvdaq")
    frame = adapter.fetch_interval("4902", date(2017, 7, 1), date(2017, 7, 31))
    assert "ac_power_w" in frame.series.columns
    assert frame.interval_minutes == 1
    assert 0 < frame.energy_kwh() < 271 * 24 * 31                # under nameplate x hours
    verdict = assess(frame.ac_power_w, latitude=frame.site.latitude,
                     longitude=frame.site.longitude,
                     interval_minutes=frame.interval_minutes)
    assert verdict.night_energy_frac < 1.0
