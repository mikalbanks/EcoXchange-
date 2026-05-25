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
