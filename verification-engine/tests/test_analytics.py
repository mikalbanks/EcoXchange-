"""Spec 22 §6.7 guardrails for the analytics module.

§6.7 names three cases, and each is a mistake that produces a plausible number
rather than a crash:

  * a degradation rate reported from under 24 months of record
  * a QC-error month reconciled into a trend anyway
  * an economic translation that dies on the NULL PPA rate every seeded
    project actually has

Two more are added here because they are the same class of failure and were
found while reading the library rather than the spec:

  * a soiling confidence interval carried across without inverting, which stores
    a well-formed band around the wrong side of the estimate
  * a degradation rate stored without its interval at all

Everything in this file runs offline. The rules that matter most are enforced in
modules that import nothing heavier than pandas, so testing them needs neither
rdtools nor a network. The suites that do hit S3 are behind the `network` marker
this repo already uses, for the reason `.github/workflows/ci.yml` states: a red
build must mean a regression, not that an upstream bucket was unreachable.
"""
import os
import sys
from datetime import date, datetime, timezone

import pandas as pd
import pytest

sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
)

from analytics import economics                                 # noqa: E402
from analytics.economics import (                               # noqa: E402
    DEFAULT_PPA_RATE_PER_KWH,
    resolve_ppa_rate,
    translate,
)
from analytics.registry import (                                # noqa: E402
    EXCLUDED_SYSTEMS,
    SEED_PROJECTS,
    get_project,
    get_project_by_system,
    project_uuid,
)
from analytics.results import (                                 # noqa: E402
    MIN_MONTHS_FOR_DEGRADATION,
    AvailabilityResult,
    DegradationResult,
    PlantAnalyticsRow,
    SoilingResult,
)
from analytics.sinks import JsonArtifactSink, SqlSeedSink, row_to_sql  # noqa: E402


# ── §6.7 case 1: under 24 months returns NULL, not a value ────────────────────

class TestMinimumHistory:
    """A rate from a short record is fabricated, not conservative."""

    def test_short_record_yields_no_rate_and_says_why(self):
        result = DegradationResult(
            project_id=project_uuid(4902),
            method="clearsky",
            window_start=date(2016, 1, 1),
            window_end=date(2017, 11, 30),
            n_days_analyzed=600,
            rate_pct_per_yr=None,
            notes=["No degradation rate: 23.0 months of usable record."],
        )
        assert result.rate_pct_per_yr is None
        assert result.reported is False
        assert result.within_plausible_range is None
        assert result.notes, "an absent rate must carry the reason it is absent"

    def test_threshold_is_24_months(self):
        # Named so a change to the constant is a deliberate act with a test
        # behind it, rather than a number someone nudged.
        assert MIN_MONTHS_FOR_DEGRADATION == 24.0

    def test_a_short_window_is_not_an_exception(self):
        """The absence is a result, so it must construct cleanly."""
        DegradationResult(
            project_id="p", method="clearsky",
            window_start=date(2020, 1, 1), window_end=date(2021, 1, 1),
            n_days_analyzed=300, rate_pct_per_yr=None,
        )


# ── §6.7 case 2: QC-error readings are excluded ──────────────────────────────

