-- 014_data_provenance.sql
-- Spec 19 Task B — provenance travels with the record.
--
-- Every verification record must declare where its telemetry came from. Making
-- this a column rather than a render-time decoration means it cannot be
-- forgotten at render time: a record that cannot say where it came from does
-- not get served (see G2 in server/services/backtest-supabase-writer.ts).
--
-- 'simulated'      real satellite irradiance, simulated inverter/utility legs
-- 'live_telemetry' all three sources from real APIs. RESERVED — nothing may
--                  claim this until real inverter telemetry is connected.
--
-- Order matters: add nullable, backfill, then enforce NOT NULL. There is
-- deliberately NO DEFAULT — a default lets a future insert stay silent about
-- its origin, which is the exact failure this migration exists to prevent.
--
-- Applied by hand (there is no migration runner in this repo) and recorded in
-- APPLIED.md.

CREATE TYPE data_provenance AS ENUM (
    'simulated',
    'live_telemetry'
);

-- ── verification_records ─────────────────────────────────────────────────────
ALTER TABLE verification_records
    ADD COLUMN data_provenance data_provenance;

-- Everything that exists today is simulated: the twelve fixture rows carry
-- inverter_kwh identical to expected_kwh (docs/spec-19-diagnostic.md).
UPDATE verification_records
SET data_provenance = 'simulated'
WHERE data_provenance IS NULL;

ALTER TABLE verification_records
    ALTER COLUMN data_provenance SET NOT NULL;

-- ── raw_readings ─────────────────────────────────────────────────────────────
-- The Task C reseed writes inverter, utility and satellite rows here, so the
-- same rule applies: a reading states its origin or it does not get stored.
ALTER TABLE raw_readings
    ADD COLUMN data_provenance data_provenance;

UPDATE raw_readings
SET data_provenance = 'simulated'
WHERE data_provenance IS NULL;

ALTER TABLE raw_readings
    ALTER COLUMN data_provenance SET NOT NULL;
