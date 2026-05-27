-- 004_developer_submissions.sql
-- Developer onboarding intake + generated backtest reports. Tables hold
-- encrypted inverter API keys and PII; only the service role can read them.

CREATE TYPE submission_status AS ENUM (
    'submitted',
    'validating',
    'backtesting',
    'reconciling',
    'report_ready',
    'reviewed',
    'loi_sent',
    'loi_signed',
    'rejected',
    'expired'
);

CREATE TABLE developer_submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_name      TEXT NOT NULL,
    developer_email     TEXT NOT NULL,
    developer_company   TEXT,
    developer_phone     TEXT,
    project_name        TEXT NOT NULL,
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    state_code          TEXT,
    capacity_kw_dc      DOUBLE PRECISION NOT NULL,
    tilt_deg            DOUBLE PRECISION NOT NULL,
    azimuth_deg         DOUBLE PRECISION NOT NULL,
    module_efficiency   DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    system_losses       DOUBLE PRECISION NOT NULL DEFAULT 0.14,
    degradation_rate    DOUBLE PRECISION NOT NULL DEFAULT 0.0075,
    commissioning_date  DATE NOT NULL,
    inverter_brand      TEXT NOT NULL CHECK (inverter_brand IN ('solaredge', 'enphase', 'fronius', 'sma', 'other')),
    inverter_api_key    TEXT,
    inverter_plant_id   TEXT,
    has_inverter_creds  BOOLEAN NOT NULL DEFAULT false,
    utility_provider    TEXT,
    utility_account_ref TEXT,
    offtake_type        TEXT CHECK (offtake_type IN ('ppa', 'community_solar', 'net_metering', 'merchant')),
    ppa_rate_per_kwh    DOUBLE PRECISION,
    ppa_escalator       DOUBLE PRECISION DEFAULT 0.02,
    ppa_tenor_years     INTEGER,
    equity_raise_target DOUBLE PRECISION,
    equity_raise_min    DOUBLE PRECISION,
    status              submission_status NOT NULL DEFAULT 'submitted',
    status_history      JSONB DEFAULT '[]',
    backtest_report_id  UUID,
    backtest_report_path TEXT,
    project_id          UUID REFERENCES projects(id),
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    notes               TEXT
);
CREATE INDEX idx_submissions_status ON developer_submissions(status);
CREATE INDEX idx_submissions_email ON developer_submissions(developer_email);

CREATE TABLE backtest_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id       UUID NOT NULL REFERENCES developer_submissions(id) ON DELETE CASCADE,
    annual_expected_mwh DOUBLE PRECISION NOT NULL,
    capacity_factor_pct DOUBLE PRECISION NOT NULL,
    months_tested       INTEGER NOT NULL,
    months_verified     INTEGER NOT NULL DEFAULT 0,
    months_flagged      INTEGER NOT NULL DEFAULT 0,
    pvwatts_estimate_mwh DOUBLE PRECISION,
    deviation_from_pvwatts_pct DOUBLE PRECISION,
    estimated_annual_revenue DOUBLE PRECISION,
    estimated_annual_yield_pct DOUBLE PRECISION,
    report_json_path    TEXT NOT NULL,
    report_md_path      TEXT,
    report_pdf_path     TEXT,
    irradiance_source   TEXT NOT NULL,
    has_real_inverter_data BOOLEAN NOT NULL DEFAULT false,
    engine_version      TEXT NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_submission ON backtest_reports(submission_id);

ALTER TABLE developer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_reports ENABLE ROW LEVEL SECURITY;
-- No anon policies: service-role only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('onboarding-reports', 'onboarding-reports', false, 10485760, ARRAY['application/json', 'text/markdown'])
ON CONFLICT (id) DO NOTHING;
