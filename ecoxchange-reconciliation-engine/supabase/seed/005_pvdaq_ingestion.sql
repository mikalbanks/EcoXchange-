-- 005_pvdaq_ingestion.sql
-- Spec 21 §7 — real NREL PVDAQ telemetry, ingested through the spec 21 §2
-- adapter interface and scored by src/ingestion/quality.py.
--
-- Regenerate: python3 verification-engine/scripts/ingest_pvdaq.py
-- Requires migration 013 (data_provenance, reading_quality, telemetry_source).
--
-- Every `raw_readings` row here has data_provenance = 'pvdaq_real' and a
-- `reading_quality` row behind its `data_quality`. The inverter leg is MEASURED.
-- There is NO utility leg: PVDAQ is a single source, so this is the two-way
-- inverter-vs-satellite check, not three-source validation (spec 21 §8).
--
-- Generated 2026-08-12T12:42:34.874905+00:00 — engine 2.2.0, pvanalytics 0.2.2.

-- ── PVDAQ 9069 — Simon Solar Farm ─────────────────────────────
-- 24 consecutive months inside the 2016-02..2023-11 record (§7.6)
INSERT INTO projects (
    id, name, latitude, longitude, timezone, iana_timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate, commissioning_date,
    telemetry_source, telemetry_external_id,
    offtake_type, ppa_rate_per_kwh, status
) VALUES (
    '00009069-0000-4000-8000-000000009069', 'Simon Solar Farm', 33.6762, -83.676,
    'America/New_York', 'America/New_York',
    33000.0, 20.0, 180.0,
    0.20, 0.14, 0.0075, '2016-02-17',
    'pvdaq', '9069',
    NULL, NULL, 'reference'
)
ON CONFLICT (id) DO UPDATE SET
    iana_timezone = EXCLUDED.iana_timezone,
    telemetry_source = EXCLUDED.telemetry_source,
    telemetry_external_id = EXCLUDED.telemetry_external_id,
    updated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-01-01', '2021-01-31',
      2904676.0, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-01-01","end":"2021-01-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.29% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9359, 0.0,
       0.017519, 0.012881,
       0.0, FALSE,
       5, 'complete',
       '{"1.29% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-02-01', '2021-02-28',
      3195846.5, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-02-01","end":"2021-02-28"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.17% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.8219, 0.0,
       0.012048, 0.011657,
       0.0, FALSE,
       5, 'complete',
       '{"1.17% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-03-01', '2021-03-31',
      4303675.4, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-03-01","end":"2021-03-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.28% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0186, 0.001234,
       0.008004, 0.012786,
       0.000885, FALSE,
       5, 'complete',
       '{"1.28% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-04-01', '2021-04-30',
      5621320.4, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-04-01","end":"2021-04-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.34% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.002894,
       0.015691, 0.013426,
       0.002816, FALSE,
       5, 'complete',
       '{"1.34% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-05-01', '2021-05-31',
      5551131.9, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-05-01","end":"2021-05-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.62% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.1039, 0.0,
       0.010522, 0.016241,
       0.0, FALSE,
       5, 'complete',
       '{"1.62% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-06-01', '2021-06-30',
      4830729.7, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-06-01","end":"2021-06-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '2.37% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.000926,
       0.008237, 0.023727,
       0.0, FALSE,
       5, 'complete',
       '{"2.37% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-07-01', '2021-07-31',
      4796648.5, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-07-01","end":"2021-07-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.64% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.8127, 0.0,
       0.007559, 0.016353,
       0.0, FALSE,
       5, 'complete',
       '{"1.64% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-08-01', '2021-08-31',
      4830250.9, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-08-01","end":"2021-08-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.94% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9359, 0.0,
       0.008832, 0.019377,
       0.0, FALSE,
       5, 'complete',
       '{"1.94% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-09-01', '2021-09-30',
      4397400.3, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-09-01","end":"2021-09-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.35% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.0,
       0.012544, 0.013542,
       0.0, FALSE,
       5, 'complete',
       '{"1.35% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-10-01', '2021-10-31',
      3442282.4, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-10-01","end":"2021-10-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.38% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9695, 0.005712,
       0.03063, 0.013777,
       0.0, FALSE,
       5, 'complete',
       '{"1.38% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-11-01', '2021-11-30',
      3357697.9, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-11-01","end":"2021-11-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '0.64% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7113, 0.000925,
       0.027124, 0.006357,
       0.0, FALSE,
       5, 'complete',
       '{"0.64% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2021-12-01', '2021-12-31',
      2158432.3, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2021-12-01","end":"2021-12-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.02% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9359, 0.0,
       0.053069, 0.010193,
       0.011989, FALSE,
       5, 'complete',
       '{"1.02% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-01-01', '2022-01-31',
      3491921.5, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-01-01","end":"2022-01-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.23% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9247, 0.001904,
       0.015257, 0.012321,
       0.0, FALSE,
       5, 'complete',
       '{"1.23% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-02-01', '2022-02-28',
      3780829.8, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-02-01","end":"2022-02-28"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.25% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.8219, 0.001488,
       0.005995, 0.012525,
       0.0, FALSE,
       5, 'complete',
       '{"1.25% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-03-01', '2022-03-31',
      4793985.6, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-03-01","end":"2022-03-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.40% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0186, 0.006729,
       0.024476, 0.01402,
       0.001718, FALSE,
       5, 'complete',
       '{"1.40% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-04-01', '2022-04-30',
      5001785.8, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-04-01","end":"2022-04-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.48% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.004977,
       0.0129, 0.014815,
       0.0, FALSE,
       5, 'complete',
       '{"1.48% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-05-01', '2022-05-31',
      3825695.2, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-05-01","end":"2022-05-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.50% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.1039, 0.0,
       0.087915, 0.015009,
       0.0, FALSE,
       5, 'complete',
       '{"1.50% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-06-01', '2022-06-30',
      4450027.5, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-06-01","end":"2022-06-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.72% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.002315,
       0.003309, 0.017245,
       0.0, FALSE,
       5, 'complete',
       '{"1.72% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-07-01', '2022-07-31',
      3822784.1, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-07-01","end":"2022-07-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.60% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.1039, 0.0,
       0.01073, 0.016017,
       0.0, FALSE,
       5, 'complete',
       '{"1.60% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-08-01', '2022-08-31',
      3408636.2, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-08-01","end":"2022-08-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.79% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.1039, 0.0,
       0.016418, 0.017921,
       0.001759, FALSE,
       5, 'complete',
       '{"1.79% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-09-01', '2022-09-30',
      3850481.9, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-09-01","end":"2022-09-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.56% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0741, 0.0,
       0.006121, 0.015625,
       0.0, FALSE,
       5, 'complete',
       '{"1.56% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-10-01', '2022-10-31',
      3044845.3, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-10-01","end":"2022-10-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '1.20% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9695, 0.0,
       0.015278, 0.011985,
       0.0, FALSE,
       5, 'complete',
       '{"1.20% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-11-01', '2022-11-30',
      2485966.6, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-11-01","end":"2022-11-30"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '0.94% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7113, 0.0,
       0.011991, 0.009362,
       0.004388, FALSE,
       5, 'complete',
       '{"0.94% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00009069-0000-4000-8000-000000009069', 'inverter', '2022-12-01', '2022-12-31',
      1416314.7, '{"adapter":"pvdaq","store":"data_prize","window":{"start":"2022-12-01","end":"2022-12-31"},"interval_minutes":5,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: sum of 40 columns x 1000"],"channels":{"ac_power_w":{"source_file":"oedi-data-lake/pvdaq/2023-solar-data-prize/9069_OEDI/data/9069_electrical_ac.csv","columns":["inverter_01_ac_power_(kw)_inv_150953","inverter_02_ac_power_(kw)_inv_150954","inverter_03_ac_power_(kw)_inv_150955","inverter_04_ac_power_(kw)_inv_150956","inverter_05_ac_power_(kw)_inv_150957","inverter_06_ac_power_(kw)_inv_150958","inverter_07_ac_power_(kw)_inv_150959","inverter_08_ac_power_(kw)_inv_150960","inverter_09_ac_power_(kw)_inv_150961","inverter_10_ac_power_(kw)_inv_150962","inverter_11_ac_power_(kw)_inv_150963","inverter_12_ac_power_(kw)_inv_150964","inverter_13_ac_power_(kw)_inv_150965","inverter_14_ac_power_(kw)_inv_150966","inverter_15_ac_power_(kw)_inv_150967","inverter_16_ac_power_(kw)_inv_150968","inverter_17_ac_power_(kw)_inv_150969","inverter_18_ac_power_(kw)_inv_150970","inverter_19_ac_power_(kw)_inv_150971","inverter_20_ac_power_(kw)_inv_150972","inverter_21_ac_power_(kw)_inv_150973","inverter_22_ac_power_(kw)_inv_150974","inverter_23_ac_power_(kw)_inv_150975","inverter_24_ac_power_(kw)_inv_150976","inverter_25_ac_power_(kw)_inv_150977","inverter_26_ac_power_(kw)_inv_150978","inverter_27_ac_power_(kw)_inv_150979","inverter_28_ac_power_(kw)_inv_150980","inverter_29_ac_power_(kw)_inv_150981","inverter_30_ac_power_(kw)_inv_150982","inverter_31_ac_power_(kw)_inv_150983","inverter_32_ac_power_(kw)_inv_150984","inverter_33_ac_power_(kw)_inv_150985","inverter_34_ac_power_(kw)_inv_150986","inverter_35_ac_power_(kw)_inv_150987","inverter_36_ac_power_(kw)_inv_150988","inverter_37_ac_power_(kw)_inv_150989","inverter_38_ac_power_(kw)_inv_150990","inverter_39_ac_power_(kw)_inv_150991","inverter_40_ac_power_(kw)_inv_150992"],"scale_to_unit":1000.0,"combine":"sum","detail":"sum of 40 inverter AC power columns"}},"timestamp_basis":"measured_on localized to America/New_York (naive site-local in the source), converted to UTC","cache":"/home/user/EcoXchange-/verification-engine/data/pvdaq_cache/pvdaq_9069_site_total.parquet"}'::jsonb,
      'complete', '0.97% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9359, 0.0,
       0.020743, 0.009745,
       0.0, FALSE,
       5, 'complete',
       '{"0.97% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

