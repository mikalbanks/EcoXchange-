-- 006_plant_analytics.sql
-- Spec 22 §6 — measured degradation, soiling and availability for the seeded
-- PVDAQ systems, computed with NREL RdTools 3.2.1.
--
-- Regenerate: python3 verification-engine/scripts/run_analytics.py
-- Requires migration 014 (plant_analytics) and seed 005 (the projects rows
-- these reference).
--
-- Every degradation rate here carries a 95% confidence interval, because a rate
-- without one is not defensible and defensibility is the point (§3). RdTools'
-- own default interval is 68.2%; the engine overrides it explicitly.
--
-- Generated 2026-08-13T05:19:25.151574+00:00 — engine 2.3.0, rdtools 3.2.1.

-- 00004902-0000-4000-8000-000000004902 — method clearsky, window 2014-08-01 .. 2018-02-28, 1278 days analyzed
-- Notes carried with this row:
--   * 1 month(s) had no usable telemetry: 2015-06.
--   * Series read from cache pvdaq_4902_201408_201802.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: Please import `convolve` from the `scipy.ndimage` namespace; the `scipy.ndimage.filters` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: Please import `shift` from the `scipy.ndimage` namespace; the `scipy.ndimage.interpolation` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: The soiling module is currently experimental. The API, results, and default behaviors may change in future releases (including MINOR and PATCH releases) as the code matures.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * NOT DISTINGUISHABLE FROM ZERO: the 95% interval runs from -2.59 to 3.78 %/yr and includes zero. This analysis did not establish that the plant is degrading. The point estimate of -0.25 %/yr is the centre of that range and should not be quoted on its own — the honest summary is that the available record is too short or too noisy to resolve a trend of this size.
--   * Site caveat: Whole months of the -999 missing-data sentinel fall inside this window. They are masked to NaN, not measured, so n_days_analyzed will sit well below the calendar day count.
--   * 1 month(s) had no usable telemetry: 2015-06.
--   * Series read from cache pvdaq_4902_201408_201802.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: Please import `convolve` from the `scipy.ndimage` namespace; the `scipy.ndimage.filters` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: Please import `shift` from the `scipy.ndimage` namespace; the `scipy.ndimage.interpolation` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: The soiling module is currently experimental. The API, results, and default behaviors may change in future releases (including MINOR and PATCH releases) as the code matures.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * TREAT WITH CAUTION: 12.7% is far above the 6% that soiling plausibly reaches outside a desert site with no cleaning programme. SRR identifies soiling by its shape — gradual decline, abrupt recovery — and anything with that shape reads as soiling, including snow cover and melt, and including weather itself whenever the normalization has not fully removed it.
--   * The likeliest explanation here is the second one. This system has no irradiance sensor, so clear-sky filtering runs against hourly satellite reanalysis interpolated to the analysis grid. That filter is blunt: cloudy periods survive it, and a run of cloudy days followed by a clear one has exactly the decline-then-recovery signature SRR is looking for. Read this number as evidence that the site needs an irradiance sensor before a soiling claim can be made, NOT as a cleaning budget.
--   * Subsystem power: 1 per-inverter AC power channels. CAUTION — InvPAC_kW_Avg carries a run of more than 30 days with no data at all. Spec 21 §2.11 records that a PVDAQ system's available channels change within its own record (1332's inv3_ac_power is present through 2016 and absent by mid-2017), so a gap that long is ambiguous between an inverter that was offline and a channel that stopped being logged. RdTools cannot tell those apart: it separates a SYSTEM-level communications dropout from a real outage, and this is neither. Lost production attributed to that subsystem may be a metadata artifact.
--   * Series resampled to a regular 15min grid for this analysis; gaps are preserved as missing rather than filled, since a filled gap is an erased outage.
--   * With a single power channel RdTools cannot see one subsystem fall out while others keep producing, so a partial outage is only visible as a shortfall against expectation. Multi-inverter attribution needs per-inverter telemetry.
--   * No cumulative meter channel on this system, so cumulative energy is integrated from the same AC power series the analysis is testing. That series is NaN during a communications dropout, so the derived cumulative does not advance across one either — which is exactly the signal the comms-vs-outage split relies on. Genuine outages and comms interruptions are therefore NOT reliably separated here, and availability should be read as a lower bound.
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: invalid value encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: divide by zero encountered in scalar divide
--   * 613 genuine outage(s) and 650 communications interruption(s) detected. Only the former carry a production loss.
--   * No PPA rate on this project, so the dollar figures use a stated default of $0.045/kWh (mid-range for US utility-scale solar). Every dollar amount below is an ESTIMATE and moves proportionally with the real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third higher. The percentages are measured; only the translation is assumed.
INSERT INTO plant_analytics (
    id, project_id, as_of_date, window_start, window_end, degradation_pct_per_yr, degradation_ci_low, degradation_ci_high, degradation_method, soiling_loss_pct, soiling_ci_low, soiling_ci_high, soiling_ratio, availability_pct, lost_production_kwh, outage_count, ppa_rate_per_kwh, soiling_loss_usd, availability_loss_usd, n_days_analyzed, rdtools_version, engine_version, computed_at
) VALUES (
    '1b9923f0-23e0-4f13-86bb-f67a25c10d42',
    '00004902-0000-4000-8000-000000004902',
    '2026-08-13',
    '2014-08-01',
    '2018-02-28',
    -0.25317176217915516,
    -2.589798092742049,
    3.78107424406553,
    'clearsky',
    12.691905437595107,
    8.002201026045652,
    18.95860074477016,
    0.8730809456240489,
    NULL,
    NULL,
    613,
    0.045,
    1781.2650045337227,
    NULL,
    1278,
    '3.2.1',
    '2.3.0',
    '2026-08-13T05:14:06.052744+00:00'
)
ON CONFLICT (project_id, as_of_date, degradation_method) DO UPDATE SET
    window_start = EXCLUDED.window_start,
    window_end = EXCLUDED.window_end,
    degradation_pct_per_yr = EXCLUDED.degradation_pct_per_yr,
    degradation_ci_low = EXCLUDED.degradation_ci_low,
    degradation_ci_high = EXCLUDED.degradation_ci_high,
    soiling_loss_pct = EXCLUDED.soiling_loss_pct,
    soiling_ci_low = EXCLUDED.soiling_ci_low,
    soiling_ci_high = EXCLUDED.soiling_ci_high,
    soiling_ratio = EXCLUDED.soiling_ratio,
    availability_pct = EXCLUDED.availability_pct,
    lost_production_kwh = EXCLUDED.lost_production_kwh,
    outage_count = EXCLUDED.outage_count,
    ppa_rate_per_kwh = EXCLUDED.ppa_rate_per_kwh,
    soiling_loss_usd = EXCLUDED.soiling_loss_usd,
    availability_loss_usd = EXCLUDED.availability_loss_usd,
    n_days_analyzed = EXCLUDED.n_days_analyzed,
    rdtools_version = EXCLUDED.rdtools_version,
    engine_version = EXCLUDED.engine_version,
    computed_at = EXCLUDED.computed_at;

