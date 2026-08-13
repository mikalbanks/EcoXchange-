"""Degradation, soiling and availability via NREL RdTools (spec 22 §4).

Nothing here reimplements a published method. RdTools is the reference
implementation behind the methods this module claims to apply, it is
peer-reviewed and industry-validated, and §0 is explicit: *build nothing here
that RdTools already does*. What this module does is the part RdTools cannot:
decide what series to hand it, freeze the assumptions it ran under, and refuse to
report a number that is not defensible.

Three of those refusals carry most of the weight.

**Under 24 months, there is no rate.** Year-on-year degradation compares each
daily point to the same point one year prior. A 23-month record has no second
year to compare the first against for most of its length, and whatever RdTools
returns from it is not a degradation rate. The guard runs *before* `TrendAnalysis`
is constructed, and the result carries `rate_pct_per_yr=None` with a note. Never
a point estimate.

**The confidence interval is 95%, and it has to be asked for.**
`rdtools.degradation.degradation_year_on_year` defaults to
`confidence_level=68.2` — one sigma. The schema's columns are named for the 2.5th
and 97.5th percentiles. Taking the default would store a band roughly half as
wide as its column name claims, in the one number most likely to be quoted at a
warranty adjuster, and nothing about the row would look wrong. Every call here
passes `confidence_level=95` explicitly.

**Clear-sky is the default, and the disagreement is the finding.** §2.2:
clear-sky normalization matches the hardware-free premise and avoids
irradiance-sensor drift, the failure mode NREL specifically documents, where a
poorly maintained pyranometer reads low and the plant appears to be degrading.
Sensor analysis runs only where a verified POA channel exists. Where both run and
differ by more than 0.5 %/yr, that disagreement is surfaced on both rows — it is
a diagnostic about the instrumentation, and averaging it away destroys the only
signal it carries.

Cost: a multi-year clear-sky analysis is minutes, not seconds. This is a
scheduled job and never a request-path call (§4).
"""
from __future__ import annotations

import uuid as _uuid
import warnings
from datetime import date, datetime, timezone

import numpy as np
import pandas as pd

from verification_engine import __version__ as ENGINE_VERSION
from verification_engine.losses import apply_losses_series
from verification_engine.modelchain import expected_ac_energy

from .economics import translate
from .plant import normalization_inputs, site_config
from .registry import AnalyticsProject, get_project
from .results import (
    METHOD_DISAGREEMENT_THRESHOLD,
    MIN_MONTHS_FOR_DEGRADATION,
    PLAUSIBLE_SOILING_MAX_PCT,
    AvailabilityResult,
    DegradationResult,
    PlantAnalyticsRow,
    SoilingResult,
)
from .telemetry import AssembledSeries, load_series, load_subsystem_power

#: The 2.5th/97.5th percentiles §3's schema asks for. RdTools' own default is
#: 68.2 — see the module docstring.
CONFIDENCE_LEVEL = 95.0

#: Sub-minute and 1-minute telemetry over a multi-year window is millions of
#: rows, and RdTools' clear-sky path models solar position for every one of them.
#: Resampling to a 15-minute grid cuts that by 15x while staying far below the
#: daily aggregation the analysis actually runs on, so it costs no resolution
#: that the method uses. `max_timedelta` stops the interpolation bridging real
#: gaps: without it, a two-week outage would be filled with a straight line and
#: read as production.
INTERP_FREQ = "15min"
MAX_TIMEDELTA = pd.Timedelta("1h")

#: The grid AvailabilityAnalysis runs on. Same reasoning as INTERP_FREQ, plus a
#: hard requirement: RdTools derives the interval length from the index
#: frequency and refuses an irregular one outright.
AVAILABILITY_FREQ = "15min"


def _rdtools_version() -> str:
    import rdtools

    return getattr(rdtools, "__version__", "unknown")


# ── Assembly ──────────────────────────────────────────────────────────────────

#: Assembling a window costs an S3 walk and a clear-sky analysis costs minutes,
#: and `refresh_analytics` needs degradation and soiling from the same run. Keyed
#: on (project_id, method) and held for the life of the process only — this is a
#: batch job, and a cache that outlived a run would be a way for two rows to
#: disagree about what data they saw.
_ANALYSIS_CACHE: dict[tuple[str, str], dict] = {}


def _resolve(project_id) -> AnalyticsProject:
    if isinstance(project_id, AnalyticsProject):
        return project_id
    return get_project(str(project_id))


def build_trend_analysis(project_id, window_years: float = 2.0):
    """A configured `TrendAnalysis` for the project's analytics window (§4).

    `window_years` trims the *end* of the record backwards, for callers that want
    a shorter view than the registry's window. It does not extend one: the
    registry's window is bounded by what the published data actually supports,
    and every bound has a documented reason (units breaks, sentinel stretches,
    an unexplained output collapse).
    """
    project = _resolve(project_id)
    assembled = load_series(project)
    if assembled.series.empty:
        raise ValueError(
            f"project {project.project_id}: no usable telemetry in "
            f"{project.window_start} .. {project.window_end}"
        )

    series = assembled.series
    if window_years:
        cutoff = series.index.max() - pd.Timedelta(days=window_years * 365.25)
        trimmed = series[series.index >= cutoff]
        if not trimmed.empty:
            series = trimmed

    return _construct(project, series)[0]