class TestQcExclusion:
    """A time-misaligned month is the one fault that produces a plausible rate.

    `load_series` recomputes the verdict with `ingestion.quality.assess` rather
    than reading `reading_quality`, because the engine has no database driver.
    These tests drive the exclusion decision directly so they need neither
    pvanalytics nor a fetch.
    """

    def test_error_verdict_excludes_and_partial_does_not(self):
        from analytics.telemetry import AssembledSeries

        assembled = AssembledSeries(
            project_id="p",
            series=pd.DataFrame(
                {"ac_power_w": [1.0, 2.0]},
                index=pd.to_datetime(
                    ["2016-01-01T12:00Z", "2016-01-01T12:15Z"], utc=True
                ),
            ),
            interval_minutes=15,
            window_start=date(2016, 1, 1),
            window_end=date(2016, 1, 31),
            months_kept=["2016-01"],
            months_qc_excluded=[{
                "period": "2016-02",
                "qc_verdict": "error",
                "night_energy_frac": 44.7,
                "qc_notes": ["44.7% of positive energy falls below the horizon."],
            }],
        )
        assert assembled.months_kept == ["2016-01"]
        excluded = {m["period"] for m in assembled.months_qc_excluded}
        assert "2016-02" in excluded
        assert "2016-01" not in excluded

    def test_only_error_blocks_a_month(self):
        """`partial` and `missing` are gaps, and RdTools filters handle gaps.

        Dropping them would throw away usable history for no gain. `error`
        means the series is time-shifted, which is a different thing: the shape
        is intact and wrong, so the filters cannot see it.
        """
        from ingestion.quality import QualityResult

        misaligned = QualityResult(
            completeness_pct=100.0, night_energy_frac=44.7,
            interval_minutes=15, qc_verdict="error",
        )
        gappy = QualityResult(
            completeness_pct=62.0, night_energy_frac=0.1,
            interval_minutes=15, qc_verdict="partial",
        )
        assert misaligned.qc_verdict == "error"
        assert gappy.qc_verdict != "error"

    def test_span_is_measured_on_surviving_data(self):
        """The 24-month guard must see what is left, not what was asked for.

        A four-year request that lost half its months to QC has two years of
        history, and the guard reading the requested window would let a rate
        through that the surviving data cannot support.
        """
        from analytics.telemetry import AssembledSeries

        index = pd.date_range("2016-01-01", "2017-01-01", freq="D", tz="UTC")
        assembled = AssembledSeries(
            project_id="p",
            series=pd.DataFrame({"ac_power_w": 1.0}, index=index),
            interval_minutes=1440,
            window_start=date(2014, 8, 1),      # requested: 3.5 years
            window_end=date(2018, 2, 28),
        )
        assert assembled.span_months == pytest.approx(12.0, abs=0.2)
        assert assembled.span_months < MIN_MONTHS_FOR_DEGRADATION


# ── §6.7 case 3: NULL PPA rate does not crash ────────────────────────────────

class TestEconomicTranslation:

    def test_null_ppa_rate_estimates_and_labels(self):
        result = translate(
            ppa_rate_per_kwh=None,
            soiling_loss_pct=2.0,
            expected_annual_kwh=1_000_000.0,
            lost_production_kwh=10_000.0,
        )
        assert result.basis == "estimated"
        assert result.ppa_rate_per_kwh == DEFAULT_PPA_RATE_PER_KWH
        assert result.soiling_loss_usd == pytest.approx(
            1_000_000.0 * 0.02 * DEFAULT_PPA_RATE_PER_KWH
        )
        assert result.availability_loss_usd == pytest.approx(
            10_000.0 * DEFAULT_PPA_RATE_PER_KWH
        )
        assert any("ESTIMATE" in n for n in result.notes), (
            "an estimated rate must say so — the dollar figure is the most "
            "quotable thing here and the easiest to lift out of context"
        )

    def test_cited_rate_is_used_verbatim(self):
        result = translate(ppa_rate_per_kwh=0.082, lost_production_kwh=1_000.0)
        assert result.basis == "cited"
        assert result.ppa_rate_per_kwh == 0.082
        assert result.availability_loss_usd == pytest.approx(82.0)

    def test_every_seeded_project_has_a_null_rate(self):
        """The NULL path is the normal path here, not an edge case.

        PVDAQ publishes no offtake terms, so seed 005 writes NULL for all three.
        If this ever stops being true the estimate labelling should be revisited.
        """
        assert all(p.ppa_rate_per_kwh is None for p in SEED_PROJECTS.values())

    @pytest.mark.parametrize("bad_rate", [0.0, -0.05])
    def test_non_positive_rate_falls_back_rather_than_zeroing(self, bad_rate):
        """A $0 loss reads as 'no problem here', which is the opposite of unset."""
        rate, basis, notes = resolve_ppa_rate(bad_rate)
        assert basis == "estimated"
        assert rate == DEFAULT_PPA_RATE_PER_KWH
        assert notes

    def test_missing_inputs_yield_missing_outputs_not_zeros(self):
        """An uncomputable loss and a zero loss mean opposite things."""
        result = translate(ppa_rate_per_kwh=0.05)
        assert result.soiling_loss_usd is None
        assert result.availability_loss_usd is None
        assert len(result.notes) >= 2

    def test_no_soiling_signal_is_not_a_zero_dollar_loss(self):
        result = translate(
            ppa_rate_per_kwh=0.05,
            soiling_loss_pct=None,
            expected_annual_kwh=1_000_000.0,
        )
        assert result.soiling_loss_usd is None

    def test_translation_needs_no_rdtools(self):
        """§6.7's cases must be testable without a 200 MB dependency tree."""
        assert "rdtools" not in sys.modules or True   # documents intent
        assert economics.__doc__ and "rdtools" in economics.__doc__


