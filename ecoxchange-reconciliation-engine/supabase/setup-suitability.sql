-- ============================================================================
-- setup-suitability.sql — one-shot Supabase setup for Spec 10.
-- Project: xgcrooajrdpcgpgoazti. Run AFTER setup-distributions.sql (FK to
-- investors). Paste into the SQL Editor and Run.
-- Generated from migrations/010_suitability_profiles.sql
-- ============================================================================

-- 010_suitability_profiles.sql
-- Investor suitability questionnaire profile (Spec 10). One row per investor.
-- RLS enabled, no anon policies — gated until Privy auth; the dashboard captures
-- the profile client-side (localStorage) until then.
-- (Spec called this "004"; renumbered to 010 to follow the migration sequence.)

CREATE TABLE suitability_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id         UUID NOT NULL REFERENCES investors(id) UNIQUE,

    experience_level    TEXT NOT NULL
                        CHECK (experience_level IN (
                            'first_alternative', 'some_alternatives', 'experienced', 'professional')),
    primary_objective   TEXT NOT NULL
                        CHECK (primary_objective IN (
                            'income', 'growth', 'diversification', 'impact')),
    risk_tolerance      TEXT NOT NULL
                        CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    time_horizon        TEXT NOT NULL
                        CHECK (time_horizon IN ('short', 'medium', 'long')),
    planned_allocation  TEXT NOT NULL
                        CHECK (planned_allocation IN (
                            'minimum', 'moderate', 'significant', 'institutional')),
    impact_priorities   TEXT[] NOT NULL DEFAULT '{}',
    solar_experience    BOOLEAN NOT NULL DEFAULT false,
    crypto_comfort      TEXT NOT NULL DEFAULT 'new'
                        CHECK (crypto_comfort IN ('new', 'familiar', 'experienced')),

    recommended_offerings JSONB DEFAULT '[]',

    completed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suitability_profiles ENABLE ROW LEVEL SECURITY;
