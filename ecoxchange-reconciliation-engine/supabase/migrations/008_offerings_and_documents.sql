-- 008_offerings_and_documents.sql
-- Investor-facing offering layer (Spec 06). Adds `offerings` (investment-layer
-- data that extends `projects`) and `project_documents`, plus anon-read RLS so
-- the dashboard/demo can render open offerings with the public anon key.
-- (Spec called this "002"; renumbered to 008 to follow the existing migration
-- sequence in this directory.)

-- ═══════════════════════════════════════════
-- OFFERINGS
-- ═══════════════════════════════════════════
CREATE TABLE offerings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id),
    offering_name       TEXT NOT NULL,
    slug                TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'coming_soon', 'open', 'fully_subscribed', 'closed')),

    -- Raise parameters
    target_raise        DOUBLE PRECISION NOT NULL,
    minimum_investment  DOUBLE PRECISION NOT NULL DEFAULT 10000,
    maximum_investment  DOUBLE PRECISION,
    total_subscribed    DOUBLE PRECISION NOT NULL DEFAULT 0,
    token_price         DOUBLE PRECISION NOT NULL DEFAULT 100,
    total_tokens        INTEGER NOT NULL,
    tokens_remaining    INTEGER NOT NULL,

    -- Economics
    target_annual_yield DOUBLE PRECISION NOT NULL,
    target_irr          DOUBLE PRECISION NOT NULL,
    distribution_frequency TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (distribution_frequency IN ('monthly', 'quarterly')),
    ppa_term_years      INTEGER NOT NULL,
    ppa_counterparty    TEXT NOT NULL,
    ppa_escalator_pct   DOUBLE PRECISION DEFAULT 0.02,
    itc_eligible        BOOLEAN DEFAULT true,
    srec_eligible       BOOLEAN DEFAULT false,
    srec_program        TEXT,

    -- Developer info
    developer_name      TEXT NOT NULL,
    developer_bio       TEXT,
    developer_track_record TEXT,
    developer_website   TEXT,
    developer_logo_url  TEXT,

    -- Content
    headline            TEXT NOT NULL,
    description         TEXT NOT NULL,
    investment_thesis   TEXT NOT NULL,
    risk_factors        TEXT[] NOT NULL DEFAULT '{}',
    hero_image_url      TEXT,
    site_photos         TEXT[] DEFAULT '{}',

    -- Dates
    offering_open_date  TIMESTAMPTZ,
    offering_close_date TIMESTAMPTZ,
    target_cod_date     DATE,
    first_distribution_date DATE,

    -- Verification
    backtest_mean_deviation DOUBLE PRECISION,
    backtest_months_within_10pct DOUBLE PRECISION,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offerings_status ON offerings(status);
CREATE INDEX idx_offerings_project ON offerings(project_id);

-- ═══════════════════════════════════════════
-- PROJECT DOCUMENTS
-- ═══════════════════════════════════════════
CREATE TABLE project_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id     UUID NOT NULL REFERENCES offerings(id),
    doc_type        TEXT NOT NULL
                    CHECK (doc_type IN (
                        'ppm', 'subscription_agreement', 'ppa_summary',
                        'interconnection', 'form_d', 'financial_memo',
                        'verification_report', 'site_assessment', 'other'
                    )),
    title           TEXT NOT NULL,
    description     TEXT,
    file_url        TEXT NOT NULL,
    is_public       BOOLEAN NOT NULL DEFAULT false,
    upload_date     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_docs_offering ON project_documents(offering_id);

-- ═══════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Anon can read non-draft offerings
CREATE POLICY "Public read open offerings" ON offerings
    FOR SELECT USING (status IN ('open', 'coming_soon', 'fully_subscribed', 'closed'));

-- Anon can read public documents
CREATE POLICY "Public read public docs" ON project_documents
    FOR SELECT USING (is_public = true);