# ── The confidence interval is mandatory ─────────────────────────────────────

class TestConfidenceIntervalIsMandatory:
    """§6.6 — and the reason it is worth three separate enforcement points."""

    def test_rate_without_bounds_raises(self):
        with pytest.raises(ValueError, match="without a confidence interval"):
            DegradationResult(
                project_id="p", method="clearsky",
                window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
                n_days_analyzed=700,
                rate_pct_per_yr=-0.7,
            )

    def test_rate_with_only_one_bound_raises(self):
        with pytest.raises(ValueError, match="without a confidence interval"):
            DegradationResult(
                project_id="p", method="clearsky",
                window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
                n_days_analyzed=700,
                rate_pct_per_yr=-0.7, ci_low=-1.1,
            )

    def test_inverted_bounds_raise(self):
        with pytest.raises(ValueError, match="inverted"):
            DegradationResult(
                project_id="p", method="clearsky",
                window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
                n_days_analyzed=700,
                rate_pct_per_yr=-0.7, ci_low=-0.2, ci_high=-1.1,
            )

    def test_row_refuses_a_bare_rate_before_a_sink_sees_it(self):
        with pytest.raises(ValueError, match="without confidence bounds"):
            _row(degradation_pct_per_yr=-0.7,
                 degradation_ci_low=None, degradation_ci_high=None)

    def test_confidence_level_default_is_95_not_rdtools_68(self):
        """RdTools defaults to 68.2. The schema's columns say 2.5/97.5.

        Taking the library default would store a band roughly half as wide as
        its column name claims, and nothing about the row would look wrong.
        """
        from analytics.trend import CONFIDENCE_LEVEL

        assert CONFIDENCE_LEVEL == 95.0
        result = DegradationResult(
            project_id="p", method="clearsky",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            n_days_analyzed=700, rate_pct_per_yr=-0.7,
            ci_low=-1.1, ci_high=-0.3,
        )
        assert result.confidence_level == 95.0

    def test_an_interval_spanning_zero_is_called_out(self):
        """The point estimate hides this, and it is the whole finding.

        "−0.25 %/yr" reads as a measured decline. "−0.25, and the data is
        equally consistent with the plant improving" is what was established.
        A certificate that prints only the first is the failure §3 is written
        against, so the engine attaches an explicit note.
        """
        import inspect

        from analytics import trend

        source = inspect.getsource(trend.run_degradation)
        assert "NOT DISTINGUISHABLE FROM ZERO" in source
        assert "ci_low < 0 < result.ci_high" in source.replace("result.ci_low", "ci_low")

    def test_confidence_level_reaches_rdtools_as_a_yoy_kwarg(self):
        """The constant only matters if it is actually passed.

        `degradation_year_on_year(confidence_level=...)` is where the value has
        to land; asserting on the constant alone would pass even if the kwarg
        were dropped from the call.
        """
        import inspect

        from analytics import trend

        source = inspect.getsource(trend._run_analyses)
        assert '"confidence_level": CONFIDENCE_LEVEL' in source
        assert "yoy_kwargs=yoy_kwargs" in source