def _construct(project: AnalyticsProject, series: pd.DataFrame, method: str = "clearsky"):
    """`(TrendAnalysis, provenance, site, cfg)` for an already-assembled series."""
    from ingestion import get_adapter
    from rdtools import TrendAnalysis

    adapter = get_adapter(project.telemetry_source)
    site = adapter.describe_site(project.external_id)
    cfg = site_config(site)

    kwargs = {
        "pv": series["ac_power_w"].astype(float),
        "pv_input": "power",
        "gamma_pdc": cfg.array.gamma_pdc,
        "temperature_model": cfg.array.temperature_model,
        "power_dc_rated": cfg.array.dc_capacity_kw * 1000.0,
        "aggregation_freq": "D",
        "interp_freq": INTERP_FREQ,
        "max_timedelta": MAX_TIMEDELTA,
    }
    poa_source = "none"
    if "poa_irradiance_wm2" in series.columns and series["poa_irradiance_wm2"].notna().any():
        kwargs["poa_global"] = series["poa_irradiance_wm2"].astype(float)
        poa_source = "site_sensor"
    elif method == "clearsky":
        # RdTools' clear-sky workflow needs a MEASURED irradiance series even
        # though it normalizes against the modelled one: `_filter` calls
        # `clearsky_filter` unconditionally for `case == "clearsky"`, and that
        # filter is a comparison of measured against modelled. It is not
        # configurable — deleting it from `filter_params` has no effect — so a
        # system with no pyranometer cannot run the analysis at all as written.
        #
        # Satellite reanalysis supplies the measured leg. That is not a
        # workaround dressed up as a method: hardware-free measurement is the
        # premise of this product, the same NASA POWER series already drives the
        # expected-energy leg these systems are reconciled against, and the
        # resulting clear-sky index is a real comparison of observed sky against
        # clear sky rather than a tautology.
        #
        # What must NOT happen is passing the modelled clear-sky series as both
        # arguments. The clear-sky index would be 1.0 everywhere, every period
        # would pass the filter, and the run would claim clear-sky filtering
        # while filtering nothing.
        kwargs["poa_global"] = _satellite_poa(cfg, series.index)
        poa_source = "satellite_reanalysis"
    if "ambient_temp_c" in series.columns:
        kwargs["temperature_ambient"] = series["ambient_temp_c"].astype(float)
    if "module_temp_c" in series.columns:
        kwargs["temperature_cell"] = series["module_temp_c"].astype(float)
    if "wind_speed_ms" in series.columns:
        kwargs["windspeed"] = series["wind_speed_ms"].astype(float)

    ta = TrendAnalysis(**kwargs)

    provenance = {
        **normalization_inputs(cfg),
        "poa_source": poa_source,
        "interp_freq": INTERP_FREQ,
        "max_timedelta": str(MAX_TIMEDELTA),
        "aggregation_freq": "D",
        "confidence_level": CONFIDENCE_LEVEL,
        "channels_used": sorted(
            c for c in series.columns if series[c].notna().any()
        ),
        "site_qa_status": site.extra.get("qa_status"),
        "site_qa_issue": site.extra.get("qa_issue"),
        "tilt_rows": site.extra.get("tilt_rows"),
        "azimuth_rows": site.extra.get("azimuth_rows"),
    }
    return ta, provenance, site, cfg


def _pvlib_location(cfg):
    import pvlib

    return pvlib.location.Location(
        latitude=cfg.location.latitude,
        longitude=cfg.location.longitude,
        altitude=cfg.location.altitude,
        tz=cfg.location.tz,
    )


def _clearsky_poa(cfg, index: pd.DatetimeIndex) -> pd.Series:
    """Modelled clear-sky plane-of-array irradiance on `index`."""
    import pvlib

    location = _pvlib_location(cfg)
    solar = location.get_solarposition(index)
    clearsky = location.get_clearsky(index, solar_position=solar)
    return pvlib.irradiance.get_total_irradiance(
        cfg.array.surface_tilt,
        cfg.array.surface_azimuth,
        solar["apparent_zenith"],
        solar["azimuth"],
        clearsky["dni"],
        clearsky["ghi"],
        clearsky["dhi"],
        albedo=0.25,
    )["poa_global"]


def _satellite_poa(cfg, index: pd.DatetimeIndex) -> pd.Series:
    """Observed plane-of-array irradiance from satellite reanalysis.

    The stand-in for a site pyranometer, transposed from the same NASA POWER
    series that drives the expected-energy leg. Perez, matching
    `modelchain.py`'s `transposition_model="perez"` — a different transposition
    here would put the two legs on different sky models.

    NASA POWER is hourly and the analysis grid is sub-hourly, so the result is
    interpolated. That is a resolution mismatch rather than an accuracy one:
    what it feeds is a clear-sky index used to decide whether a period was
    cloudy, and cloud cover does not resolve at fifteen minutes in an hourly
    reanalysis product either way.
    """
    import pvlib

    from verification_engine.irradiance import fetch_nasa_power

    location = _pvlib_location(cfg)
    start = index.min().date()
    end = index.max().date()
    weather = fetch_nasa_power(cfg.location, start.isoformat(), end.isoformat())
    weather = weather.tz_convert("UTC")

    solar = location.get_solarposition(weather.index)
    poa = pvlib.irradiance.get_total_irradiance(
        cfg.array.surface_tilt,
        cfg.array.surface_azimuth,
        solar["apparent_zenith"],
        solar["azimuth"],
        weather["dni"],
        weather["ghi"],
        weather["dhi"],
        albedo=0.25,
        model="perez",
        dni_extra=pvlib.irradiance.get_extra_radiation(weather.index),
        airmass=location.get_airmass(weather.index)["airmass_relative"],
    )["poa_global"]

    combined = poa.reindex(poa.index.union(index)).interpolate(
        method="time", limit_direction="both"
    )
    return combined.reindex(index).clip(lower=0.0)


