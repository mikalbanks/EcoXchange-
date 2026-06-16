-- ============================================================================
-- setup-distributions.sql — one-shot Supabase setup for Spec 09 (DRIP).
-- Project: xgcrooajrdpcgpgoazti. Run AFTER setup-offerings.sql (the demo
-- investor's holding FKs to the Savannah offering). Paste into SQL Editor + Run.
-- Generated from migrations/009_investor_preferences.sql + seed/003_demo_investor.sql
-- ============================================================================

-- ===== migrations/009_investor_preferences.sql =====
-- 009_investor_preferences.sql
-- Investor records, holdings, distribution preferences (DRIP toggle), and
-- distribution history (Spec 09). FKs to offerings (migration 008). RLS is
-- enabled with NO anon policies — these tables stay gated until Privy auth wires
-- auth.uid() policies; the dashboard captures preferences client-side until then.
-- (Spec called this "003"; renumbered to 009 to follow the migration sequence.)

-- ═══════════════════════════════════════════
-- INVESTORS
-- ═══════════════════════════════════════════
CREATE TABLE investors (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                TEXT NOT NULL UNIQUE,
    wallet_address       TEXT,
    accreditation_status TEXT NOT NULL DEFAULT 'pending'
                         CHECK (accreditation_status IN ('pending', 'verified', 'expired', 'rejected')),
    accreditation_date   TIMESTAMPTZ,
    accreditation_method TEXT,
    kyc_status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    account_type         TEXT NOT NULL DEFAULT 'individual'
                         CHECK (account_type IN ('individual', 'entity', 'ira')),
    entity_name          TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_investors_email ON investors(email);
CREATE INDEX idx_investors_wallet ON investors(wallet_address);

-- ═══════════════════════════════════════════
-- INVESTOR HOLDINGS
-- ═══════════════════════════════════════════
CREATE TABLE investor_holdings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id    UUID NOT NULL REFERENCES investors(id),
    offering_id    UUID NOT NULL REFERENCES offerings(id),
    tokens_held    DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_basis     DOUBLE PRECISION NOT NULL DEFAULT 0,
    first_purchase TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_purchase  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_holdings_investor_offering ON investor_holdings(investor_id, offering_id);

-- ═══════════════════════════════════════════
-- DISTRIBUTION PREFERENCES (DRIP toggle per offering)
-- ═══════════════════════════════════════════
CREATE TABLE distribution_preferences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(id),
    offering_id UUID NOT NULL REFERENCES offerings(id),
    preference  TEXT NOT NULL DEFAULT 'cash_out'
                CHECK (preference IN ('cash_out', 'reinvest')),
    reinvest_target_offering_id UUID REFERENCES offerings(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  TEXT NOT NULL DEFAULT 'investor',
    CONSTRAINT unique_pref_per_holding UNIQUE (investor_id, offering_id)
);

-- ═══════════════════════════════════════════
-- DISTRIBUTION HISTORY
-- ═══════════════════════════════════════════
CREATE TABLE distribution_history (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id          UUID NOT NULL REFERENCES investors(id),
    offering_id          UUID NOT NULL REFERENCES offerings(id),
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,
    gross_distribution   DOUBLE PRECISION NOT NULL,
    platform_fee         DOUBLE PRECISION NOT NULL DEFAULT 0,
    net_distribution     DOUBLE PRECISION NOT NULL,
    action_taken         TEXT NOT NULL CHECK (action_taken IN ('cash_out', 'reinvest')),
    tokens_acquired      DOUBLE PRECISION,
    reinvest_price       DOUBLE PRECISION,
    reinvest_offering_id UUID REFERENCES offerings(id),
    tx_hash              TEXT,
    block_number         BIGINT,
    status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dist_history_investor ON distribution_history(investor_id);
CREATE INDEX idx_dist_history_offering_period ON distribution_history(offering_id, period_start);

-- ═══════════════════════════════════════════
-- RLS (enabled, no anon policies — gated until auth.uid() policies land)
-- ═══════════════════════════════════════════
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_history ENABLE ROW LEVEL SECURITY;

-- ===== seed/003_demo_investor.sql =====
-- 003_demo_investor.sql
-- Demo investor + Savannah holding + cash_out preference + 6 months of
-- distribution history (Spec 09). Run AFTER 009_investor_preferences.sql and
-- after the Savannah offering exists (setup-offerings.sql).

INSERT INTO investors (id, email, wallet_address, accreditation_status, kyc_status, account_type)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'demo-investor@ecoxchange.net',
    '0xDemoWalletAddress1234567890abcdef',
    'verified', 'verified', 'individual'
);

INSERT INTO investor_holdings (investor_id, offering_id, tokens_held, cost_basis)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    100, 10000
);

INSERT INTO distribution_preferences (investor_id, offering_id, preference)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    'cash_out'
);

INSERT INTO distribution_history
    (investor_id, offering_id, period_start, period_end, gross_distribution, platform_fee, net_distribution, action_taken, status)
SELECT
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM offerings WHERE slug = 'savannah-solar-i'),
    d::date,
    (d + interval '1 month' - interval '1 day')::date,
    58.33,
    0.00,
    58.33,
    'cash_out',
    'completed'
FROM generate_series('2024-01-01'::date, '2024-06-01'::date, '1 month') AS d;