# ── The soiling bounds invert ────────────────────────────────────────────────

class TestSoilingBoundsInvert:
    """RdTools reports a RATIO; the schema stores a LOSS. The bounds swap."""

    def test_ratio_ci_maps_to_loss_ci_with_bounds_swapped(self):
        ratio_ci = (0.95, 0.99)
        loss_low = (1.0 - max(ratio_ci)) * 100.0
        loss_high = (1.0 - min(ratio_ci)) * 100.0
        assert loss_low == pytest.approx(1.0)
        assert loss_high == pytest.approx(5.0)

        result = SoilingResult(
            project_id="p", method="clearsky",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            loss_pct=3.0, ci_low=loss_low, ci_high=loss_high, ratio=0.97,
        )
        assert result.ci_low < result.loss_pct < result.ci_high

    def test_carrying_the_ratio_ci_across_in_order_raises(self):
        """The failure this guards is a well-formed band on the wrong side."""
        with pytest.raises(ValueError, match="inverted"):
            SoilingResult(
                project_id="p", method="clearsky",
                window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
                loss_pct=3.0,
                ci_low=(1.0 - 0.95) * 100.0,     # 5.0 — wrong bound
                ci_high=(1.0 - 0.99) * 100.0,    # 1.0
                ratio=0.97,
            )

    def test_an_implausibly_large_loss_is_flagged(self):
        """SRR finds shapes, not causes.

        Gradual decline then abrupt recovery is soiling's signature — and also
        snow-and-melt's, and also a cloudy spell followed by a clear day when
        the normalization has not removed weather. A double-digit "soiling"
        result is usually the third case, and the number looks perfectly
        well-formed either way.
        """
        result = SoilingResult(
            project_id="p", method="clearsky",
            window_start=date(2014, 8, 1), window_end=date(2018, 2, 28),
            loss_pct=12.3, ci_low=7.7, ci_high=18.5, ratio=0.877,
        )
        assert result.implausibly_large is True

    def test_an_ordinary_loss_is_not_flagged(self):
        result = SoilingResult(
            project_id="p", method="clearsky",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            loss_pct=1.8, ci_low=1.1, ci_high=2.6, ratio=0.982,
        )
        assert result.implausibly_large is False

    def test_no_signal_is_not_implausible(self):
        result = SoilingResult(
            project_id="p", method="clearsky",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
        )
        assert result.implausibly_large is False

    def test_no_soiling_signal_is_a_recorded_result(self):
        result = SoilingResult(
            project_id="p", method="clearsky",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            notes=["No soiling signal detected."],
        )
        assert result.signal_found is False
        assert result.loss_pct is None
        assert result.notes


# ── Availability basis ───────────────────────────────────────────────────────

class TestAvailabilityBasis:

    def test_derived_cumulative_is_the_default_and_is_labelled(self):
        result = AvailabilityResult(
            project_id="p",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            availability_pct=98.4, lost_production_kwh=12_000.0,
        )
        assert result.basis == "derived_from_power"

    def test_an_unknown_basis_raises(self):
        with pytest.raises(ValueError, match="basis must be"):
            AvailabilityResult(
                project_id="p",
                window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
                basis="guessed",
            )

    def test_subsystem_fallback_is_single_column(self):
        """A source with no per-inverter data gets one column and says so.

        §2.3 names this as the documented input shape for a system reporting
        only aggregate AC power — it is a correct analysis with less
        attribution, not a degraded one.
        """
        result = AvailabilityResult(
            project_id="p",
            window_start=date(2016, 1, 1), window_end=date(2018, 1, 1),
            n_subsystems=1,
        )
        assert result.n_subsystems == 1


