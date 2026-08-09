-- 012_polymesh.sql
-- Spec 18 § 2.4 — Polymesh chain reads (Layer A).
--
-- Additive only. `projects`, `raw_readings`, `verification_records` and
-- `engine_runs` are untouched.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- APPLIED 2026-08-09 to xgcrooajrdpcgpgoazti (EcoXchange-). Gate B resolved.
--
-- Gate B — the `projects` ambiguity — RESOLVED. The two tables named `projects`
-- were never in the same database: xgcrooajrdpcgpgoazti holds the UUID/physics
-- one from 001_initial_schema.sql (the FK below), and ojwofgbrxptiaqwjmcou held
-- the varchar/capital-markets one from shared/schema.ts. Verified live; all five
-- FKs in this migration resolve to uuid targets. `projects` has since been
-- removed from drizzle's tablesFilter so a consolidated database cannot have
-- `drizzle-kit push --force` reconcile the two. See docs/database-consolidation.md.
--
-- Gate A — reference asset — STILL OPEN. The tables below exist and are empty.
-- EcoXchange has zero issued Polymesh assets, so the queries in
-- src/polymesh/queries.ts have never seen a real response, and the daily sync
-- no-ops until an asset is mapped. Do not trust the sync, and do not set
-- VITE_CHAIN_VIEW_ENABLED, until docs/polymesh-reference-asset.md is satisfied.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Polymesh assets (ST-20 tokens) mapped to EcoXchange projects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE polymesh_assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID REFERENCES projects(id),   -- nullable: asset may exist pre-mapping
    asset_id            TEXT NOT NULL,                  -- Polymesh asset identifier (Asset.id)
    ticker              TEXT,
    asset_name          TEXT,

    -- Two representations, deliberately. Polymesh is 6-decimal fixed point, and
    -- the chain's own value is an unscaled integer. `*_raw` is that integer,
    -- stored verbatim as TEXT, and is the SOURCE OF TRUTH — it round-trips
    -- exactly and survives any future change to the chain's scale. The NUMERIC
    -- column is derived for display and aggregation only.
    total_supply        NUMERIC,
    total_supply_raw    TEXT,

    -- Polymesh exposes no per-asset decimals field; the scale is a chain-wide
    -- constant. Recorded here as documentation of how *_raw was scaled, never
    -- as an arithmetic input. See src/polymesh/models.ts CHAIN_DECIMALS.
    decimals            INT DEFAULT 6,
    network             TEXT NOT NULL DEFAULT 'testnet'
                        CHECK (network IN ('testnet', 'mainnet')),
    issuer_did          TEXT,
    is_divisible        BOOLEAN,

    -- Sync metadata
    last_synced_at      TIMESTAMPTZ,
    sync_status         TEXT DEFAULT 'pending'
                        CHECK (sync_status IN ('pending','ok','error')),
    sync_error          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_asset_network UNIQUE (asset_id, network)
);
CREATE INDEX idx_polymesh_assets_project ON polymesh_assets(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Holder balances. Append-only snapshots per sync, deliberately NOT an upsert —
-- cap-table-over-time is required for investor reporting and any future
-- secondary-market analysis, and storage is trivial at this scale.
--
-- The sync writes one explicit `snapshot_at` for the whole run (the run's
-- started_at) rather than letting each row default to now(). That is what makes
-- the unique constraint below do real work: re-running a run cannot duplicate a
-- snapshot.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE polymesh_holders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polymesh_asset_id   UUID NOT NULL REFERENCES polymesh_assets(id) ON DELETE CASCADE,
    holder_did          TEXT NOT NULL,
    balance             NUMERIC NOT NULL,
    balance_raw         TEXT,
    snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_holder_snapshot UNIQUE (polymesh_asset_id, holder_did, snapshot_at)
);
CREATE INDEX idx_holders_asset ON polymesh_holders(polymesh_asset_id, snapshot_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- On-chain distribution events, reconciled against verification_records.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE polymesh_distributions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polymesh_asset_id       UUID NOT NULL REFERENCES polymesh_assets(id) ON DELETE CASCADE,

    -- On-chain facts
    distribution_id         TEXT NOT NULL,      -- Distribution.id, "<assetId>/<localId>"
    block_number            BIGINT,             -- createdBlock.blockId
    block_timestamp         TIMESTAMPTZ,        -- createdBlock.datetime
    -- The chain's Distribution entity carries no extrinsic hash; only
    -- DistributionPayment does, via createdEvent. This holds the creating block
    -- hash so explorer links resolve, and the UI labels it as a block link
    -- rather than an extrinsic link. Nullable on purpose.
    extrinsic_hash          TEXT,
    currency                TEXT,               -- Distribution.currency is an Asset ref; its id is stored
    amount_per_share        NUMERIC,            -- derived from perShare
    amount_per_share_raw    TEXT,               -- Distribution.perShare, verbatim
    total_amount            NUMERIC,            -- derived from amount
    total_amount_raw        TEXT,               -- Distribution.amount, verbatim
    payment_at              TIMESTAMPTZ,        -- Distribution.paymentAt (BigInt ms)
    expires_at              TIMESTAMPTZ,

    -- ── The reconciliation join — the entire point of Layer A ────────────────
    -- Set ONLY from a pcp_submissions link. Date proximity may annotate
    -- reconciliation_notes but must never populate this column: a green badge
    -- asserting a linkage inferred from a payment date is a public claim that
    -- cannot be defended. See src/polymesh/reconcile.ts.
    verification_record_id  UUID REFERENCES verification_records(id),
    reconciliation_status   TEXT DEFAULT 'unmatched'
                            CHECK (reconciliation_status IN ('unmatched','matched','discrepancy')),
    reconciliation_notes    TEXT,

    raw_event               JSONB NOT NULL,     -- includes remaining + taxes, which have no column
    synced_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_distribution UNIQUE (polymesh_asset_id, distribution_id)
);
CREATE INDEX idx_distributions_asset ON polymesh_distributions(polymesh_asset_id, payment_at DESC);
CREATE INDEX idx_distributions_recon ON polymesh_distributions(reconciliation_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Operational log, mirroring the engine_runs pattern from 001_initial_schema.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE polymesh_sync_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    network             TEXT NOT NULL,
    assets_attempted    INT NOT NULL DEFAULT 0,
    assets_synced       INT NOT NULL DEFAULT 0,
    assets_errored      INT NOT NULL DEFAULT 0,
    holders_upserted    INT NOT NULL DEFAULT 0,
    distributions_found INT NOT NULL DEFAULT 0,
    errors              JSONB,
    trigger_type        TEXT DEFAULT 'scheduled'
                        CHECK (trigger_type IN ('manual','scheduled'))
);
CREATE INDEX idx_polymesh_sync_runs_started ON polymesh_sync_runs(started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS, following 002_rls.sql: the engine writes with the service-role key (RLS
-- bypassed); the dashboard reads with the anon key.
--
-- These three are public-readable because they mirror a public ledger — anyone
-- can already read them from the chain, and the product claim is that the
-- reconciliation is publicly checkable. Contrast pcp_submissions in migration
-- 011, which is service-role only.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE polymesh_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymesh_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymesh_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymesh_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read polymesh_assets" ON polymesh_assets
    FOR SELECT USING (true);
CREATE POLICY "Public read polymesh_holders" ON polymesh_holders
    FOR SELECT USING (true);
CREATE POLICY "Public read polymesh_distributions" ON polymesh_distributions
    FOR SELECT USING (true);
CREATE POLICY "Public read polymesh_sync_runs" ON polymesh_sync_runs
    FOR SELECT USING (true);