def _prepare_clearsky(ta, cfg, has_poa: bool, notes: list[str]) -> None:
    """Configure the clear-sky workflow, including for systems with no POA sensor.

    RdTools models clear-sky POA itself, but only via `_calc_clearsky_poa`,
    which with `times=None` reads `self.poa_global.index` to choose its grid and
    then rescales the modelled series to the measured one. Supplying
    `poa_global_clearsky` directly skips that path, which is what we want: the
    rescale-to-measured step is the one part of the clear-sky workflow that
    reintroduces a dependence on the irradiance measurement, and §2.2 chose this
    method precisely to avoid that dependence.

    (Without a `poa_global` at all, `_calc_clearsky_poa` dereferences `None` and
    RdTools catches the AttributeError and re-raises it as *"No
    poa_global_clearsky. 'set_clearsky' must be run prior to
    'clearsky_analysis'"* — which is actively misleading, because `set_clearsky`
    was run. `_construct` supplies satellite irradiance so that path is never
    reached.)
    """
    ta.set_clearsky(
        pvlib_location=_pvlib_location(cfg),
        pv_tilt=cfg.array.surface_tilt,
        pv_azimuth=cfg.array.surface_azimuth,
        poa_global_clearsky=_clearsky_poa(cfg, ta.pv_energy.index),
    )
    if not has_poa:
        notes.append(
            "This system publishes no plane-of-array irradiance channel. "
            "Clear-sky POA is modelled from solar geometry, and the observed "
            "irradiance the clear-sky filter compares it against comes from "
            "NASA POWER satellite reanalysis — the same source behind the "
            "expected-energy leg — rather than a site pyranometer. Degradation "
            "is therefore measured without depending on site instrumentation, "
            "which is the point of the clear-sky method; the trade is that "
            "hourly reanalysis resolves cloud cover more coarsely than an "
            "on-site sensor would, so the clear-sky filter is a blunter "
            "instrument here and the confidence interval is correspondingly "
            "wider."
        )


def _run_analyses(project: AnalyticsProject, method: str) -> dict:
    """Run degradation and soiling in one RdTools pass, cached per method.

    One pass for both because they share the whole preprocessing chain —
    normalization, filtering, daily aggregation — and running them separately
    would do the expensive half twice for no benefit. §2.1 supports both in a
    single `analyses=[...]` call for exactly this reason.
    """
    key = (project.project_id, method)
    if key in _ANALYSIS_CACHE:
        return _ANALYSIS_CACHE[key]

    assembled = load_series(project)
    result: dict = {
        "assembled": assembled,
        "degradation": None,
        "soiling": None,
        "provenance": {},
        "notes": list(assembled.notes),
        "error": None,
    }

    if assembled.series.empty:
        result["error"] = (
            f"no usable telemetry in {project.window_start} .. "
            f"{project.window_end}"
        )
        _ANALYSIS_CACHE[key] = result
        return result

    ta, provenance, site, cfg = _construct(project, assembled.series, method=method)
    result["provenance"] = {**provenance, "method": method}
    result["site"] = site
    result["cfg"] = cfg

    if method == "sensor" and not assembled.has_poa:
        result["error"] = (
            "sensor analysis needs a verified plane-of-array irradiance channel "
            "and this system publishes none. Substituting GHI would silently make "
            "it a different analysis (§2.2)."
        )
        _ANALYSIS_CACHE[key] = result
        return result

    analyses = ["yoy_degradation"]
    # Soiling needs enough record to see a soiling-and-cleaning cycle at all.
    # Asking for it on a few months does not fail, it returns noise.
    if assembled.span_months >= 12:
        analyses.append("srr_soiling")
    else:
        result["notes"].append(
            f"Soiling analysis not attempted: {assembled.span_months:.1f} months "
            f"of record is too short for SRR to separate a soiling ramp from "
            f"seasonal variation."
        )

    yoy_kwargs = {"confidence_level": CONFIDENCE_LEVEL}

    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            if method == "clearsky":
                _prepare_clearsky(ta, cfg, assembled.has_poa, result["notes"])
                ta.clearsky_analysis(analyses=analyses, yoy_kwargs=yoy_kwargs)
                bucket = ta.results["clearsky"]
            else:
                ta.sensor_analysis(analyses=analyses, yoy_kwargs=yoy_kwargs)
                bucket = ta.results["sensor"]
        for w in caught:
            text = str(w.message).strip().replace("\n", " ")
            if text:
                result["notes"].append(f"RdTools warning: {text[:400]}")
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        _ANALYSIS_CACHE[key] = result
        return result

    result["degradation"] = bucket.get("yoy_degradation")
    result["soiling"] = bucket.get("srr_soiling")
    _ANALYSIS_CACHE[key] = result
    return result


# ── Degradation ───────────────────────────────────────────────────────────────