-- ── PVDAQ 1332 — NREL Parking Garage ─────────────────────────────
-- 24 months ending before the units break. From 2018-08 the stored values are watts while the metrics dictionary still declares kW with calc_scale=1000 — metered_ac_power peaks at 1,051 in 2017-03 and 934,400 in 2018-08 on a 1,153 kW plant. The adapter's magnitude guard rejects everything after the break rather than guessing which years need the scale
INSERT INTO projects (
    id, name, latitude, longitude, timezone, iana_timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate, commissioning_date,
    telemetry_source, telemetry_external_id,
    offtake_type, ppa_rate_per_kwh, status
) VALUES (
    '00001332-0000-4000-8000-000000001332', 'NREL Parking Garage', 39.7388, -105.1732,
    'America/Denver', 'America/Denver',
    1153.488, 38.385, 180.0,
    0.20, 0.14, 0.0075, '2013-03-29',
    'pvdaq', '1332',
    NULL, NULL, 'reference'
)
ON CONFLICT (id) DO UPDATE SET
    iana_timezone = EXCLUDED.iana_timezone,
    telemetry_source = EXCLUDED.telemetry_source,
    telemetry_external_id = EXCLUDED.telemetry_external_id,
    updated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-01-01', '2016-01-31',
      84201.8, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-01-01","end":"2016-01-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.67% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.6514, 0.004839,
       0.00848, 0.006676,
       0.0, TRUE,
       1, 'complete',
       '{"0.67% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-02-01', '2016-02-29',
      94573.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-02-01","end":"2016-02-29"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":31,"sentinel_values_masked":2,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.89% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.5701, 0.010225,
       0.001576, 0.00886,
       0.0, TRUE,
       1, 'complete',
       '{"0.89% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-03-01', '2016-03-31',
      88114.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-03-01","end":"2016-03-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":31,"sentinel_values_masked":2466,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'partial', 'Completeness 87.0% is below 90%.; 0.82% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 86.9661, 0.001189,
       0.042479, 0.008232,
       0.067118, TRUE,
       1, 'partial',
       '{"Completeness 87.0% is below 90%.","0.82% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-04-01', '2016-04-30',
      106623.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-04-01","end":"2016-04-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":31,"sentinel_values_masked":6366,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'partial', 'Completeness 89.5% is below 90%.; 0.75% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 89.537, 0.0,
       0.007787, 0.007546,
       0.081744, TRUE,
       1, 'partial',
       '{"Completeness 89.5% is below 90%.","0.75% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-05-01', '2016-05-31',
      156785.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-05-01","end":"2016-05-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":56298,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.79% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7903, 0.003338,
       0.000709, 0.007885,
       0.039228, TRUE,
       1, 'complete',
       '{"0.79% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-06-01', '2016-06-30',
      181682.4, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-06-01","end":"2016-06-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":200096,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.84% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 97.5787, 0.005301,
       0.012378, 0.008356,
       0.032758, TRUE,
       1, 'complete',
       '{"0.84% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-07-01', '2016-07-31',
      173912.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-07-01","end":"2016-07-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":224910,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '1.08% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7903, 0.0,
       0.000807, 0.010775,
       0.036774, TRUE,
       1, 'complete',
       '{"1.08% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-08-01', '2016-08-31',
      166260.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-08-01","end":"2016-08-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":178016,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.84% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 97.6434, 0.0,
       0.006417, 0.008356,
       0.055144, TRUE,
       1, 'complete',
       '{"0.84% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-09-01', '2016-09-30',
      153656.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-09-01","end":"2016-09-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":205862,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.91% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7338, 0.001227,
       0.001398, 0.009097,
       0.098087, TRUE,
       1, 'complete',
       '{"0.91% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-10-01', '2016-10-31',
      133187.6, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-10-01","end":"2016-10-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":178598,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.85% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7164, 0.001366,
       0.007263, 0.008535,
       0.191366, TRUE,
       1, 'complete',
       '{"0.85% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-11-01', '2016-11-30',
      93445.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-11-01","end":"2016-11-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":203296,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.60% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.2628, 0.003144,
       0.004605, 0.005964,
       0.032061, TRUE,
       1, 'complete',
       '{"0.60% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2016-12-01', '2016-12-31',
      61128.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-12-01","end":"2016-12-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":268804,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.75% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.3375, 0.0,
       0.018482, 0.007504,
       0.0, TRUE,
       1, 'complete',
       '{"0.75% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-01-01', '2017-01-31',
      66049.4, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-01-01","end":"2017-01-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":432380,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.82% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 96.4651, 0.001658,
       0.008797, 0.008199,
       0.0, TRUE,
       1, 'complete',
       '{"0.82% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-02-01', '2017-02-28',
      92503.5, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-02-01","end":"2017-02-28"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":30,"sentinel_values_masked":631322,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.76% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.5243, 0.0,
       0.002522, 0.007564,
       0.0, TRUE,
       1, 'complete',
       '{"0.76% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-03-01', '2017-03-31',
      129054.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-03-01","end":"2017-03-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":31,"sentinel_values_masked":542754,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'partial', 'Completeness 87.3% is below 90%.; 0.93% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 87.2577, 0.001279,
       0.004252, 0.009309,
       0.069702, TRUE,
       1, 'partial',
       '{"Completeness 87.3% is below 90%.","0.93% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-04-01', '2017-04-30',
      148488.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-04-01","end":"2017-04-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":596340,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.97% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.4653, 0.001412,
       0.009925, 0.009699,
       0.069839, TRUE,
       1, 'complete',
       '{"0.97% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-05-01', '2017-05-31',
      160128.6, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-05-01","end":"2017-05-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":602384,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.93% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.1967, 0.0,
       0.013878, 0.009341,
       0.028054, TRUE,
       1, 'complete',
       '{"0.93% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-06-01', '2017-06-30',
      172241.5, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-06-01","end":"2017-06-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":545876,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '1.13% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.75, 0.001528,
       0.001043, 0.011319,
       0.029647, TRUE,
       1, 'complete',
       '{"1.13% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-07-01', '2017-07-31',
      149061.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-07-01","end":"2017-07-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":546984,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.64% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 91.8056, 0.001277,
       0.001969, 0.006429,
       0.032931, TRUE,
       1, 'complete',
       '{"0.64% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-08-01', '2017-08-31',
      161272.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-08-01","end":"2017-08-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":651964,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.86% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.5887, 0.003203,
       0.001146, 0.00858,
       0.068464, TRUE,
       1, 'complete',
       '{"0.86% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-09-01', '2017-09-30',
      112826.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-09-01","end":"2017-09-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":30,"sentinel_values_masked":529484,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'partial', 'Completeness 88.1% is below 90%.; 0.53% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 88.0503, 0.0,
       0.004014, 0.005278,
       0.121282, TRUE,
       1, 'partial',
       '{"Completeness 88.1% is below 90%.","0.53% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-10-01', '2017-10-31',
      116026.8, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-10-01","end":"2017-10-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":570914,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.67% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.75, 0.006272,
       0.006572, 0.006676,
       0.212833, TRUE,
       1, 'complete',
       '{"0.67% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-11-01', '2017-11-30',
      92160.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-11-01","end":"2017-11-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659],"partitions_read":32,"sentinel_values_masked":571240,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.70% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.4108, 0.0,
       0.002946, 0.006958,
       0.007468, TRUE,
       1, 'complete',
       '{"0.70% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00001332-0000-4000-8000-000000001332', 'inverter', '2017-12-01', '2017-12-31',
      77942.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-12-01","end":"2017-12-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","resampled 15s native sampling to a 1-minute grid (mean of 4 samples per minute; energy-preserving for instantaneous power)"],"channels":{"ac_power_w":{"metric_ids":[2638],"scale_to_unit":1000.0,"combine":"single","detail":"site total channel metered_ac_power (kW->W, metric_id=2638)"}},"metric_ids_present":[2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2652,2653,2656,2657,2658,2659],"partitions_read":33,"sentinel_values_masked":634214,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"measured_on localized to America/Denver (utc_measured_on is null for every row in this window)"}'::jsonb,
      'complete', '0.72% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.47, 0.001299,
       0.008228, 0.007236,
       0.0, TRUE,
       1, 'complete',
       '{"0.72% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

