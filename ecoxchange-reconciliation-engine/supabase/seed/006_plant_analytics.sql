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
-- Generated 2026-08-13T06:20:41.971029+00:00 — engine 2.3.0, rdtools 3.2.1.

-- 00004902-0000-4000-8000-000000004902 — method clearsky, window 2014-08-01 .. 2018-02-28, 1278 days analyzed
-- Notes carried with this row:
--   * 1 month(s) had no usable telemetry: 2015-06.
--   * Series read from cache pvdaq_4902_201408_201802.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: Please import `convolve` from the `scipy.ndimage` namespace; the `scipy.ndimage.filters` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: Please import `shift` from the `scipy.ndimage` namespace; the `scipy.ndimage.interpolation` namespace is deprecated and will be removed in SciPy 2.0.0.
--   * RdTools warning: The soiling module is currently experimental. The API, results, and default behaviors may change in future releases (including MINOR and PATCH releases) as the code matures.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * NOT DISTINGUISHABLE FROM ZERO: the 95% interval runs from -2.70 to 3.82 %/yr and includes zero. This analysis did not establish that the plant is degrading. The point estimate of -0.25 %/yr is the centre of that range and should not be quoted on its own — the honest summary is that the available record is too short or too noisy to resolve a trend of this size.
--   * Site caveat: Whole months of the -999 missing-data sentinel fall inside this window. They are masked to NaN, not measured, so n_days_analyzed will sit well below the calendar day count.
--   * TREAT WITH CAUTION: 12.4% is far above the 6% that soiling plausibly reaches outside a desert site with no cleaning programme. SRR identifies soiling by its shape — gradual decline, abrupt recovery — and anything with that shape reads as soiling, including snow cover and melt, and including weather itself whenever the normalization has not fully removed it.
--   * The likeliest explanation here is the second one. This system has no irradiance sensor, so clear-sky filtering runs against hourly satellite reanalysis interpolated to the analysis grid. That filter is blunt: cloudy periods survive it, and a run of cloudy days followed by a clear one has exactly the decline-then-recovery signature SRR is looking for. Read this number as evidence that the site needs an irradiance sensor before a soiling claim can be made, NOT as a cleaning budget.
--   * Subsystem power: 1 per-inverter AC power channels. CAUTION — InvPAC_kW_Avg carries a run of more than 30 days with no data at all. Spec 21 §2.11 records that a PVDAQ system's available channels change within its own record (1332's inv3_ac_power is present through 2016 and absent by mid-2017), so a gap that long is ambiguous between an inverter that was offline and a channel that stopped being logged. RdTools cannot tell those apart: it separates a SYSTEM-level communications dropout from a real outage, and this is neither. Lost production attributed to that subsystem may be a metadata artifact.
--   * Series resampled to a regular 15min grid for this analysis; gaps are preserved as missing rather than filled, since a filled gap is an erased outage.
--   * With a single power channel RdTools cannot see one subsystem fall out while others keep producing, so a partial outage is only visible as a shortfall against expectation. Multi-inverter attribution needs per-inverter telemetry.
--   * No cumulative meter channel on this system, so cumulative energy is integrated from the same AC power series the analysis is testing. That series is NaN during a communications dropout, so the derived cumulative does not advance across one either — which is exactly the signal the comms-vs-outage split relies on. Genuine outages and comms interruptions are therefore NOT reliably separated here, and availability should be read as a lower bound.
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: invalid value encountered in scalar divide
--   * 3 of 44 month(s) excluded from the totals: RdTools returned a non-finite loss for them. This is a known edge case in rdtools 3.2.1 (availability.py:514) where an outage falling entirely within night hours has zero expected energy over its window, and the production-fill scaling divides by it. The remaining 41 month(s) are unaffected. Availability below is computed over those, so it describes 41/44 of the window rather than all of it.
--   * 613 genuine outage(s) and 650 communications interruption(s) detected. Only the former carry a production loss.
--   * No PPA rate on this project, so the dollar figures use a stated default of $0.045/kWh (mid-range for US utility-scale solar). Every dollar amount below is an ESTIMATE and moves proportionally with the real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third higher. The percentages are measured; only the translation is assumed.
INSERT INTO plant_analytics (
    id, project_id, as_of_date, window_start, window_end, degradation_pct_per_yr, degradation_ci_low, degradation_ci_high, degradation_method, soiling_loss_pct, soiling_ci_low, soiling_ci_high, soiling_ratio, availability_pct, lost_production_kwh, outage_count, ppa_rate_per_kwh, soiling_loss_usd, availability_loss_usd, n_days_analyzed, rdtools_version, engine_version, computed_at
) VALUES (
    '29742fc4-277d-4b2f-9823-b7bba36b8978',
    '00004902-0000-4000-8000-000000004902',
    '2026-08-13',
    '2014-08-01',
    '2018-02-28',
    -0.25317176217915516,
    -2.6987260033999902,
    3.818892298613552,
    'clearsky',
    12.418634021171847,
    8.203622167386204,
    18.667888756803762,
    0.8758136597882815,
    84.56698185623245,
    190294.17043606308,
    613,
    0.045,
    1742.912306965378,
    8563.237669622838,
    1278,
    '3.2.1',
    '2.3.0',
    '2026-08-13T06:13:21.281172+00:00'
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
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * NOT DISTINGUISHABLE FROM ZERO: the 95% interval runs from -4.32 to 5.73 %/yr and includes zero. This analysis did not establish that the plant is degrading. The point estimate of -0.36 %/yr is the centre of that range and should not be quoted on its own — the honest summary is that the available record is too short or too noisy to resolve a trend of this size.
--   * Site caveat: NREL's own index flags this system: qa_status passes but qa_issue reads 'Wrong mounting config identified. Please manually review.' The §3.2 filter selects on qa_status and never reads qa_issue.
--   * Site caveat: Tilt is a DC-weighted merge of a 16.77 deg garage deck and a 60 deg face, giving 38.4 deg — which describes neither array. Clear-sky normalization models plane-of-array irradiance from that geometry, so the merge propagates directly into the degradation rate.
--   * Site caveat: spec 21 §3 records a detected time shift of up to 60 minutes over this system's record, consistent with a logger re-clock.
--   * Subsystem power: 3 per-inverter AC power channels. CAUTION — inv3_ac_power carries a run of more than 30 days with no data at all. Spec 21 §2.11 records that a PVDAQ system's available channels change within its own record (1332's inv3_ac_power is present through 2016 and absent by mid-2017), so a gap that long is ambiguous between an inverter that was offline and a channel that stopped being logged. RdTools cannot tell those apart: it separates a SYSTEM-level communications dropout from a real outage, and this is neither. Lost production attributed to that subsystem may be a metadata artifact.
--   * Series resampled to a regular 15min grid for this analysis; gaps are preserved as missing rather than filled, since a filled gap is an erased outage.
--   * No cumulative meter channel on this system, so cumulative energy is integrated from the same AC power series the analysis is testing. That series is NaN during a communications dropout, so the derived cumulative does not advance across one either — which is exactly the signal the comms-vs-outage split relies on. Genuine outages and comms interruptions are therefore NOT reliably separated here, and availability should be read as a lower bound.
--   * RdTools warning: divide by zero encountered in scalar divide
--   * 380 genuine outage(s) and 613 communications interruption(s) detected. Only the former carry a production loss.
--   * No PPA rate on this project, so the dollar figures use a stated default of $0.045/kWh (mid-range for US utility-scale solar). Every dollar amount below is an ESTIMATE and moves proportionally with the real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third higher. The percentages are measured; only the translation is assumed.
INSERT INTO plant_analytics (
    id, project_id, as_of_date, window_start, window_end, degradation_pct_per_yr, degradation_ci_low, degradation_ci_high, degradation_method, soiling_loss_pct, soiling_ci_low, soiling_ci_high, soiling_ratio, availability_pct, lost_production_kwh, outage_count, ppa_rate_per_kwh, soiling_loss_usd, availability_loss_usd, n_days_analyzed, rdtools_version, engine_version, computed_at
) VALUES (
    '7aa07b21-8068-4174-91ff-6aaa428865e5',
    '00001332-0000-4000-8000-000000001332',
    '2026-08-13',
    '2016-01-01',
    '2018-07-31',
    -0.3632610774052969,
    -4.324176483149089,
    5.729300311358831,
    'clearsky',
    4.7602504414747004,
    1.7744114671958133,
    9.968571866646059,
    0.952397495585253,
    82.09768597975835,
    858514.9368738449,
    380,
    0.045,
    3268.9802951830975,
    38633.17215932302,
    944,
    '3.2.1',
    '2.3.0',
    '2026-08-13T06:18:41.428862+00:00'
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

-- 00009069-0000-4000-8000-000000009069 — method clearsky, window 2016-02-01 .. 2023-11-30, 2680 days analyzed
-- Notes carried with this row:
--   * 3 month(s) had no usable telemetry: 2017-03, 2017-04, 2018-02.
--   * Series read from cache pvdaq_9069_201602_202311.parquet.
--   * This system publishes no plane-of-array irradiance channel. Clear-sky POA is modelled from solar geometry, and the observed irradiance the clear-sky filter compares it against comes from NASA POWER satellite reanalysis — the same source behind the expected-energy leg — rather than a site pyranometer. Degradation is therefore measured without depending on site instrumentation, which is the point of the clear-sky method; the trade is that hourly reanalysis resolves cloud cover more coarsely than an on-site sensor would, so the clear-sky filter is a blunter instrument here and the confidence interval is correspondingly wider.
--   * RdTools warning: rescaling failed to converge after 20 iterations
--   * RdTools warning: 'd' is deprecated and will be removed in a future version. Please use 'D' instead of 'd'.
--   * RdTools warning: 20% or more of the daily data is assigned to invalid soiling intervals. This can be problematic with the "half_norm_clean" and "random_clean" cleaning assumptions. Consider more permissive validity criteria such as increasing "max_relative_slope_error" and/or "max_negative_step" and/or decreasing "min_interval_length". Alternatively, consider using method="perfect_clean". For more info see https:/
--   * Rate of -4.94 %/yr falls outside the −0.2 .. −2.5 %/yr band §6.2 treats as plausible for crystalline silicon. Reported as measured, with the site's caveats attached — the band is a prompt to look, not a filter.
--   * Site caveat: Peak output falls from 33.0 MW in 2016 to 24.4 MW in 2023 on a 33 MW nameplate (spec 21 §3). That is far too steep for degradation alone; partial outage, curtailment or a changed inverter limit are all likelier. Expect a degradation rate outside the -0.2 .. -2.5 %/yr sanity band, and read it as a finding about the plant rather than a bug in the method. It is reported with the collapse attached.
--   * Site caveat: Reference system only: 33 MW is outside the 1-20 MW band, so it is never a segment example.
--   * TREAT WITH CAUTION: 7.7% is far above the 6% that soiling plausibly reaches outside a desert site with no cleaning programme. SRR identifies soiling by its shape — gradual decline, abrupt recovery — and anything with that shape reads as soiling, including snow cover and melt, and including weather itself whenever the normalization has not fully removed it.
--   * The likeliest explanation here is the second one. This system has no irradiance sensor, so clear-sky filtering runs against hourly satellite reanalysis interpolated to the analysis grid. That filter is blunt: cloudy periods survive it, and a run of cloudy days followed by a clear one has exactly the decline-then-recovery signature SRR is looking for. Read this number as evidence that the site needs an irradiance sensor before a soiling claim can be made, NOT as a cleaning budget.
--   * Subsystem power: 40 per-inverter AC power channels. CAUTION — inverter_01_ac_power_(kw)_inv_150953, inverter_02_ac_power_(kw)_inv_150954, inverter_03_ac_power_(kw)_inv_150955, inverter_04_ac_power_(kw)_inv_150956, inverter_05_ac_power_(kw)_inv_150957, inverter_06_ac_power_(kw)_inv_150958, inverter_07_ac_power_(kw)_inv_150959, inverter_08_ac_power_(kw)_inv_150960, inverter_09_ac_power_(kw)_inv_150961, inverter_10_ac_power_(kw)_inv_150962, inverter_11_ac_power_(kw)_inv_150963, inverter_12_ac_power_(kw)_inv_150964, inverter_13_ac_power_(kw)_inv_150965, inverter_14_ac_power_(kw)_inv_150966, inverter_15_ac_power_(kw)_inv_150967, inverter_16_ac_power_(kw)_inv_150968, inverter_17_ac_power_(kw)_inv_150969, inverter_18_ac_power_(kw)_inv_150970, inverter_19_ac_power_(kw)_inv_150971, inverter_20_ac_power_(kw)_inv_150972, inverter_21_ac_power_(kw)_inv_150973, inverter_22_ac_power_(kw)_inv_150974, inverter_23_ac_power_(kw)_inv_150975, inverter_24_ac_power_(kw)_inv_150976, inverter_25_ac_power_(kw)_inv_150977, inverter_26_ac_power_(kw)_inv_150978, inverter_27_ac_power_(kw)_inv_150979, inverter_28_ac_power_(kw)_inv_150980, inverter_29_ac_power_(kw)_inv_150981, inverter_30_ac_power_(kw)_inv_150982, inverter_31_ac_power_(kw)_inv_150983, inverter_32_ac_power_(kw)_inv_150984, inverter_33_ac_power_(kw)_inv_150985, inverter_34_ac_power_(kw)_inv_150986, inverter_35_ac_power_(kw)_inv_150987, inverter_36_ac_power_(kw)_inv_150988, inverter_37_ac_power_(kw)_inv_150989, inverter_38_ac_power_(kw)_inv_150990, inverter_39_ac_power_(kw)_inv_150991, inverter_40_ac_power_(kw)_inv_150992 carries a run of more than 30 days with no data at all. Spec 21 §2.11 records that a PVDAQ system's available channels change within its own record (1332's inv3_ac_power is present through 2016 and absent by mid-2017), so a gap that long is ambiguous between an inverter that was offline and a channel that stopped being logged. RdTools cannot tell those apart: it separates a SYSTEM-level communications dropout from a real outage, and this is neither. Lost production attributed to that subsystem may be a metadata artifact.
--   * Series resampled to a regular 15min grid for this analysis; gaps are preserved as missing rather than filled, since a filled gap is an erased outage.
--   * No cumulative meter channel on this system, so cumulative energy is integrated from the same AC power series the analysis is testing. That series is NaN during a communications dropout, so the derived cumulative does not advance across one either — which is exactly the signal the comms-vs-outage split relies on. Genuine outages and comms interruptions are therefore NOT reliably separated here, and availability should be read as a lower bound.
--   * RdTools warning: divide by zero encountered in scalar divide
--   * RdTools warning: invalid value encountered in scalar divide
--   * 3 of 94 month(s) excluded from the totals: RdTools returned a non-finite loss for them. This is a known edge case in rdtools 3.2.1 (availability.py:514) where an outage falling entirely within night hours has zero expected energy over its window, and the production-fill scaling divides by it. The remaining 91 month(s) are unaffected. Availability below is computed over those, so it describes 91/94 of the window rather than all of it.
--   * 2651 genuine outage(s) and 158 communications interruption(s) detected. Only the former carry a production loss.
--   * No PPA rate on this project, so the dollar figures use a stated default of $0.045/kWh (mid-range for US utility-scale solar). Every dollar amount below is an ESTIMATE and moves proportionally with the real rate — at $0.03/kWh they are a third lower, at $0.06/kWh a third higher. The percentages are measured; only the translation is assumed.
INSERT INTO plant_analytics (
    id, project_id, as_of_date, window_start, window_end, degradation_pct_per_yr, degradation_ci_low, degradation_ci_high, degradation_method, soiling_loss_pct, soiling_ci_low, soiling_ci_high, soiling_ratio, availability_pct, lost_production_kwh, outage_count, ppa_rate_per_kwh, soiling_loss_usd, availability_loss_usd, n_days_analyzed, rdtools_version, engine_version, computed_at
) VALUES (
    '1fa33ab3-2eb2-4cc7-8ec2-82bba528d03a',
    '00009069-0000-4000-8000-000000009069',
    '2026-08-13',
    '2016-02-01',
    '2023-11-30',
    -4.942431696154126,
    -5.8368792768787445,
    -4.1877563085277405,
    'clearsky',
    7.691018938250216,
    6.349881955771341,
    9.477140759259296,
    0.9230898106174978,
    86.21178611768894,
    56532223.703776926,
    2651,
    0.045,
    161783.58710144646,
    2543950.0666699614,
    2680,
    '3.2.1',
    '2.3.0',
    '2026-08-13T06:20:41.967282+00:00'
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

-- 2107: NOT ANALYZED — not seeded by spec 21. Its 24 AC power columns (e.g. 'inv_01_ac_power_inv_149583') state no unit, and the data-prize bundle carries no metrics dictionary to resolve one. Inferring kW from magnitudes against the 27.6 kW ABB inverter nameplate would be a guess, and a wrong guess is a clean 1000x error. Resolving it needs a unit statement from NREL, not more code (spec 21 §2.7, §4).
