-- 001_savannah_backtest.sql
-- Seeds the Savannah 5MW Community Solar project plus its 12 verification
-- records from the 0% backtest run (engine 0.1.0). Lets the dashboard render
-- live data immediately.

INSERT INTO projects (
    id, name, latitude, longitude, timezone,
    capacity_kw_dc, tilt_deg, azimuth_deg,
    module_efficiency, system_losses, degradation_rate,
    commissioning_date, inverter_brand, inverter_api_key_ref, inverter_plant_id,
    offtake_type, ppa_rate_per_kwh, ppa_escalator, status
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Savannah Community Solar 5MW',
    32.08, -81.09, 'America/New_York',
    5000, 20, 180,
    0.20, 0.14, 0.0075,
    '2023-01-01', 'solaredge', 'demo-key-ref', 'demo-plant-001',
    'community_solar', 0.085, 0.02, 'active'
);

INSERT INTO verification_records (
    project_id, period_start, period_end,
    inverter_kwh, utility_kwh, expected_kwh,
    inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct,
    status, flag_reasons, tolerance_config, estimated_revenue, engine_version
) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-01-01', '2024-01-31', 516016, 500535, 516016, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 43861, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-02-01', '2024-02-29', 546624, 530225, 546624, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 46463, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-03-01', '2024-03-31', 667163, 647148, 667163, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 56709, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-04-01', '2024-04-30', 836859, 811753, 836859, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 71133, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-05-01', '2024-05-31', 796045, 772164, 796045, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 67664, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-06-01', '2024-06-30', 858953, 833184, 858953, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 73011, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-07-01', '2024-07-31', 795158, 771303, 795158, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 67588, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-08-01', '2024-08-31', 776243, 752956, 776243, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 65981, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-09-01', '2024-09-30', 611196, 592860, 611196, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 51952, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-10-01', '2024-10-31', 721974, 700315, 721974, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 61368, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-11-01', '2024-11-30', 486701, 472100, 486701, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 41370, '0.1.0'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2024-12-01', '2024-12-31', 489823, 475128, 489823, 0.0, 3.0, -3.0, 'verified', '{}', '{"inv_vs_expected_upper_pct":15,"inv_vs_expected_lower_pct":-15,"inv_vs_utility_pct":10,"util_vs_expected_upper_pct":20,"util_vs_expected_lower_pct":-20,"min_data_completeness_pct":90}', 41635, '0.1.0');
