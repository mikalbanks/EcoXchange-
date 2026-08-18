-- Per-leg provenance and coverage for each immutable verification determination.
CREATE TABLE IF NOT EXISTS verification_source_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_record_id UUID NOT NULL REFERENCES verification_records(id) ON DELETE CASCADE,
    source data_source NOT NULL,
    basis TEXT NOT NULL CHECK (basis IN (
        'measured', 'uploaded', 'modeled', 'derived', 'simulated', 'unconfirmed'
    )),
    provider TEXT NOT NULL,
    source_record_id TEXT,
    retrieved_at TIMESTAMPTZ,
    depends_on_source data_source,
    lineage JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_intervals INTEGER NOT NULL CHECK (expected_intervals >= 0),
    observed_intervals INTEGER NOT NULL CHECK (
        observed_intervals >= 0 AND observed_intervals <= expected_intervals
    ),
    coverage_pct NUMERIC(5,2) NOT NULL CHECK (coverage_pct BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT verification_source_legs_record_source_unique
        UNIQUE (verification_record_id, source)
);

CREATE INDEX IF NOT EXISTS verification_source_legs_record_idx
    ON verification_source_legs (verification_record_id);
CREATE INDEX IF NOT EXISTS verification_source_legs_provider_idx
    ON verification_source_legs (provider, retrieved_at DESC);

ALTER TABLE verification_source_legs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON verification_source_legs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON verification_source_legs TO anon, authenticated;
GRANT SELECT, INSERT ON verification_source_legs TO service_role;

DROP POLICY IF EXISTS "Public read verification source provenance" ON verification_source_legs;
CREATE POLICY "Public read verification source provenance"
    ON verification_source_legs FOR SELECT
    TO anon, authenticated
    USING (true);

COMMENT ON TABLE verification_source_legs IS
    'Immutable per-record evidence basis, provider, lineage, retrieval time, and interval coverage. A derived leg must identify its dependency.';