def run_degradation(project_id, method: str = "clearsky") -> DegradationResult:
    """Year-on-year degradation rate with a 95% confidence interval (§4)."""
    project = _resolve(project_id)
    assembled = load_series(project)

    base = {
        "project_id": project.project_id,
        "method": method,
        "window_start": project.window_start,
        "window_end": project.window_end,
        "n_days_analyzed": assembled.n_days,
    }

    # The 24-month guard, before any RdTools object is built. §4: under 24 months
    # YoY "returns nothing meaningful", so the correct output is a stated absence.
    if assembled.span_months < MIN_MONTHS_FOR_DEGRADATION:
        return DegradationResult(
            **base,
            rate_pct_per_yr=None,
            notes=[
                f"No degradation rate: {assembled.span_months:.1f} months of "
                f"usable record, against the {MIN_MONTHS_FOR_DEGRADATION:.0f} "
                f"months year-on-year analysis requires. YoY compares each point "
                f"to the same point one year prior, so a shorter record has "
                f"nothing to compare most of itself against. A point estimate "
                f"here would be fabricated rather than conservative.",
                *assembled.notes,
            ],
        )

    analysis = _run_analyses(project, method)
    if analysis["error"]:
        return DegradationResult(
            **base,
            rate_pct_per_yr=None,
            notes=[f"No degradation rate: {analysis['error']}",
                   *analysis["notes"]],
        )

    yoy = analysis["degradation"]
    if not yoy or yoy.get("p50_rd") is None:
        return DegradationResult(
            **base,
            rate_pct_per_yr=None,
            notes=["No degradation rate: RdTools returned no year-on-year "
                   "result for this window.", *analysis["notes"]],
        )

    rate = float(yoy["p50_rd"])
    ci = yoy.get("rd_confidence_interval")
    if ci is None or len(ci) != 2 or not all(np.isfinite(ci)):
        # Refused rather than stored bare. §3: a rate without an uncertainty band
        # is not a defensible number, and this is the number the paid tier
        # exists to defend.
        return DegradationResult(
            **base,
            rate_pct_per_yr=None,
            notes=[
                f"Degradation rate suppressed: RdTools returned p50_rd="
                f"{rate:.4f} %/yr with no usable confidence interval "
                f"({ci!r}). §3 makes the interval mandatory, so the rate is "
                f"withheld rather than published without it.",
                *analysis["notes"],
            ],
        )

    notes = list(analysis["notes"])
    result = DegradationResult(
        **base,
        rate_pct_per_yr=rate,
        ci_low=float(min(ci)),
        ci_high=float(max(ci)),
        confidence_level=CONFIDENCE_LEVEL,
        notes=notes,
    )
    if result.within_plausible_range is False:
        notes.append(
            f"Rate of {rate:.2f} %/yr falls outside the −0.2 .. −2.5 %/yr band "
            f"§6.2 treats as plausible for crystalline silicon. Reported as "
            f"measured, with the site's caveats attached — the band is a "
            f"prompt to look, not a filter."
        )

    # An interval spanning zero is the single most important thing a reader can
    # be told about a degradation rate, and it is the thing a point estimate
    # hides most effectively. "−0.25 %/yr" reads as a measurement of decline;
    # "−0.25, and the data is equally consistent with the plant improving" is
    # what was actually established. A certificate that omits this is the exact
    # failure §3 is written against.
    if result.ci_low is not None and result.ci_high is not None:
        if result.ci_low < 0 < result.ci_high:
            notes.append(
                f"NOT DISTINGUISHABLE FROM ZERO: the 95% interval runs from "
                f"{result.ci_low:.2f} to {result.ci_high:.2f} %/yr and includes "
                f"zero. This analysis did not establish that the plant is "
                f"degrading. The point estimate of {rate:.2f} %/yr is the "
                f"centre of that range and should not be quoted on its own — "
                f"the honest summary is that the available record is too short "
                f"or too noisy to resolve a trend of this size."
            )
        elif abs(result.ci_high - result.ci_low) > 2.0:
            notes.append(
                f"WIDE INTERVAL: the 95% band spans "
                f"{abs(result.ci_high - result.ci_low):.2f} percentage points. "
                f"The sign of the trend is established but its magnitude is "
                f"not well constrained; a longer record or on-site irradiance "
                f"would narrow it."
            )
    for caveat in project.caveats:
        notes.append(f"Site caveat: {caveat}")
    return result


# ── Soiling ───────────────────────────────────────────────────────────────────

