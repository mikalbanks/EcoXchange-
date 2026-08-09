-- 011_pcp_submissions.sql
-- Spec 18 § 3.5 — Capital Platform submission audit trail (Layer C).
--
-- Split out from the Polymesh chain tables deliberately. This migration has no
-- foreign key to `projects`, and so is unaffected by the unresolved ambiguity
-- between the UUID `projects` in 001_initial_schema.sql and the varchar
-- `projects` in shared/schema.ts. Its only FK is to `verification_records`,
-- which exists exactly once (the drizzle schema's nearest table is
-- `verification_runs` — a different concept). That is what makes Layer C safe
-- to land before the chain read path.
--
-- Do not add these tables to shared/schema.ts: drizzle-kit push --force runs in
-- Render's build step and manages whatever is in its tablesFilter.

CREATE TABLE pcp_submissions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_record_id  UUID NOT NULL REFERENCES verification_records(id),

    -- Deterministic on (project_id, period_start). UNIQUE is what makes a retry
    -- after an ambiguous network failure incapable of double-paying, whether or
    -- not Polymath's API supports an idempotency header (Spec 18 risk #3).
    idempotency_key         TEXT NOT NULL UNIQUE,
    offering_id             TEXT NOT NULL,
    asset_id                TEXT NOT NULL,
    distribution_amount     NUMERIC NOT NULL,
    currency                TEXT NOT NULL,

    -- Response
    pcp_distribution_id     TEXT,
    status                  TEXT NOT NULL DEFAULT 'submitted'
                            CHECK (status IN ('submitted','accepted','rejected','executed','failed')),
    response_body           JSONB,
    error_message           TEXT,

    -- Mode flag — critical for audit integrity. Without it, mock and real
    -- submissions are indistinguishable and no auditor or investor could tell
    -- which payments actually happened.
    client_mode             TEXT NOT NULL CHECK (client_mode IN ('mock','http')),
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMPTZ
);
CREATE INDEX idx_pcp_submissions_record ON pcp_submissions(verification_record_id);
CREATE INDEX idx_pcp_submissions_status ON pcp_submissions(status);
-- Layer A reconciliation joins on this column; without the index every
-- reconcile run sequentially scans the audit table.
CREATE INDEX idx_pcp_submissions_distribution ON pcp_submissions(pcp_distribution_id);

-- RLS with NO policy: this is an internal audit trail carrying payment amounts
-- and the mock/real flag. Service-role only, unlike the public-read chain
-- mirrors in the Polymesh migration.
ALTER TABLE pcp_submissions ENABLE ROW LEVEL SECURITY;