-- ── PVDAQ 4902 — NIST_Ground_1 ─────────────────────────────
-- 24 months inside the 2014-08..2018-02 record; the earlier stretch carries whole months of the -999 missing-data sentinel
INSERT INTO projects (
    id, name, latitude, longitude, timezone, iana_timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate, commissioning_date,
    telemetry_source, telemetry_external_id,
    offtake_type, ppa_rate_per_kwh, status
) VALUES (
    '00004902-0000-4000-8000-000000004902', 'NIST_Ground_1', 39.1319, -77.2141,
    'America/New_York', 'America/New_York',
    270.7, 20.0, 180.0,
    0.20, 0.14, 0.0075, '2014-07-29',
    'pvdaq', '4902',
    NULL, NULL, 'reference'
)
ON CONFLICT (id) DO UPDATE SET
    iana_timezone = EXCLUDED.iana_timezone,
    telemetry_source = EXCLUDED.telemetry_source,
    telemetry_external_id = EXCLUDED.telemetry_external_id,
    updated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-01-01', '2016-01-31',
      20811.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-01-01","end":"2016-01-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":21,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '0.73% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.918, 0.0,
       0.061467, 0.007348,
       0.0, FALSE,
       1, 'complete',
       '{"0.73% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-02-01', '2016-02-29',
      23729.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-02-01","end":"2016-02-29"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":31,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.04% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.8625, 0.0,
       0.023225, 0.010417,
       0.0, FALSE,
       1, 'complete',
       '{"1.04% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-03-01', '2016-03-31',
      33409.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-03-01","end":"2016-03-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":282,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.18% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9132, 0.001839,
       0.005993, 0.011754,
       0.0, FALSE,
       1, 'complete',
       '{"1.18% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-04-01', '2016-04-30',
      30864.6, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-04-01","end":"2016-04-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":89457,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'partial', 'Completeness 88.5% is below 90%.; 1.07% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 88.4884, 0.002801,
       0.064048, 0.010741,
       0.0, FALSE,
       1, 'partial',
       '{"Completeness 88.5% is below 90%.","1.07% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-05-01', '2016-05-31',
      32867.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-05-01","end":"2016-05-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":3444,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.18% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.5887, 0.0,
       0.012488, 0.011761,
       0.0, FALSE,
       1, 'complete',
       '{"1.18% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-06-01', '2016-06-30',
      30387.8, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-06-01","end":"2016-06-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":120373,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'partial', 'Completeness 68.2% is below 90%.; 1.15% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 68.1902, 0.0,
       0.020804, 0.011458,
       0.0, FALSE,
       1, 'partial',
       '{"Completeness 68.2% is below 90%.","1.15% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-07-01', '2016-07-31',
      5213.1, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-07-01","end":"2016-07-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":317329,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'missing', 'Completeness 13.8% is below 50%; the period has too little data to reconcile.; 0.26% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 13.7993, 0.0,
       0.0, 0.002643,
       0.0, FALSE,
       1, 'missing',
       '{"Completeness 13.8% is below 50%; the period has too little data to reconcile.","0.26% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-08-01', '2016-08-31',
      41275.6, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-08-01","end":"2016-08-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":1827,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.40% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7746, 0.001299,
       0.008089, 0.014046,
       0.0, FALSE,
       1, 'complete',
       '{"1.40% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-09-01', '2016-09-30',
      32582.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-09-01","end":"2016-09-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":399,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.12% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9097, 0.0,
       0.004384, 0.011181,
       0.0, FALSE,
       1, 'complete',
       '{"1.12% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-10-01', '2016-10-31',
      27532.4, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-10-01","end":"2016-10-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":105798,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'partial', 'Completeness 86.4% is below 90%.; 1.14% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 86.4337, 0.0,
       0.028718, 0.011425,
       0.0, FALSE,
       1, 'partial',
       '{"Completeness 86.4% is below 90%.","1.14% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-11-01', '2016-11-30',
      25899.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-11-01","end":"2016-11-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":63,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.07% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9286, 0.00141,
       0.007882, 0.01068,
       0.0, FALSE,
       1, 'complete',
       '{"1.07% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2016-12-01', '2016-12-31',
      20174.1, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2016-12-01","end":"2016-12-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '0.99% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9359, 0.000986,
       0.008911, 0.009901,
       0.0, FALSE,
       1, 'complete',
       '{"0.99% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-01-01', '2017-01-31',
      15834.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-01-01","end":"2017-01-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":63,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '0.98% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9225, 0.0,
       0.001936, 0.009812,
       0.0, FALSE,
       1, 'complete',
       '{"0.98% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-02-01', '2017-02-28',
      25161.4, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-02-01","end":"2017-02-28"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":30,"sentinel_values_masked":762,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.08% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.7054, 0.001488,
       0.005422, 0.010789,
       0.0, FALSE,
       1, 'complete',
       '{"1.08% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-03-01', '2017-03-31',
      36028.4, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-03-01","end":"2017-03-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.32% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0052, 0.002939,
       0.006751, 0.013212,
       0.0, FALSE,
       1, 'complete',
       '{"1.32% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-04-01', '2017-04-30',
      35111.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-04-01","end":"2017-04-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.16% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0671, 0.003079,
       0.000851, 0.011597,
       0.0, FALSE,
       1, 'complete',
       '{"1.16% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-05-01', '2017-05-31',
      32451.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-05-01","end":"2017-05-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":4092,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.10% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.8844, 0.0,
       0.043051, 0.011044,
       0.0, FALSE,
       1, 'complete',
       '{"1.10% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-06-01', '2017-06-30',
      42006.2, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-06-01","end":"2017-06-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":42,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '2.11% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 97.7824, 0.0025,
       0.004643, 0.021111,
       0.0, FALSE,
       1, 'complete',
       '{"2.11% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-07-01', '2017-07-31',
      39694.7, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-07-01","end":"2017-07-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.46% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0054, 0.0,
       0.000866, 0.014606,
       0.0, FALSE,
       1, 'complete',
       '{"1.46% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-08-01', '2017-08-31',
      37634.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-08-01","end":"2017-08-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":168,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.51% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0308, 0.001344,
       0.00484, 0.015076,
       0.0, FALSE,
       1, 'complete',
       '{"1.51% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-09-01', '2017-09-30',
      34684.6, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-09-01","end":"2017-09-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":63,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '1.21% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 99.0162, 0.001458,
       0.005094, 0.012083,
       0.0, FALSE,
       1, 'complete',
       '{"1.21% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-10-01', '2017-10-31',
      27959.3, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-10-01","end":"2017-10-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":58212,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'partial', 'Completeness 89.8% is below 90%.; 0.94% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 89.7827, 0.005264,
       0.031659, 0.009364,
       0.0, FALSE,
       1, 'partial',
       '{"Completeness 89.8% is below 90%.","0.94% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-11-01', '2017-11-30',
      24093.0, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-11-01","end":"2017-11-30"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":32,"sentinel_values_masked":0,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '0.98% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 98.9748, 0.001618,
       0.001795, 0.009755,
       0.0, FALSE,
       1, 'complete',
       '{"0.98% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