def run_soiling(project_id, method: str = "clearsky") -> SoilingResult:
    """Stochastic rate-and-recovery soiling loss (§4).

    RdTools reports a soiling **ratio** (0.98 means 2% lost) and the schema
    stores a **loss percentage**, so the conversion inverts the bound order: the
    lower bound on the loss comes from the *upper* bound on the ratio. Carrying
    the interval across in order produces a well-formed, inverted, wrong band —
    which is why `SoilingResult` raises on it rather than trusting this line.
    """
    project = _resolve(project_id)
    base = {
        "project_id": project.project_id,
        "method": method,
        "window_start": project.window_start,
        "window_end": project.window_end,
    }

    analysis = _run_analyses(project, method)
    if analysis["error"]:
        return SoilingResult(
            **base, notes=[f"No soiling result: {analysis['error']}"]
        )

    srr = analysis["soiling"]
    if not srr or srr.get("p50_sratio") is None:
        # §6.4: no soiling is a legitimate result for many sites and must not be
        # forced. A site in a wet climate with no dust source genuinely has none.
        return SoilingResult(
            **base,
            notes=[
                "No soiling signal detected. SRR found no recoverable "
                "soiling-and-cleaning pattern in this window. That is a "
                "legitimate result for many sites — it is recorded as a finding, "
                "not treated as a failed analysis (§6.4).",
                *analysis["notes"],
            ],
        )

    ratio = float(srr["p50_sratio"])
    ci = srr.get("sratio_confidence_interval")
    loss_pct = (1.0 - ratio) * 100.0

    ci_low = ci_high = None
    notes = list(analysis["notes"])
    if ci is not None and len(ci) == 2 and all(np.isfinite(ci)):
        # The inversion: ratio_high -> loss_low.
        ci_low = (1.0 - float(max(ci))) * 100.0
        ci_high = (1.0 - float(min(ci))) * 100.0
    else:
        notes.append(
            f"Soiling loss carries no confidence interval: RdTools returned "
            f"{ci!r}. The point estimate is reported; treat it as indicative."
        )

    result = SoilingResult(
        **base,
        loss_pct=loss_pct,
        ci_low=ci_low,
        ci_high=ci_high,
        ratio=ratio,
        notes=notes,
    )

    if result.implausibly_large:
        poa_source = (analysis.get("provenance") or {}).get("poa_source")
        notes.append(
            f"TREAT WITH CAUTION: {loss_pct:.1f}% is far above the "
            f"{PLAUSIBLE_SOILING_MAX_PCT:.0f}% that soiling plausibly reaches "
            f"outside a desert site with no cleaning programme. SRR identifies "
            f"soiling by its shape — gradual decline, abrupt recovery — and "
            f"anything with that shape reads as soiling, including snow cover "
            f"and melt, and including weather itself whenever the normalization "
            f"has not fully removed it."
        )
        if poa_source == "satellite_reanalysis":
            notes.append(
                "The likeliest explanation here is the second one. This system "
                "has no irradiance sensor, so clear-sky filtering runs against "
                "hourly satellite reanalysis interpolated to the analysis grid. "
                "That filter is blunt: cloudy periods survive it, and a run of "
                "cloudy days followed by a clear one has exactly the "
                "decline-then-recovery signature SRR is looking for. Read this "
                "number as evidence that the site needs an irradiance sensor "
                "before a soiling claim can be made, NOT as a cleaning budget."
            )
    return result


# ── Availability ──────────────────────────────────────────────────────────────

