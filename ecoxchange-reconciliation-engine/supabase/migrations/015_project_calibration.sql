-- 015_project_calibration.sql
-- Spec 23 §1 — per-plant adaptive thresholds, the schema side.
--
-- Replaces the flat ±15% inverter-vs-expected band (spec v2 §3.1) with a band
-- scaled to each plant's own measured residual volatility. This table holds the
-- fit; `verification_records` gains the four columns that record which fit was
-- in force and what it produced.
--
-- What lands here:
--   1. project_calibration — one row per (project, calibration_version)
--   2. an append-only trigger making a frozen calibration immutable
--   3. verification_records.calibration_id / gate_band_pct / detect_band_pct
--      / detect_exceeded / persistence_triggered
--
-- Idempotent throughout: this repo has no migration runner, so every statement
-- is safe to replay. Same convention as 013 and 014.
--
-- ORDERING NOTE: 013 is still marked NOT APPLIED in APPLIED.md. Nothing here
-- depends on it — 015 touches only `verification_records` and the new table —
-- but do not read a successful 015 as evidence that the schema is current.

-- ── The calibration itself ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_calibration (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id),
    calibration_version INT NOT NULL,

    residual_mad_pct    DOUBLE PRECISION NOT NULL,   -- stable season (Mar–Nov) only
    plant_factor        DOUBLE PRECISION NOT NULL,
    seasonal_factors    JSONB NOT NULL,              -- {"1":0.73, ..., "12":0.80}

    window_start        DATE NOT NULL,
    window_end          DATE NOT NULL,
    n_months_used       INT NOT NULL,

    frozen_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    frozen_by           TEXT NOT NULL,
    supersedes_id       UUID REFERENCES project_calibration(id),
    refit_reason        TEXT,

    engine_version      TEXT NOT NULL,
    CONSTRAINT unique_project_calver UNIQUE (project_id, calibration_version)
);

CREATE INDEX IF NOT EXISTS idx_calibration_active
    ON project_calibration(project_id, calibration_version DESC);

-- ── §4.3: frozen at write, never re-fit in place ─────────────────────────────
-- "A rolling fit absorbs the degradation trend and destroys the
-- degradation-monitoring claim." That rule is only real if the database
-- enforces it: application code can be edited, and a calibration is exactly the
-- kind of row someone will be tempted to "correct" in place when a band looks
-- wrong. A re-fit writes a NEW row carrying supersedes_id and refit_reason.
--
-- This is the control behind spec 23 AC 8. Following the precedent set by
-- capital_account_entries in migrations/0009_distribution_waterfall.sql:
-- a REVOKE alone is not enough, because the application commonly connects as
-- the table owner and an owner ignores its own REVOKE. The trigger is the
-- load-bearing half; the REVOKE is defence in depth.

CREATE OR REPLACE FUNCTION project_calibration_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'project_calibration is append-only: a calibration is frozen at write '
        '(spec 23 §4.3). Re-fitting inserts a new row with supersedes_id and '
        'refit_reason; it never updates or deletes an existing one.'
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_calibration_no_update ON project_calibration;
CREATE TRIGGER project_calibration_no_update
    BEFORE UPDATE ON project_calibration
    FOR EACH ROW EXECUTE FUNCTION project_calibration_append_only();

DROP TRIGGER IF EXISTS project_calibration_no_delete ON project_calibration;
CREATE TRIGGER project_calibration_no_delete
    BEFORE DELETE ON project_calibration
    FOR EACH ROW EXECUTE FUNCTION project_calibration_append_only();

REVOKE UPDATE, DELETE ON project_calibration FROM PUBLIC;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The live database runs an `ensure_rls` event trigger, so this table arrives
-- with RLS enabled and NO policy — which is correct and deliberate. A
-- calibration is engine-internal: it is the basis of a distribution gate, and
-- an anon reader has no business with it. The Supabase linter will report
-- `rls_enabled_no_policy` at INFO level for this table. That entry is expected
-- and must not be "fixed" by adding an anon policy. The bands a given month was
-- judged against reach investors through verification_records, which already
-- has its public read policy from 002.