WITH r AS (
  INSERT INTO raw_readings (
      project_id, source, period_start, period_end,
      kwh_gross, raw_response, data_quality, quality_notes, data_provenance
  ) VALUES (
      '00004902-0000-4000-8000-000000004902', 'inverter', '2017-12-01', '2017-12-31',
      16693.9, '{"adapter":"pvdaq","store":"partitioned","window":{"start":"2017-12-01","end":"2017-12-31"},"interval_minutes":1,"interval_basis":"median index delta of the fetched rows","conversion_applied":["ac_power_w: raw value x 1000 (single)","dc_power_w: raw value x 1000 (single)","module_temp_c: raw value x 1 (single)"],"channels":{"ac_power_w":{"metric_ids":[82607],"scale_to_unit":1000.0,"combine":"single","detail":"sum of 1 inverter AC power channels ([''InvPAC_kW_Avg''])"},"dc_power_w":{"metric_ids":[82610],"scale_to_unit":1000.0,"combine":"single","detail":"InvPDC_kW_Avg (kW)"},"module_temp_c":{"metric_ids":[82621],"scale_to_unit":1.0,"combine":"single","detail":"SEWSModuleTemp_C_Avg (C)"}},"metric_ids_present":[82591,82592,82593,82594,82595,82596,82597,82598,82599,82600,82601,82602,82603,82604,82605,82606,82607,82608,82609,82610,82611,82612,82613,82614,82615,82616,82617,82618,82619,82620,82621,82622,82623,82624,82625,82626,82627,82628,82629,82630,82631,82632,82633,82634,82635,82636,82637,82638,82639,82640,82641,82642,82643,82644,82645,82646,82647,82648,82649,82650,82651,82652,82653,82654,82655,82656,82657,82658,82659,82660,82661,82662,82663,82664,82665,82666,82667,82668,82669,82670,82671,82672,82673,82674,82675,82676,82677,82678,82679,82680,82681,82682,82683,82684,82685,82686,82687,82688],"partitions_read":33,"sentinel_values_masked":38619,"sentinel_values":[-999.0,-7999.0,-9999.0,-99999.0],"timestamp_basis":"utc_measured_on"}'::jsonb,
      'complete', '0.97% of samples are Hampel outliers.', 'pvdaq_real'
  )
  ON CONFLICT (project_id, source, period_start) DO UPDATE SET
      kwh_gross = EXCLUDED.kwh_gross, raw_response = EXCLUDED.raw_response,
      data_quality = EXCLUDED.data_quality, quality_notes = EXCLUDED.quality_notes,
      data_provenance = EXCLUDED.data_provenance, fetched_at = now()
  RETURNING id
)
INSERT INTO reading_quality (
    raw_reading_id, completeness_pct, clipped_frac, stale_frac, outlier_frac,
    night_energy_frac, shift_detected, interval_minutes, qc_verdict, qc_notes,
    pvanalytics_version
)
SELECT r.id, 94.776, 0.0,
       0.095523, 0.009655,
       0.0, FALSE,
       1, 'complete',
       '{"0.97% of samples are Hampel outliers."}', '0.2.2'
FROM r
ON CONFLICT (raw_reading_id) DO UPDATE SET
    completeness_pct = EXCLUDED.completeness_pct,
    clipped_frac = EXCLUDED.clipped_frac, stale_frac = EXCLUDED.stale_frac,
    outlier_frac = EXCLUDED.outlier_frac,
    night_energy_frac = EXCLUDED.night_energy_frac,
    shift_detected = EXCLUDED.shift_detected, qc_verdict = EXCLUDED.qc_verdict,
    qc_notes = EXCLUDED.qc_notes, evaluated_at = now();

-- system 2107: NOT SEEDED — MetricResolutionError
