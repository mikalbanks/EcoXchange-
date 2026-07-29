-- Spec 17 — Distribution Waterfall, Capital Accounts & Tax Allocation Engine
--
-- The tables themselves come from `shared/schema.ts` via `drizzle-kit push`.
-- This migration adds what Drizzle's DSL cannot express, and every item here is
-- an acceptance criterion the specification requires be enforced *at the
-- database layer* rather than in application code:
--
--   AC 11  terms without `counsel_confirmed_at` cannot execute a run
--   AC 13  no code path executes a distribution without recorded human approval
--   AC 16  UPDATE and DELETE on `capital_account_entries` fail at the database
--
-- Plus the CHECK constraints standing in for the enumerated types in § 4 (this
-- schema uses `text` columns with constants rather than PG enums, matching the
-- convention in the rest of `shared/schema.ts`).
--
-- Idempotent throughout, following `0006_verification_engine.sql`. Run after
-- `drizzle-kit push`:
--
--   psql "$DATABASE_URL" -f migrations/0009_distribution_waterfall.sql

-- ─── Enumerated values ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waterfall_terms_tax_method_chk') THEN
    ALTER TABLE waterfall_terms ADD CONSTRAINT waterfall_terms_tax_method_chk
      CHECK (tax_allocation_method IN ('targeted', 'layer_cake', 'pro_rata'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waterfall_terms_itc_chk') THEN
    ALTER TABLE waterfall_terms ADD CONSTRAINT waterfall_terms_itc_chk
      CHECK (itc_treatment IN ('allocated', 'transferred_6418', 'none'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waterfall_terms_residual_chk') THEN
    ALTER TABLE waterfall_terms ADD CONSTRAINT waterfall_terms_residual_chk
      CHECK (rounding_residual_treatment IN ('carry_forward', 'to_sponsor'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_positions_source_chk') THEN
    ALTER TABLE member_positions ADD CONSTRAINT member_positions_source_chk
      CHECK (source IN ('subscription', 'transfer_in', 'transfer_out', 'redemption'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'period_financials_status_chk') THEN
    ALTER TABLE period_financials ADD CONSTRAINT period_financials_status_chk
      CHECK (close_status IN ('open', 'closed', 'restated'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reserve_accounts_basis_chk') THEN
    ALTER TABLE reserve_accounts ADD CONSTRAINT reserve_accounts_basis_chk
      CHECK (target_basis IN ('fixed', 'months_opex', 'pct_revenue', 'schedule'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reserve_movements_direction_chk') THEN
    ALTER TABLE reserve_movements ADD CONSTRAINT reserve_movements_direction_chk
      CHECK (direction IN ('fund', 'draw'));
  END IF;

  -- A zero-amount movement is noise in an audit log, and a negative one is a
  -- movement in the other direction wearing a disguise.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reserve_movements_amount_chk') THEN
    ALTER TABLE reserve_movements ADD CONSTRAINT reserve_movements_amount_chk
      CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distribution_runs_status_chk') THEN
    ALTER TABLE distribution_runs ADD CONSTRAINT distribution_runs_status_chk
      CHECK (status IN ('computed', 'approved', 'submitted', 'settled', 'failed', 'reversed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capital_account_entries_type_chk') THEN
    ALTER TABLE capital_account_entries ADD CONSTRAINT capital_account_entries_type_chk
      CHECK (entry_type IN ('contribution', 'distribution', 'income_allocation',
                            'loss_allocation', 'syndication_cost', 'reversal'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_allocations_status_chk') THEN
    ALTER TABLE tax_allocations ADD CONSTRAINT tax_allocations_status_chk
      CHECK (status IN ('draft', 'cpa_review', 'final', 'amended'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itc_positions_treatment_chk') THEN
    ALTER TABLE itc_positions ADD CONSTRAINT itc_positions_treatment_chk
      CHECK (treatment IN ('allocated', 'transferred_6418'));
  END IF;

  -- § 9: a K-1 may not issue on an allocation marked final with no recorded
  -- CPA review. The application checks this too; the database makes it true.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_allocations_cpa_final_chk') THEN
    ALTER TABLE tax_allocations ADD CONSTRAINT tax_allocations_cpa_final_chk
      CHECK (status <> 'final' OR cpa_reviewed_at IS NOT NULL);
  END IF;
END
$$;

-- ─── AC 16 — `capital_account_entries` is append-only ───────────────────────
--
-- "Revoke UPDATE and DELETE from the application role. Corrections are
-- `reversal` entries." A REVOKE alone is not enough: the application commonly
-- connects as the table owner, and an owner ignores its own REVOKE. The trigger
-- is the load-bearing control; the REVOKE is defence in depth.

CREATE OR REPLACE FUNCTION capital_account_entries_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'capital_account_entries is append-only (Spec 17 § 4.6): % rejected on entry %. '
    'Corrections are reversal entries with a stated reason.',
    TG_OP, COALESCE(OLD.id::text, '(unknown)')
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS capital_account_entries_no_update ON capital_account_entries;
CREATE TRIGGER capital_account_entries_no_update
  BEFORE UPDATE ON capital_account_entries
  FOR EACH ROW EXECUTE FUNCTION capital_account_entries_append_only();

DROP TRIGGER IF EXISTS capital_account_entries_no_delete ON capital_account_entries;
CREATE TRIGGER capital_account_entries_no_delete
  BEFORE DELETE ON capital_account_entries
  FOR EACH ROW EXECUTE FUNCTION capital_account_entries_append_only();

DO $$
BEGIN
  -- `current_user` is the role the migration runs as, which is the role the
  -- application uses in every deployment of this repo today.
  EXECUTE format('REVOKE UPDATE, DELETE ON capital_account_entries FROM %I', current_user);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'could not revoke UPDATE/DELETE on capital_account_entries: %', SQLERRM;
END
$$;

-- ─── AC 11 — no run against terms counsel has not confirmed ─────────────────
--
-- "Enforce in the database, not the application. Distributing on unconfirmed
-- terms is the worst failure this system can produce."

CREATE OR REPLACE FUNCTION distribution_runs_require_counsel()
RETURNS TRIGGER AS $$
DECLARE
  confirmed_at TIMESTAMP;
  terms_version INT;
BEGIN
  SELECT wt.counsel_confirmed_at, wt.version
    INTO confirmed_at, terms_version
    FROM waterfall_terms wt
   WHERE wt.id = NEW.waterfall_terms_id;

  IF confirmed_at IS NULL THEN
    RAISE EXCEPTION
      'waterfall terms % (version %) have not been confirmed by counsel; '
      'no distribution run may execute against them (Spec 17 § 4.1)',
      NEW.waterfall_terms_id, COALESCE(terms_version, -1)
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS distribution_runs_counsel_gate ON distribution_runs;
CREATE TRIGGER distribution_runs_counsel_gate
  BEFORE INSERT OR UPDATE OF waterfall_terms_id ON distribution_runs
  FOR EACH ROW EXECUTE FUNCTION distribution_runs_require_counsel();

-- ─── AC 13 — no execution without recorded human approval ───────────────────
--
-- § 11.1: "Human approval is mandatory. No automatic distribution execution,
-- ever." A run may not reach `submitted` (or anything past it) without a named
-- approver and a timestamp.

CREATE OR REPLACE FUNCTION distribution_runs_require_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('submitted', 'settled')
     AND (NEW.approved_by IS NULL OR btrim(NEW.approved_by) = '' OR NEW.approved_at IS NULL)
  THEN
    RAISE EXCEPTION
      'distribution run % cannot reach status "%" without a named human approval '
      '(Spec 17 § 11.1)', NEW.id, NEW.status
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS distribution_runs_approval_gate ON distribution_runs;
CREATE TRIGGER distribution_runs_approval_gate
  BEFORE INSERT OR UPDATE ON distribution_runs
  FOR EACH ROW EXECUTE FUNCTION distribution_runs_require_approval();

-- ─── Supporting indexes ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS distribution_runs_period_idx
  ON distribution_runs (spv_id, period_start);

CREATE INDEX IF NOT EXISTS period_financials_status_idx
  ON period_financials (spv_id, close_status);

CREATE INDEX IF NOT EXISTS members_class_idx
  ON members (spv_id, member_class);