-- 00001332-0000-4000-8000-000000001332 — method clearsky, window 2016-01-01 .. 2018-07-31, 944 days analyzed
-- Notes carried with this row:
--   * Series read from cache pvdaq_1332_201601_201807.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: rescaling failed to converge after 20 iterations
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * NOT DISTINGUISHABLE FROM ZERO: the 95% interval runs from -4.32 to 5.73 %/yr and includes zero. This analysis did not establish that the plant is degrading. The point estimate of -0.36 %/yr is the centre of that range and should not be quoted on its own — the honest summary is that the available record is too short or too noisy to resolve a trend of this size.
--   * Site caveat: NREL's own index flags this system: qa_status passes but qa_issue reads 'Wrong mounting config identified. Please manually review.' The §3.2 filter selects on qa_status and never reads qa_issue.
--   * Site caveat: Tilt is a DC-weighted merge of a 16.77 deg garage deck and a 60 deg face, giving 38.4 deg — which describes neither array. Clear-sky normalization models plane-of-array irradiance from that geometry, so the merge propagates directly into the degradation rate.
--   * Site caveat: spec 21 §3 records a detected time shift of up to 60 minutes over this system's record, consistent with a logger re-clock.
--   * Series read from cache pvdaq_1332_201601_201807.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: rescaling failed to converge after 20 iterations
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * Subsystem power: 3 per-inverter AC power channels. CAUTION — inv3_ac_power carries a run of more than 30 days with no data at all. Spec 21 §2.11 records that a PVDAQ system's available channels change within its own record (1332's inv3_ac_power is present through 2016 and absent by mid-2017), so a gap that long is ambiguous between an inverter that was offline and a channel that stopped being logged. RdTools cannot tell those apart: it separates a SYSTEM-level communications dropout from a real outage, and this is neither. Lost production attributed to that subsystem may be a metadata artifact.
--   * Series resampled to a regular 15min grid for this analysis; gaps are preserved as missing rather than filled, since a filled gap is an erased outage.
--   * No cumulative meter channel on this system, so cumulative energy is integrated from the same AC power series the analysis is testing. That series is NaN during a communications dropout, so the derived cumulative does not advance across one either — which is exactly the signal the comms-vs-outage split relies on. Genuine outages and comms interruptions are therefore NOT reliably separated here, and availability should be read as a lower bound.
--   * RdTools warning: divide by zero encountered in scalar divide
--   * 380 genuine outage(s) and 613 communications interruption(s) detected. Only the former carry a production loss.
--   * No PPA rate on this project, so the dollar figures use a stated default of $0.045/kWh (mid-range for US utility-scale solar). Every dollar amount below is an ESTIMATE and moves proportionally with the real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third higher. The percentages are measured; only the translation is assumed.
INSERT INTO plant_analytics (
    id, project_id, as_of_date, window_start, window_end, degradation_pct_per_yr, degradation_ci_low, degradation_ci_high, degradation_method, soiling_loss_pct, soiling_ci_low, soiling_ci_high, soiling_ratio, availability_pct, lost_production_kwh, outage_count, ppa_rate_per_kwh, soiling_loss_usd, availability_loss_usd, n_days_analyzed, rdtools_version, engine_version, computed_at
) VALUES (
    '78880f6d-c472-4dbe-8235-61efd1477679',
    '00001332-0000-4000-8000-000000001332',
    '2026-08-13',
    '2016-01-01',
    '2018-07-31',
    -0.3632610774052969,
    -4.324176483149089,
    5.729300311358831,
    'clearsky',
    4.761185589584949,
    1.9811985202214277,
    10.113988251831108,
    0.9523881441041505,
    82.09768597975821,
    858514936.8738549,
    380,
    0.045,
    3269.622484240809,
    38633172.15932347,
    944,
    '3.2.1',
    '2.3.0',
    '2026-08-13T05:19:19.120301+00:00'
)
ON CONFLICT (project_id, as_of_date, degradation_method) DO UPDATE SET
    window_start = EXCLUDED.window_start,
    window_end = EXCLUDED.window_end,
    degradation_pct_per_yr = EXCLUDED.degradation_pct_per_yr,
    degradation_ci_low = EXCLUDED.degradation_ci_low,
    degradation_ci_high = EXCLUDED.degradation_ci_high,
    soiling_loss_pct = EXCLUDED.soiling_loss_pct,
    soiling_ci_low = EXCLUDED.soiling_ci_low,
    soiling_ci_high = EXCLUDED.soiling_ci_high,
    soiling_ratio = EXCLUDED.soiling_ratio,
    availability_pct = EXCLUDED.availability_pct,
    lost_production_kwh = EXCLUDED.lost_production_kwh,
    outage_count = EXCLUDED.outage_count,
    ppa_rate_per_kwh = EXCLUDED.ppa_rate_per_kwh,
    soiling_loss_usd = EXCLUDED.soiling_loss_usd,
    availability_loss_usd = EXCLUDED.availability_loss_usd,
    n_days_analyzed = EXCLUDED.n_days_analyzed,
    rdtools_version = EXCLUDED.rdtools_version,
    engine_version = EXCLUDED.engine_version,
    computed_at = EXCLUDED.computed_at;

-- 9069: NOT ANALYZED — HTTPError: {'header': 'The POWER Hourly API failed to complete your request; please review the errors below and the POWER Docs (https://power.larc.nasa.gov/docs/).', 'messages': ['The please shorten your requested time extent for a JSON formatted data request.']}

-- 2107: NOT ANALYZED — not seeded by spec 21. Its 24 AC power columns (e.g. 'inv_01_ac_power_inv_149583') state no unit, and the data-prize bundle carries no metrics dictionary to resolve one. Inferring kW from magnitudes against the 27.6 kW ABB inverter nameplate would be a guess, and a wrong guess is a clean 1000x error. Resolving it needs a unit statement from NREL, not more code (spec 21 §2.7, §4).