def run_availability(project_id, period: date | None = None) -> AvailabilityResult:
    """Uptime and lost production, monthly (§2.3).

    The value here is the distinction the reconciliation engine cannot make: a
    genuine outage costs production, a datalogger communication dropout costs
    nothing, and both look identical in a monthly kWh total. RdTools separates
    them by checking whether cumulative metered energy advanced across the gap.

    That check needs a meter that keeps counting while the telemetry link is
    down. Where the system publishes one, `basis='metered'`. Where it does not,
    cumulative energy is integrated from the same power series that goes NaN
    during the dropout — so across any gap the derived cumulative shows no
    advance, and a comms interruption is indistinguishable from a real outage.
    The result then reads as a **lower bound on availability**, is marked
    `basis='derived_from_power'`, and carries that caveat wherever it is shown.
    """
    import rdtools
    from rdtools.availability import AvailabilityAnalysis

    project = _resolve(project_id)
    assembled = load_series(project)
    base = {
        "project_id": project.project_id,
        "window_start": project.window_start,
        "window_end": project.window_end,
    }

    if assembled.series.empty:
        return AvailabilityResult(
            **base, notes=["No availability result: no usable telemetry."]
        )

    # RdTools' `energy_from_power` needs a regular index — it derives the
    # interval length from the index frequency and raises "Could not determine
    # period of input power" on anything else. An assembled window never has
    # one: it is months concatenated across gaps, refused periods and logger
    # rate changes. Resampling to an explicit grid is what makes it an input.
    #
    # Gaps are preserved as NaN rather than filled. AvailabilityAnalysis reads
    # NaN, zero and very-low values as the signature of an outage, so bridging a
    # gap here would erase the exact events being measured.
    # Power channels average over the bucket; a CUMULATIVE meter must take the
    # last reading in it instead. Averaging a running total turns each bucket
    # into its midpoint, which drags every reading backwards by half an interval
    # and understates the energy delivered across any gap — the exact quantity
    # the comms-vs-outage test reads.
    resampler = assembled.series.resample(AVAILABILITY_FREQ)
    series = resampler.mean()
    if "meter_export_wh" in assembled.series.columns:
        series["meter_export_wh"] = resampler["meter_export_wh"].last()

    # Everything below is in KILOwatts, not watts.
    #
    # RdTools has no unit system: `energy_from_power` multiplies power by an
    # interval, so the energy it returns is in whatever base unit the power came
    # in. Handing it watts makes every energy output Wh, and `lost_production`
    # then lands in a column named `lost_production_kwh` a thousand times too
    # large. It looks like a number, and on 1332 it looked like 858 GWh lost
    # from a 1.15 MW plant — 33x more than that plant can physically generate in
    # the window, which is only obviously wrong if someone checks it against the
    # nameplate.
    #
    # Converting once at the boundary is what keeps the four inputs consistent
    # with each other as well: `meter_export_wh / 1000` is kWh, so a metered
    # cumulative paired with watt power would have carried the same 1000x
    # mismatch in the opposite direction.
    power_system = series["ac_power_w"].astype(float) / 1000.0

    subsystem, subsystem_note = load_subsystem_power(project, series)
    subsystem = subsystem.reindex(series.index) / 1000.0
    notes = [
        f"Subsystem power: {subsystem_note}.",
        f"Series resampled to a regular {AVAILABILITY_FREQ} grid for this "
        f"analysis; gaps are preserved as missing rather than filled, since a "
        f"filled gap is an erased outage.",
    ]
    if len(subsystem.columns) < 2:
        notes.append(
            "With a single power channel RdTools cannot see one subsystem fall "
            "out while others keep producing, so a partial outage is only "
            "visible as a shortfall against expectation. Multi-inverter "
            "attribution needs per-inverter telemetry."
        )

    # Cumulative energy — metered where published, derived otherwise.
    if "meter_export_wh" in series.columns and series["meter_export_wh"].notna().any():
        energy_cumulative = series["meter_export_wh"].astype(float) / 1000.0
        basis = "metered"
        notes.append(
            "Cumulative energy comes from the system's own revenue-meter "
            "channel, which is what lets a communications dropout be told apart "
            "from a real outage."
        )
    else:
        energy_cumulative = rdtools.energy_from_power(power_system).cumsum()
        energy_cumulative = energy_cumulative.reindex(power_system.index).ffill()
        basis = "derived_from_power"
        notes.append(
            "No cumulative meter channel on this system, so cumulative energy is "
            "integrated from the same AC power series the analysis is testing. "
            "That series is NaN during a communications dropout, so the derived "
            "cumulative does not advance across one either — which is exactly "
            "the signal the comms-vs-outage split relies on. Genuine outages and "
            "comms interruptions are therefore NOT reliably separated here, and "
            "availability should be read as a lower bound."
        )

    try:
        power_expected = _expected_power_series(project, series.index) / 1000.0
    except Exception as exc:
        return AvailabilityResult(
            **base,
            basis=basis,
            n_subsystems=len(subsystem.columns),
            notes=[*notes,
                   f"No availability result: the expected-power leg could not be "
                   f"built ({type(exc).__name__}: {exc}). RdTools needs it to "
                   f"size a loss."],
        )

    try:
        aa = AvailabilityAnalysis(
            power_system, subsystem, energy_cumulative, power_expected
        )
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            aa.run(rollup_period="ME")
        for w in caught:
            text = str(w.message).strip().replace("\n", " ")
            if text:
                notes.append(f"RdTools warning: {text[:400]}")
    except Exception as exc:
        return AvailabilityResult(
            **base,
            basis=basis,
            n_subsystems=len(subsystem.columns),
            notes=[*notes, f"No availability result: {type(exc).__name__}: {exc}"],
        )

    results = aa.results
    monthly = [
        {
            "period": idx.strftime("%Y-%m"),
            "availability_pct": _finite(row.get("availability"), scale=100.0),
            "lost_production_kwh": _finite(row.get("lost_production")),
            "actual_production_kwh": _finite(row.get("actual_production")),
        }
        for idx, row in results.iterrows()
    ]
    if period is not None:
        wanted = period.strftime("%Y-%m")
        if not any(m["period"] == wanted for m in monthly):
            notes.append(
                f"Requested period {wanted} is not in the rollup; the window "
                f"covers {monthly[0]['period']} .. {monthly[-1]['period']}."
                if monthly else f"Requested period {wanted} is not in the rollup."
            )

    # Drop non-finite months before totalling, and say how many.
    #
    # rdtools 3.2.1 `availability.py:514` scales an outage's production fill by
    # `row['energy_actual'] / subset_energy.sum()`. For an outage that falls
    # entirely at night the expected energy over its window is zero, so that is
    # a divide-by-zero and the month's loss comes back `inf`. It is an edge case
    # in the library, not in the data — a plant being down at 2am is ordinary.
    #
    # Summing across it would poison the whole window: one `inf` month makes the
    # total `inf`, and the earlier physical-plausibility guard would then
    # suppress every figure. On 4902 that discarded 41 perfectly good months to
    # protect against 3. Excluding the affected months and reporting the
    # exclusion keeps the result and keeps it honest.
    finite = results[
        np.isfinite(results["lost_production"])
        & np.isfinite(results["actual_production"])
    ]
    dropped = len(results) - len(finite)
    if dropped:
        notes.append(
            f"{dropped} of {len(results)} month(s) excluded from the totals: "
            f"RdTools returned a non-finite loss for them. This is a known edge "
            f"case in rdtools {_rdtools_version()} (availability.py:514) where "
            f"an outage falling entirely within night hours has zero expected "
            f"energy over its window, and the production-fill scaling divides by "
            f"it. The remaining {len(finite)} month(s) are unaffected. "
            f"Availability below is computed over those, so it describes "
            f"{len(finite)}/{len(results)} of the window rather than all of it."
        )

    lost_total = float(finite["lost_production"].sum(skipna=True))
    actual_total = float(finite["actual_production"].sum(skipna=True))
    denominator = lost_total + actual_total
    availability_pct = (
        (1.0 - lost_total / denominator) * 100.0 if denominator > 0 else None
    )
    if availability_pct is None:
        # Outages can still be detected when the production totals cannot be
        # formed — the outage scan reads the power series, the totals read the
        # corrected cumulative — and reporting a count beside a blank percentage
        # invites the reader to infer the plant was fine. Say what is missing.
        notes.append(
            f"No availability percentage: the rolled-up production totals came "
            f"to {denominator:.1f} kWh, so there is no denominator to express "
            f"uptime against. Any outage count below describes events detected "
            f"in the power series, and must NOT be read as evidence of good or "
            f"bad availability — the measurement did not complete."
        )

    # A plant cannot lose more than it could ever have made. This is the check
    # that catches a unit error, which is the failure mode this code path has
    # actually produced: RdTools has no unit system, so handing it watts instead
    # of kilowatts silently multiplies every energy output by 1000 and the
    # result still looks like a number. On 1332 that read as 858 GWh lost from a
    # 1.15 MW plant — impossible by a factor of 33, and invisible without
    # comparing it to the nameplate.
    #
    # Refused rather than clamped, in the same spirit as the adapter's magnitude
    # guard: a figure that violates conservation of energy is not a measurement
    # to be scaled back into range, it is evidence that the computation is
    # wrong, and publishing a smaller wrong number would be worse than
    # publishing none.
    if availability_pct is not None:
        from ingestion import get_adapter

        adapter = get_adapter(project.telemetry_source)
        cfg = site_config(adapter.describe_site(project.external_id))
        window_hours = (series.index.max() - series.index.min()).total_seconds() / 3600.0
        physical_max_kwh = cfg.array.dc_capacity_kw * window_hours
        if lost_total > physical_max_kwh:
            notes.append(
                f"AVAILABILITY SUPPRESSED: the analysis reported "
                f"{lost_total:,.0f} kWh of lost production, but a "
                f"{cfg.array.dc_capacity_kw:,.0f} kW plant can generate at most "
                f"{physical_max_kwh:,.0f} kWh over this window even running flat "
                f"out, day and night. A loss larger than the plant's total "
                f"physical capacity is not a finding about the plant — it means "
                f"the computation is wrong, most likely a unit mismatch. The "
                f"figures are withheld rather than reported at a value that "
                f"cannot be true."
            )
            availability_pct = None
            lost_total = float("nan")
            denominator = 0.0

    outage_info = getattr(aa, "outage_info", None)
    outage_count = None
    if outage_info is not None and "type" in getattr(outage_info, "columns", []):
        real = outage_info[outage_info["type"] == "real"]
        outage_count = int(len(real))
        comms = int(len(outage_info)) - outage_count
        notes.append(
            f"{outage_count} genuine outage(s) and {comms} communications "
            f"interruption(s) detected. Only the former carry a production loss."
        )

    return AvailabilityResult(
        **base,
        availability_pct=availability_pct,
        lost_production_kwh=lost_total if denominator > 0 else None,
        outage_count=outage_count,
        basis=basis,
        monthly=monthly,
        n_subsystems=len(subsystem.columns),
        notes=notes,
    )