-- ── What each verification used ──────────────────────────────────────────────
-- calibration_id is non-negotiable per §1: an investor dispute six months out
-- requires reproducing the exact bands in force at the time, and a band that
-- can only be recomputed from today's calibration is not a reproduction.

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS calibration_id UUID REFERENCES project_calibration(id);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS gate_band_pct   DOUBLE PRECISION;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS detect_band_pct DOUBLE PRECISION;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS detect_exceeded BOOLEAN DEFAULT FALSE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS persistence_triggered BOOLEAN DEFAULT FALSE;

-- Nullable on purpose. Rows written before this migration have no calibration
-- and never will; back-filling them with today's bands would be inventing a
-- history. AC 3 applies to rows written POST-migration, and is enforced in the
-- engine rather than by NOT NULL for exactly that reason.

CREATE INDEX IF NOT EXISTS idx_verification_calibration
    ON verification_records(calibration_id);

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE project_calibration IS
    'Spec 23 per-plant threshold calibration. One row per (project, version); '
    'frozen at write and immutable thereafter — the append-only trigger, not '
    'convention, is what enforces that. A re-fit (physical change, spec 21 '
    'shift_detected, or scheduled annual review) inserts a new row linked by '
    'supersedes_id. Never UPDATE.';

COMMENT ON COLUMN project_calibration.residual_mad_pct IS
    'Median absolute deviation of the plant''s inverter-vs-expected residual, '
    'percent, computed over STABLE SEASON MONTHS ONLY (Mar–Nov). Winter is '
    'excluded deliberately: including it inflates the figure roughly 2.4x '
    '(12.0% vs 5.1%, spec 20 §4.1) and yields bands too wide all year. Winter '
    'is handled by a multiplier at band-computation time instead.';

COMMENT ON COLUMN project_calibration.seasonal_factors IS
    'Month number (1-12) to multiplier. Cohort priors from spec 20 (2,621 '
    'plants) until the plant has >=24 months of its own history. These are '
    'MEASURED values, not tuning knobs — re-derive only from a cohort backtest.';

COMMENT ON COLUMN project_calibration.supersedes_id IS
    'The calibration this one replaces, NULL for the first. Together with '
    'calibration_version this is the audit chain: every band a distribution was '
    'ever gated on remains reconstructable.';

COMMENT ON COLUMN project_calibration.frozen_by IS
    'Who or what froze this fit — a job name for scheduled runs, a user '
    'identifier for a manual re-fit. Paired with refit_reason it answers "why '
    'did this plant''s band change" without reading code.';

COMMENT ON COLUMN verification_records.calibration_id IS
    'The calibration in force when this period was judged. NULL only for rows '
    'written before spec 23. Do not resolve a historical band through the '
    'project''s CURRENT calibration — that is the reproduction this column '
    'exists to prevent.';

COMMENT ON COLUMN verification_records.gate_band_pct IS
    'The inverter-vs-expected band whose breach blocks distribution for this '
    'period, percent, winter multiplier already applied.';

COMMENT ON COLUMN verification_records.detect_band_pct IS
    'The narrower observation band. Breaching it alone does not block; '
    'breaching it two months running does (see persistence_triggered).';

COMMENT ON COLUMN verification_records.detect_exceeded IS
    'Whether the detect band was breached this period. Carried forward: the '
    'NEXT period reads this to evaluate persistence, so it is state, not just '
    'a report.';

COMMENT ON COLUMN verification_records.persistence_triggered IS
    'True when this period AND the immediately prior period both exceeded the '
    'detect band. Residual lag-1 autocorrelation is +0.445 (spec 20 §6.1) — '
    'real excursions persist, single-month noise usually does not. This is what '
    'catches sustained moderate underperformance that never trips the wide gate.';
