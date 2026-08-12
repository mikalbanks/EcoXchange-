-- 004_pvdaq_9068_measured.sql
-- NREL PVDAQ system 9068 (Greeley, CO) — 2022 verification records.
--
-- The inverter leg is MEASURED: 5-minute AC power from the public PVDAQ dataset,
-- aggregated by verification-engine/scripts/build_pvdaq_demo.py. The expected leg
-- is Engine A on NASA POWER. The utility leg is MODELLED from the inverter leg and
-- is not an independent measurement — see the `provenance` block in
-- ecoxchange-dashboard/src/data/demo-pvdaq-9068.json.
--
-- Regenerate with: python3 verification-engine/scripts/build_pvdaq_demo.py
--
-- `inverter_brand` below is a SCHEMA PLACEHOLDER. The column is NOT NULL with a
-- CHECK against a four-vendor enum, and the PVDAQ dataset does not publish the
-- inverter make for this system. It is not a claim about the hardware.

INSERT INTO projects (
    id, name, latitude, longitude, timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate,
    commissioning_date, inverter_brand, inverter_api_key_ref, inverter_plant_id,
    offtake_type, ppa_rate_per_kwh, ppa_escalator, status
) VALUES (
    '9068da91-0000-4000-8000-000000009068',
    'NREL PVDAQ 9068 — Greeley, CO',
    40.3864, -104.5512, 'America/Denver',
    4738.0, 0, 180,
    0.18, 0.14, 0.0075,
    '2017-08-01', 'sma', 'pvdaq-public-dataset', '9068',
    'ppa', 0.085, 0.02, 'active'
);

INSERT INTO verification_records (
    project_id, period_start, period_end,
    inverter_kwh, utility_kwh, expected_kwh,
    inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct,
    status, flag_reasons, tolerance_config, estimated_revenue, engine_version
) VALUES
('9068da91-0000-4000-8000-000000009068', '2022-01-01', '2022-01-31', 371143.1, 357589.9, 370148.4, np.float64(0.27), np.float64(3.79), -3.39, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 31547, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-02-01', '2022-02-28', 520933.5, 497869.8, 526110.4, np.float64(-0.98), np.float64(4.63), -5.37, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 44279, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-03-01', '2022-03-31', 680660.1, 652071.9, 652956.3, np.float64(4.24), np.float64(4.38), -0.14, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 57856, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-04-01', '2022-04-30', 903953.8, 877138.4, 824091.0, np.float64(9.69), np.float64(3.06), 6.44, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 76836, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-05-01', '2022-05-31', 843941.8, 822563.3, 811873.0, np.float64(3.95), np.float64(2.6), 1.32, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 71735, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-06-01', '2022-06-30', 904549.8, 879990.0, 872424.6, np.float64(3.68), np.float64(2.79), 0.87, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 76887, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-07-01', '2022-07-31', 962943.7, 931114.5, 898217.1, np.float64(7.21), np.float64(3.42), 3.66, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 81850, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-08-01', '2022-08-31', 954481.8, 900918.3, 874937.8, np.float64(9.09), np.float64(5.95), 2.97, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 81131, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-09-01', '2022-09-30', 756482.4, 732647.9, 707295.6, np.float64(6.95), np.float64(3.25), 3.58, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 64301, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-10-01', '2022-10-31', 658405.1, 646639.4, 652696.5, np.float64(0.87), np.float64(1.82), -0.93, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 55964, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-11-01', '2022-11-30', 438436.3, 417105.9, 441219.5, np.float64(-0.63), np.float64(5.11), -5.47, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 37267, '2.0.0'),
('9068da91-0000-4000-8000-000000009068', '2022-12-01', '2022-12-31', 375219.0, 369195.3, 318279.5, np.float64(17.89), np.float64(1.63), 16.0, 'flagged', '{"Inverter production 17.9% ABOVE expected (tolerance: ±15%)."}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 31894, '2.0.0');