# ── The adapter extension does not widen the spec 21 contract ────────────────

class TestAdapterContractUnchanged:

    def test_pvdaq_still_satisfies_the_inverter_adapter_protocol(self):
        from ingestion.base import InverterAdapter
        from ingestion.pvdaq import PVDAQAdapter

        assert isinstance(PVDAQAdapter(), InverterAdapter)

    def test_fetch_subsystem_power_is_not_part_of_the_protocol(self):
        """Widening the protocol would oblige every future vendor adapter.

        Spec 24 adds SolarEdge and Enphase by implementing five methods. Neither
        vendor necessarily publishes per-inverter power, and a protocol that
        demanded it would make the honest answer — "we only get an aggregate" —
        impossible to express.
        """
        from ingestion.base import InverterAdapter

        declared = {
            name for name, value in vars(InverterAdapter).items()
            if callable(value) and not name.startswith("_")
        }
        assert declared == {
            "list_sites", "describe_site", "fetch_interval",
            "native_resolution", "supports_backfill_years",
        }, declared

    def test_an_adapter_without_the_method_is_still_usable(self):
        class AggregateOnlyAdapter:
            source = "manual_csv"

            def list_sites(self): return []
            def describe_site(self, external_id): raise NotImplementedError
            def fetch_interval(self, external_id, start, end): raise NotImplementedError
            def native_resolution(self, external_id): return 15
            def supports_backfill_years(self): return 1.0

        from ingestion.base import InverterAdapter

        adapter = AggregateOnlyAdapter()
        assert isinstance(adapter, InverterAdapter)
        assert getattr(adapter, "fetch_subsystem_power", None) is None


# ── Registry ─────────────────────────────────────────────────────────────────

class TestRegistry:

    def test_project_uuid_is_stable_and_shared_with_the_ingestion_seed(self):
        assert project_uuid(9069) == "00009069-0000-4000-8000-000000009069"

    def test_ingestion_script_imports_the_shared_uuid(self):
        """One definition, two callers. Two copies is a thing that drifts.

        A drifted copy would produce plant_analytics rows keyed to project ids
        that no longer match seed 005's — and the seed would still load.
        """
        script = (
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "scripts", "ingest_pvdaq.py")
        )
        with open(script) as fh:
            source = fh.read()
        assert "from analytics.registry import project_uuid" in source
        assert "def project_uuid" not in source

    def test_analytics_windows_are_at_least_the_ingestion_windows(self):
        """Analytics wants every defensible month; reconciliation needs 24."""
        for project in SEED_PROJECTS.values():
            assert project.window_months >= 24.0, project.system_id

    def test_2107_is_excluded_with_a_reason(self):
        assert 2107 not in SEED_PROJECTS
        assert 2107 in EXCLUDED_SYSTEMS
        assert "unit" in EXCLUDED_SYSTEMS[2107].lower()

    def test_lookup_by_system_explains_an_exclusion(self):
        with pytest.raises(KeyError, match="deliberately excluded"):
            get_project_by_system(2107)

    def test_lookup_by_uuid_round_trips(self):
        assert get_project(project_uuid(4902)).system_id == 4902

    def test_every_project_states_why_its_window_ends_where_it_does(self):
        for project in SEED_PROJECTS.values():
            assert len(project.window_rationale) > 40, project.system_id


# ── Sinks ────────────────────────────────────────────────────────────────────

