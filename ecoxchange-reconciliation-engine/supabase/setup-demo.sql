-- ============================================================================
-- setup-demo.sql — one-shot Supabase setup for the demo (demo.ecoxchange.net)
-- Project: xgcrooajrdpcgpgoazti
--
-- Paste this entire file into the Supabase SQL Editor and Run. It applies the
-- engine schema, RLS (anon read), pvlib/reference fields, and seeds the
-- Savannah 5MW project + 12 verification records. Generated from:
--   migrations/001_initial_schema.sql, 002_rls.sql, 005_reference_status.sql,
--   007_pvlib_fields.sql, seed/001_savannah_backtest.sql
-- Safe to run once on a fresh project. (Re-running errors on existing objects.)
-- ============================================================================

-- ===== migrations/001_initial_schema.sql =====
-- 001_initial_schema.sql
-- EcoXchange reconciliation engine core schema (spec §1).

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    timezone        TEXT NOT NULL DEFAULT 'America/New_York',
    capacity_kw_dc  DOUBLE PRECISION NOT NULL,
    tilt_deg        DOUBLE PRECISION NOT NULL,
    azimuth_deg     DOUBLE PRECISION NOT NULL,
    module_efficiency DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    system_losses   DOUBLE PRECISION NOT NULL DEFAULT 0.14,
    degradation_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0075,
    commissioning_date DATE NOT NULL,
    inverter_brand  TEXT NOT NULL CHECK (inverter_brand IN ('solaredge', 'enphase', 'fronius', 'sma')),
    inverter_api_key_ref TEXT NOT NULL,
    inverter_plant_id TEXT NOT NULL,
    utility_provider TEXT,
    utility_account_ref TEXT,
    offtake_type    TEXT CHECK (offtake_type IN ('ppa', 'community_solar', 'net_metering', 'merchant')),
    ppa_rate_per_kwh DOUBLE PRECISION,
    ppa_escalator   DOUBLE PRECISION DEFAULT 0.02,
    status          TEXT NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'suspended', 'decommissioned')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TYPE data_source AS ENUM ('inverter', 'utility_meter', 'satellite');

CREATE TABLE raw_readings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    source          data_source NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    kwh_gross       DOUBLE PRECISION,
    kwh_net         DOUBLE PRECISION,
    ghi_kwh_m2      DOUBLE PRECISION,
    dni_kwh_m2      DOUBLE PRECISION,
    dhi_kwh_m2      DOUBLE PRECISION,
    raw_response    JSONB NOT NULL,
    archive_path    TEXT,
    data_quality    TEXT DEFAULT 'complete' CHECK (data_quality IN ('complete', 'partial', 'missing', 'error')),
    quality_notes   TEXT,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_raw_readings_project_period ON raw_readings(project_id, period_start);
CREATE UNIQUE INDEX idx_raw_readings_unique ON raw_readings(project_id, source, period_start);

CREATE TYPE verification_status AS ENUM ('verified', 'flagged', 'pending');

CREATE TABLE verification_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id),
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    inverter_kwh        DOUBLE PRECISION,
    utility_kwh         DOUBLE PRECISION,
    expected_kwh        DOUBLE PRECISION NOT NULL,
    inv_vs_expected_pct DOUBLE PRECISION,
    inv_vs_utility_pct  DOUBLE PRECISION,
    util_vs_expected_pct DOUBLE PRECISION,
    status              verification_status NOT NULL DEFAULT 'pending',
    flag_reasons        TEXT[],
    tolerance_config    JSONB NOT NULL,
    estimated_revenue   DOUBLE PRECISION,
    engine_version      TEXT NOT NULL,
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by         TEXT,
    review_notes        TEXT,
    review_resolved_at  TIMESTAMPTZ,
    CONSTRAINT unique_project_period UNIQUE (project_id, period_start)
);
CREATE INDEX idx_verification_status ON verification_records(status);
CREATE INDEX idx_verification_project ON verification_records(project_id, period_start);

CREATE TABLE engine_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    engine_version  TEXT NOT NULL,
    target_period   DATE NOT NULL,
    projects_attempted INT NOT NULL DEFAULT 0,
    projects_verified INT NOT NULL DEFAULT 0,
    projects_flagged INT NOT NULL DEFAULT 0,
    projects_pending INT NOT NULL DEFAULT 0,
    projects_errored INT NOT NULL DEFAULT 0,
    errors          JSONB,
    trigger_type    TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'backtest'))
);

-- ===== migrations/002_rls.sql =====
-- 002_rls.sql
-- Enable RLS on all engine tables. The engine writes via service-role key
-- (RLS bypassed). The dashboard reads via anon key with read-only policies.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read projects" ON projects
    FOR SELECT USING (status = 'active');

CREATE POLICY "Public read verification_records" ON verification_records
    FOR SELECT USING (true);

CREATE POLICY "Public read raw_readings" ON raw_readings
    FOR SELECT USING (true);

CREATE POLICY "Public read engine_runs" ON engine_runs
    FOR SELECT USING (true);

-- ===== migrations/005_reference_status.sql =====
-- 005_reference_status.sql
-- Add a fifth allowed value to projects.status so the fleet-validation pipeline
-- can store validated USPVDB plants as 'reference' rows (not active offerings,
-- not onboarding submissions — they're proof-of-engine artifacts).

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('onboarding', 'active', 'suspended', 'decommissioned', 'reference'));

-- ===== migrations/007_pvlib_fields.sql =====
-- 007_pvlib_fields.sql
-- Higher-fidelity system fields consumed by the pvlib expected-generation
-- microservice. All optional with sensible defaults so existing rows and the
-- in-process fallback model are unaffected.

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS module_type TEXT NOT NULL DEFAULT 'monocrystalline',
    ADD COLUMN IF NOT EXISTS inverter_efficiency DOUBLE PRECISION NOT NULL DEFAULT 0.96,
    ADD COLUMN IF NOT EXISTS dc_ac_ratio DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    ADD COLUMN IF NOT EXISTS racking_type TEXT NOT NULL DEFAULT 'open_rack',
    -- albedo is not present in the original schema (001); add it here.
    ADD COLUMN IF NOT EXISTS albedo DOUBLE PRECISION NOT NULL DEFAULT 0.2;

-- Constrain the enumerated fields to the values the service understands.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_module_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_module_type_check
    CHECK (module_type IN ('monocrystalline', 'polycrystalline', 'thin_film', 'cdte'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_racking_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_racking_type_check
    CHECK (racking_type IN ('open_rack', 'roof_mount', 'single_axis_tracker'));

-- ===== seed/001_savannah_backtest.sql =====
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

