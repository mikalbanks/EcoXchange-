-- 013_ingestion_and_quality.sql
-- Spec 21 §4 — the ingestion interface's schema side.
--
-- Three things land here:
--   1. `raw_readings.data_provenance`, so a reading says where it came from
--   2. `reading_quality`, so `raw_readings.data_quality` has evidence behind it
--   3. `projects.telemetry_source` / `telemetry_external_id` / `iana_timezone`,
--      generalizing the v2 `inverter_brand` / `inverter_plant_id` pair so spec 24
--      adds SolarEdge and Enphase with no further migration
--
-- Idempotent throughout: this repo has no migration runner (see APPLIED.md), so
-- every statement is safe to replay.

-- ── 1. Provenance on every reading ───────────────────────────────────────────
-- Spec 21 lists this column as already present from spec 19. It is not: spec 19
-- (commit 063f50f) shipped the PVDAQ 9068 demo bundle and the independence
-- guardrail, and carried leg provenance in the JSON artifact rather than in the
-- table. Adding the column here is what makes the CHECK below meaningful.
ALTER TABLE raw_readings
    ADD COLUMN IF NOT EXISTS data_provenance TEXT NOT NULL DEFAULT 'demo_seed';

COMMENT ON COLUMN raw_readings.data_provenance IS
    'Where this reading came from. ''demo_seed'' is synthetic and must never be '
    'presented as measurement; every other value names a real upstream source.';

ALTER TABLE raw_readings DROP CONSTRAINT IF EXISTS raw_readings_data_provenance_check;
ALTER TABLE raw_readings ADD CONSTRAINT raw_readings_data_provenance_check
  CHECK (data_provenance IN ('demo_seed','pvdaq_real','solaredge_api','enphase_api',
                             'fronius_api','sma_api','manual_csv','eia_923','bayou'));

CREATE INDEX IF NOT EXISTS idx_raw_readings_provenance
    ON raw_readings(data_provenance);

-- ── 2. Quality evidence ──────────────────────────────────────────────────────
-- `raw_readings.data_quality` has existed since 001 and nothing ever wrote it.
-- One row here per reading is what backs the verdict that column carries, so a
-- PENDING month can be explained rather than just asserted.
CREATE TABLE IF NOT EXISTS reading_quality (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_reading_id      UUID NOT NULL REFERENCES raw_readings(id) ON DELETE CASCADE,
    completeness_pct    DOUBLE PRECISION NOT NULL,
    clipped_frac        DOUBLE PRECISION,
    stale_frac          DOUBLE PRECISION,
    outlier_frac        DOUBLE PRECISION,
    night_energy_frac   DOUBLE PRECISION NOT NULL,
    shift_detected      BOOLEAN NOT NULL DEFAULT FALSE,
    interval_minutes    INT NOT NULL,
    qc_verdict          TEXT NOT NULL CHECK (qc_verdict IN ('complete','partial','missing','error')),
    qc_notes            TEXT[],
    pvanalytics_version TEXT NOT NULL,
    evaluated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_reading_quality UNIQUE (raw_reading_id)
);
CREATE INDEX IF NOT EXISTS idx_reading_quality_verdict ON reading_quality(qc_verdict);

COMMENT ON COLUMN reading_quality.night_energy_frac IS
    'Percent of positive energy falling below the horizon, against real solar '
    'geometry at the site. Above 1.0 the series is time-misaligned and the '
    'period is `error`: it must not be reconciled at any tolerance.';
COMMENT ON COLUMN reading_quality.clipped_frac IS
    'Fraction of samples inverter-limited. A NOTE, never a downgrade — a clipped '
    'plant is healthy and normal above DC:AC 1.25.';
COMMENT ON COLUMN reading_quality.shift_detected IS
    'A step change in daily timing against solar transit (inverter replacement, '
    'logger re-clock). Routes to human review; does not auto-flag.';

-- ── 3. Generalized telemetry binding on projects ─────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS telemetry_source TEXT;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_telemetry_source_check;
ALTER TABLE projects ADD CONSTRAINT projects_telemetry_source_check
    CHECK (telemetry_source IN ('pvdaq','solaredge','enphase','fronius','sma','manual_csv'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS telemetry_external_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS iana_timezone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_telemetry
    ON projects(telemetry_source, telemetry_external_id)
    WHERE telemetry_source IS NOT NULL;

COMMENT ON COLUMN projects.iana_timezone IS
    'Real Olson zone for this site. `projects.timezone` defaults to '
    '''America/New_York'' on every row and is not site-specific; month bucketing '
    'must use this column, which retires the longitude/15 approximation noted in '
    'spec 20 §7.6.';

-- The v2 inverter pair becomes optional. It was NOT NULL with a four-vendor
-- CHECK, which forced spec 19's PVDAQ seed to write 'sma' as an explicit
-- "SCHEMA PLACEHOLDER" for a system whose inverter make is not published. A
-- required field that has to be filled with a fiction is worse than a nullable
-- one; `telemetry_source` + `telemetry_external_id` is the real binding now.
ALTER TABLE projects ALTER COLUMN inverter_brand DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN inverter_api_key_ref DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN inverter_plant_id DROP NOT NULL;

COMMENT ON COLUMN projects.inverter_brand IS
    'Superseded by telemetry_source (spec 21 §4). Retained for existing rows; '
    'new projects should leave it NULL.';