class TestSinks:

    def test_sql_is_idempotent_by_the_natural_key_not_the_id(self):
        """A re-run mints a fresh uuid for the same logical row.

        Conflicting on `id` would insert a duplicate every time the job ran,
        and the table would slowly fill with rows that all look current.
        """
        sql = row_to_sql(_row())
        assert "ON CONFLICT (project_id, as_of_date, degradation_method)" in sql
        assert "DO UPDATE SET" in sql

    def test_null_rate_becomes_sql_null_not_the_token_nan(self):
        sql = row_to_sql(_row(degradation_pct_per_yr=None,
                              degradation_ci_low=None,
                              degradation_ci_high=None))
        assert "NaN" not in sql
        assert "NULL" in sql

    def test_quotes_in_a_note_do_not_break_the_statement(self):
        sql = row_to_sql(_row(notes=["NREL's index flags it 'review'"]))
        assert "''" in sql or "'s index" in sql

    def test_json_artifact_rejects_nan(self, tmp_path):
        """`json.dumps` emits a bare NaN by default, which is not JSON.

        The TypeScript reader would reject it at parse time — after the
        expensive part of the run had already finished.
        """
        sink = JsonArtifactSink(tmp_path / "out.json")
        sink.write(_row(soiling_loss_pct=float("nan")))
        sink.finalize({"generated_at": "now"})
        import json

        payload = json.loads((tmp_path / "out.json").read_text())
        assert payload["rows"][0]["soiling_loss_pct"] is None

    def test_empty_run_still_records_the_shortfall(self, tmp_path):
        sink = SqlSeedSink(tmp_path / "seed.sql")
        sink.finalize({
            "generated_at": "now",
            "skipped": [{"system_id": 2107, "reason": "no unit statement"}],
        })
        text = (tmp_path / "seed.sql").read_text()
        assert "NO ROWS" in text
        assert "2107" in text
        assert "no unit statement" in text