def _expected_power_series(
    project: AnalyticsProject, index: pd.DatetimeIndex
) -> pd.Series:
    """Engine A expected AC power (W) on the telemetry index.

    Reuses the same expected-energy chain the reconciliation leg runs on —
    `expected_ac_energy` + `apply_losses_series` over NASA POWER — so the
    availability analysis is not measured against a second, differently-built
    expectation. NASA POWER is hourly and telemetry is sub-hourly, so the hourly
    curve is interpolated onto the telemetry index; that is a resolution
    mismatch, not an accuracy one, and RdTools sizes losses over outages lasting
    far longer than an hour.
    """
    from ingestion import get_adapter
    from verification_engine.irradiance import fetch_nasa_power

    adapter = get_adapter(project.telemetry_source)
    site = adapter.describe_site(project.external_id)
    cfg = site_config(site)

    weather = fetch_nasa_power(
        cfg.location,
        project.window_start.isoformat(),
        project.window_end.isoformat(),
    )
    energy_kwh = apply_losses_series(cfg, expected_ac_energy(cfg, weather))

    hours = _interval_hours(energy_kwh.index)
    power_w = (energy_kwh / hours) * 1000.0
    power_w = power_w.tz_convert("UTC")
    # Interpolate onto the telemetry grid, then clip: an interpolated ramp can
    # dip below zero between a dusk sample and a zero, and negative expected
    # power is not a thing.
    combined = power_w.reindex(power_w.index.union(index)).interpolate(
        method="time", limit_direction="both"
    )
    return combined.reindex(index).clip(lower=0.0).fillna(0.0)


def _interval_hours(index: pd.DatetimeIndex) -> float:
    if len(index) < 2:
        return 1.0
    delta = pd.Series(index).diff().median()
    return float(delta.total_seconds() / 3600.0)


def _finite(value, scale: float = 1.0):
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f * scale if np.isfinite(f) else None


# ── The row ───────────────────────────────────────────────────────────────────

