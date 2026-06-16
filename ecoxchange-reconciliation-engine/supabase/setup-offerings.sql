-- ============================================================================
-- setup-offerings.sql — one-shot Supabase setup for Spec 06 offering pages.
-- Project: xgcrooajrdpcgpgoazti  (run AFTER setup-demo.sql, which seeds the
-- Savannah project this offering FKs to). Paste into the SQL Editor and Run.
-- Generated from migrations/008_offerings_and_documents.sql + seed/002_savannah_offering.sql
-- ============================================================================

-- ===== migrations/008_offerings_and_documents.sql =====
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

-- ===== seed/002_savannah_offering.sql =====
-- 002_savannah_offering.sql
-- Seeds the "Savannah Solar I ESN" offering + its documents (Spec 06). FKs to
-- the seeded Savannah project (001_savannah_backtest.sql). Run after migration
-- 008_offerings_and_documents.sql.

INSERT INTO offerings (
    project_id, offering_name, slug, status,
    target_raise, minimum_investment, total_subscribed,
    token_price, total_tokens, tokens_remaining,
    target_annual_yield, target_irr, distribution_frequency,
    ppa_term_years, ppa_counterparty, ppa_escalator_pct,
    itc_eligible, srec_eligible,
    developer_name, developer_bio, developer_track_record,
    headline, description, investment_thesis,
    risk_factors,
    backtest_mean_deviation, backtest_months_within_10pct,
    target_cod_date, first_distribution_date
) VALUES (
    (SELECT id FROM projects WHERE name LIKE '%Savannah%' LIMIT 1),
    'Savannah Solar I ESN',
    'savannah-solar-i',
    'open',
    2500000, 10000, 750000,
    100, 25000, 17500,
    0.07, 0.12, 'monthly',
    20, 'Georgia Power', 0.02,
    true, false,
    'Lightstar Renewables',
    'Lightstar Renewables is a U.S.-based independent power producer specializing in distributed solar projects in the 1–20 MW range across the Southeast.',
    '1 GW pipeline across 45+ projects; 12 operational plants totaling 38 MW',
    '5 MW Ground-Mount Solar — Savannah, GA',
    'A 5 MW (DC) ground-mount solar installation in Savannah, Georgia, interconnected to Georgia Power under a 20-year PPA with 2% annual escalator. The project sits on 25 leased acres with excellent irradiance (4.8 kWh/m²/day annual average) and is production-verified by EcoXchange''s three-source reconciliation engine.',
    'Savannah offers top-decile irradiance for the Southeast, a credit-worthy utility counterparty in Georgia Power, and a locked-in 20-year revenue stream with built-in inflation protection. The 1–20 MW segment remains structurally underserved by institutional capital — this project fills that gap.',
    ARRAY[
        'Solar production varies with weather conditions and may underperform projections in any given period',
        'Georgia Power PPA is subject to utility credit risk over the 20-year term',
        'Regulatory changes to net metering or solar incentives could affect project economics',
        'Equipment degradation may exceed projected 0.75%/year rate',
        'EcoXchange is a pre-revenue platform; this is among its first offerings',
        'ESN tokens are illiquid — no secondary market is currently available',
        'Past performance of similar projects does not guarantee future results'
    ],
    5.2, 0.92,
    '2024-03-15', '2024-05-01'
);

INSERT INTO project_documents (offering_id, doc_type, title, description, file_url, is_public) VALUES
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'financial_memo', 'Financial Summary', 'Pro-forma cash flow projections and target returns',
     '/documents/savannah-solar-i/financial-memo.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'ppa_summary', 'PPA Summary', 'Key terms of the Georgia Power power purchase agreement',
     '/documents/savannah-solar-i/ppa-summary.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'verification_report', 'Verification Backtest Report', '12-month historical production backtest results',
     '/documents/savannah-solar-i/verification-report.pdf', true),
    ((SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
     'ppm', 'Private Placement Memorandum', 'Full offering documents — available after subscription',
     '/documents/savannah-solar-i/ppm.pdf', false);