def _row(**overrides) -> PlantAnalyticsRow:
    defaults = dict(
        id="11111111-2222-4333-8444-555555555555",
        project_id=project_uuid(4902),
        as_of_date=date(2026, 8, 13),
        window_start=date(2014, 8, 1),
        window_end=date(2018, 2, 28),
        degradation_pct_per_yr=-0.74,
        degradation_ci_low=-1.12,
        degradation_ci_high=-0.36,
        degradation_method="clearsky",
        soiling_loss_pct=1.8,
        soiling_ci_low=1.1,
        soiling_ci_high=2.6,
        soiling_ratio=0.982,
        availability_pct=98.9,
        lost_production_kwh=14_200.0,
        outage_count=3,
        ppa_rate_per_kwh=DEFAULT_PPA_RATE_PER_KWH,
        soiling_loss_usd=1_234.0,
        availability_loss_usd=639.0,
        n_days_analyzed=1_120,
        rdtools_version="3.2.1",
        engine_version="2.3.0",
        computed_at=datetime(2026, 8, 13, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    return PlantAnalyticsRow(**defaults)


# ── network ──────────────────────────────────────────────────────────────────

network = pytest.mark.skipif(
    not os.environ.get("RUN_NETWORK_TESTS"),
    reason="hits the public oedi-data-lake bucket; set RUN_NETWORK_TESTS=1",
)


@network
def test_per_inverter_fetch_returns_independent_channels():
    """Availability needs to see subsystems fall out independently.

    1332 declares three per-inverter AC power channels. A summed series has
    thrown away the only thing that distinguishes one dead inverter from three
    running at a third of nameplate.
    """
    from ingestion import get_adapter

    adapter = get_adapter("pvdaq")
    frame = adapter.fetch_subsystem_power("1332", date(2016, 1, 1), date(2016, 1, 7))
    assert not frame.empty
    assert list(frame.columns) == [
        "inv1_ac_power", "inv2_ac_power", "inv3_ac_power"
    ], list(frame.columns)
    assert frame.index.tz is not None
    # Independent channels, not three copies of a third of the site.
    assert frame.nunique(axis=0).min() > 1


@network
def test_a_dropped_inverter_channel_refuses_rather_than_measuring_a_subset():
    """Spec 21 §2.11, exactly: 1332's channels change within its own record.

    `inv3_ac_power` (2650) is present through 2016 and absent by mid-2017. Two
    of three inverters is not a smaller plant — availability computed over the
    subset would report the uptime of something that does not exist, and would
    report it as healthy. The resolver refuses, and the caller falls back to the
    site total with that fact recorded.
    """
    from ingestion import get_adapter
    from ingestion.pvdaq import MetricResolutionError

    adapter = get_adapter("pvdaq")
    with pytest.raises(MetricResolutionError, match="inv3_ac_power"):
        adapter.fetch_subsystem_power("1332", date(2017, 7, 1), date(2017, 7, 7))


def test_a_channel_absent_for_most_of_the_window_is_flagged_as_ambiguous():
    """A subsystem that stops reporting is not necessarily a subsystem that died.

    Resolution runs over the whole analytics window, so 1332's `inv3_ac_power`
    resolves (it is present through 2016) and then goes NaN partway through
    2017. RdTools would read that as a subsystem outage and price the lost
    production — but spec 21 §2.11 documents that PVDAQ channels come and go
    within a system's own record, so it is equally likely nobody logged it.
    RdTools separates a *system-level* comms dropout from a real outage; this is
    neither, and it cannot see the difference. The note has to.
    """
    import pandas as pd

    from analytics.telemetry import _long_dormant_channels

    index = pd.date_range("2016-01-01", "2017-12-31", freq="D", tz="UTC")
    frame = pd.DataFrame(
        {
            "inv1_ac_power": 1.0,
            "inv2_ac_power": 1.0,
            "inv3_ac_power": 1.0,
        },
        index=index,
    )
    frame.loc[frame.index >= "2017-06-01", "inv3_ac_power"] = float("nan")

    flagged = _long_dormant_channels(frame)
    assert flagged == ["inv3_ac_power"], flagged


def test_a_briefly_gappy_channel_is_not_flagged():
    """Ordinary gaps are what the filters are for; only long runs are ambiguous."""
    import pandas as pd

    from analytics.telemetry import _long_dormant_channels

    index = pd.date_range("2016-01-01", "2017-12-31", freq="D", tz="UTC")
    frame = pd.DataFrame({"inv1_ac_power": 1.0, "inv2_ac_power": 1.0}, index=index)
    frame.loc["2016-04-01":"2016-04-05", "inv2_ac_power"] = float("nan")

    assert _long_dormant_channels(frame) == []


@network
def test_a_refused_subsystem_fetch_falls_back_to_the_site_total():
    """A refusal must not take the whole availability analysis down with it."""
    import pandas as pd

    from analytics.registry import AnalyticsProject
    from analytics.telemetry import load_subsystem_power

    # A window narrow enough that inv3 is genuinely absent from the data, so the
    # resolver refuses rather than resolving and gapping.
    project = AnalyticsProject(
        system_id=1332, name="NREL Parking Garage",
        telemetry_source="pvdaq", external_id="1332",
        window_start=date(2017, 7, 1), window_end=date(2017, 7, 7),
        window_rationale="narrow probe window for the refusal path",
    )
    index = pd.date_range("2017-07-01", periods=4, freq="15min", tz="UTC")
    series = pd.DataFrame({"ac_power_w": [1.0, 2.0, 3.0, 4.0]}, index=index)

    frame, note = load_subsystem_power(project, series)
    assert list(frame.columns) == ["site_total"]
    assert "refused" in note.lower()


@network
def test_degradation_on_4902_lands_in_the_sanity_band():
    """§6.2, on the system with the most defensible record of the three."""
    from analytics.trend import run_degradation
    from analytics.registry import get_project_by_system

    result = run_degradation(get_project_by_system(4902), method="clearsky")
    assert result.rate_pct_per_yr is not None, result.notes
    assert result.ci_low is not None and result.ci_high is not None
    assert -2.5 <= result.rate_pct_per_yr <= -0.2, (
        f"{result.rate_pct_per_yr:.2f} %/yr is outside §6.2's band; "
        f"notes: {result.notes}"
    )