def refresh_analytics(project_id, sink=None, as_of: date | None = None) -> str:
    """Run every analysis for a project and write its `plant_analytics` row(s).

    Returns the id of the primary (clear-sky) row. Where the system also has a
    verified POA channel, a second `sensor` row is written and both carry the
    disagreement between them.

    §5's discipline lives here: the normalization inputs are frozen into each
    row's provenance and nothing is re-fit on a rolling basis. A changed
    assumption produces a new `as_of_date` row rather than a mutated one, so a
    rate can always be traced back to what it was computed under. This matters
    more with RdTools than with a hand-rolled factor, not less — its
    normalization is more aggressive, so a rolling re-fit would absorb the
    degradation trend faster and destroy the claim more completely.
    """
    project = _resolve(project_id)
    as_of = as_of or date.today()
    assembled = load_series(project)

    availability = run_availability(project)
    expected_annual_kwh = _expected_annual_kwh(assembled)

    methods = ["clearsky"]
    if assembled.has_poa:
        methods.append("sensor")

    degradations: dict[str, DegradationResult] = {}
    soilings: dict[str, SoilingResult] = {}
    for method in methods:
        degradations[method] = run_degradation(project, method=method)
        soilings[method] = run_soiling(project, method=method)

    disagreement_note = _method_disagreement(degradations)

    rows: list[PlantAnalyticsRow] = []
    for method in methods:
        degradation = degradations[method]
        soiling = soilings[method]
        economics = translate(
            ppa_rate_per_kwh=project.ppa_rate_per_kwh,
            soiling_loss_pct=soiling.loss_pct,
            expected_annual_kwh=expected_annual_kwh,
            lost_production_kwh=availability.lost_production_kwh,
        )

        # Deduplicated, order preserved. `run_degradation` and `run_soiling`
        # share one cached RdTools pass, so anything that pass recorded — the
        # satellite-irradiance explanation, the assembly notes — arrives on both
        # and would otherwise be printed twice on the same report.
        notes = _dedupe([
            *degradation.notes,
            *soiling.notes,
            *availability.notes,
            *economics.notes,
        ])
        if disagreement_note:
            notes.append(disagreement_note)
        if len(methods) > 1:
            notes.append(
                "The soiling and availability figures on this row are identical "
                "to those on the other method's row: only the degradation "
                "columns are method-specific. They are one measurement recorded "
                "twice, not two."
            )

        analysis = _ANALYSIS_CACHE.get((project.project_id, method), {})
        rows.append(PlantAnalyticsRow(
            id=str(_uuid.uuid4()),
            project_id=project.project_id,
            as_of_date=as_of,
            window_start=project.window_start,
            window_end=project.window_end,
            degradation_pct_per_yr=degradation.rate_pct_per_yr,
            degradation_ci_low=degradation.ci_low,
            degradation_ci_high=degradation.ci_high,
            degradation_method=method,
            soiling_loss_pct=soiling.loss_pct,
            soiling_ci_low=soiling.ci_low,
            soiling_ci_high=soiling.ci_high,
            soiling_ratio=soiling.ratio,
            availability_pct=availability.availability_pct,
            lost_production_kwh=availability.lost_production_kwh,
            outage_count=availability.outage_count,
            ppa_rate_per_kwh=economics.ppa_rate_per_kwh,
            soiling_loss_usd=economics.soiling_loss_usd,
            availability_loss_usd=economics.availability_loss_usd,
            n_days_analyzed=assembled.n_days,
            rdtools_version=_rdtools_version(),
            engine_version=ENGINE_VERSION,
            computed_at=datetime.now(timezone.utc),
            provenance={
                **analysis.get("provenance", {}),
                "window_rationale": project.window_rationale,
                "site_caveats": list(project.caveats),
                "ppa_rate_basis": economics.basis,
                "availability_basis": availability.basis,
                "availability_subsystems": availability.n_subsystems,
                "availability_monthly": availability.monthly,
                "months_kept": assembled.months_kept,
                "months_qc_excluded": assembled.months_qc_excluded,
                "months_unavailable": assembled.months_unavailable,
                "span_months": round(assembled.span_months, 2),
                "degradation_within_plausible_range":
                    degradation.within_plausible_range,
                "soiling_signal_found": soiling.signal_found,
                "expected_annual_kwh": expected_annual_kwh,
            },
            notes=notes,
        ))

    if sink is not None:
        for row in rows:
            sink.write(row)

    return rows[0].id if rows else ""


def _dedupe(notes: list[str]) -> list[str]:
    """Drop repeats, keep first-seen order."""
    seen: set[str] = set()
    out: list[str] = []
    for note in notes:
        if note not in seen:
            seen.add(note)
            out.append(note)
    return out


def _method_disagreement(degradations: dict[str, DegradationResult]) -> str | None:
    """§2.2/§6.3 — the gap between clear-sky and sensor is itself a diagnostic."""
    clearsky = degradations.get("clearsky")
    sensor = degradations.get("sensor")
    if not clearsky or not sensor:
        return None
    if clearsky.rate_pct_per_yr is None or sensor.rate_pct_per_yr is None:
        return None
    gap = abs(clearsky.rate_pct_per_yr - sensor.rate_pct_per_yr)
    if gap <= METHOD_DISAGREEMENT_THRESHOLD:
        return (
            f"Clear-sky and sensor analyses agree to within {gap:.2f} %/yr "
            f"({clearsky.rate_pct_per_yr:.2f} vs {sensor.rate_pct_per_yr:.2f}), "
            f"which is corroboration: the modelled irradiance and the site's own "
            f"pyranometer tell the same story."
        )
    return (
        f"DISAGREEMENT: clear-sky gives {clearsky.rate_pct_per_yr:.2f} %/yr and "
        f"sensor gives {sensor.rate_pct_per_yr:.2f} %/yr, a gap of {gap:.2f} %/yr "
        f"against a 0.5 %/yr threshold. This is a diagnostic in its own right and "
        f"is NOT averaged away (§2.2). The usual cause is irradiance-sensor "
        f"drift: an uncalibrated pyranometer reading low makes the plant look "
        f"like it is degrading when it is the instrument that is. Both rates are "
        f"stored; the clear-sky one is the one that does not depend on site "
        f"hardware."
    )


def _expected_annual_kwh(assembled: AssembledSeries) -> float | None:
    """Measured annual production, for scaling a soiling percentage to dollars.

    Measured rather than modelled on purpose: §4.1 multiplies a soiling loss
    percentage by an annual energy figure, and the percentage is already relative
    to what the plant actually produced. Scaling it by a modelled expectation
    would mix a measured ratio with a modelled magnitude.
    """
    if assembled.series.empty or assembled.interval_minutes <= 0:
        return None
    power = pd.to_numeric(assembled.series["ac_power_w"], errors="coerce")
    total_kwh = float(power.sum(skipna=True) * assembled.interval_minutes / 60.0 / 1000.0)
    years = assembled.span_months / 12.0
    if years <= 0:
        return None
    return total_kwh / years
