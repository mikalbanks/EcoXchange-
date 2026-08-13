-- 014_plant_analytics.sql
-- Spec 22 §3 — the performance-analytics module's schema side.
--
-- One row per (project, as-of date, degradation method): a measured degradation
-- rate with its confidence interval, a soiling loss, an availability figure, and
-- each translated into dollars against the PPA rate.
--
-- This is the paid tier's storage. The distinction from everything already in
-- this schema is that `raw_readings` records what a plant DID and this table
-- records what is HAPPENING TO IT — and unlike a monthly verdict, a degradation
-- rate is a claim someone will take to a warranty adjuster.
--
-- Idempotent throughout: this repo has no migration runner, so every statement
-- is safe to replay. Same convention as 013.

CREATE TABLE IF NOT EXISTS plant_analytics (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id),
    as_of_date              DATE NOT NULL,
    window_start            DATE NOT NULL,
    window_end              DATE NOT NULL,

    -- Degradation (YoY)
    degradation_pct_per_yr  DOUBLE PRECISION,
    degradation_ci_low      DOUBLE PRECISION,   -- 2.5th percentile
    degradation_ci_high     DOUBLE PRECISION,   -- 97.5th percentile
    degradation_method      TEXT CHECK (degradation_method IN ('clearsky','sensor')),

    -- Soiling (SRR)
    soiling_loss_pct        DOUBLE PRECISION,
    soiling_ci_low          DOUBLE PRECISION,
    soiling_ci_high         DOUBLE PRECISION,
    soiling_ratio           DOUBLE PRECISION,

    -- Availability
    availability_pct        DOUBLE PRECISION,
    lost_production_kwh     DOUBLE PRECISION,
    outage_count            INT,

    -- Economic translation
    ppa_rate_per_kwh        DOUBLE PRECISION,
    soiling_loss_usd        DOUBLE PRECISION,
    availability_loss_usd   DOUBLE PRECISION,

    n_days_analyzed         INT NOT NULL,
    rdtools_version         TEXT NOT NULL,
    engine_version          TEXT NOT NULL,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_project_asof UNIQUE (project_id, as_of_date, degradation_method)
);

CREATE INDEX IF NOT EXISTS idx_plant_analytics_project
    ON plant_analytics(project_id, as_of_date DESC);

-- ── The confidence interval is not optional ──────────────────────────────────
-- §3 is explicit: "a degradation rate without an uncertainty band is not a
-- defensible number, and the whole premise of the paid tier is defensibility."
-- The column types alone cannot say that, because the rate is legitimately NULL
-- for a system with under 24 months of record (§4). So the rule is conditional:
-- a NULL rate needs no bounds, and a non-NULL rate must have both.
--
-- Without this, a run that lost its CI to an upstream change would still write a
-- clean-looking row, and the number most likely to end up in a warranty claim is
-- the one that would silently lose its error bars.
ALTER TABLE plant_analytics DROP CONSTRAINT IF EXISTS plant_analytics_degradation_ci_check;
ALTER TABLE plant_analytics ADD CONSTRAINT plant_analytics_degradation_ci_check
  CHECK (
    degradation_pct_per_yr IS NULL
    OR (degradation_ci_low IS NOT NULL AND degradation_ci_high IS NOT NULL)
  );

-- A rate stored with its bounds the wrong way round still reads as well-formed.
-- Cheap to rule out here, and it is a real hazard for soiling in particular:
-- RdTools reports a soiling RATIO and this table stores a LOSS, so the bounds
-- invert on the way in (see src/analytics/trend.py).
ALTER TABLE plant_analytics DROP CONSTRAINT IF EXISTS plant_analytics_ci_ordering_check;
ALTER TABLE plant_analytics ADD CONSTRAINT plant_analytics_ci_ordering_check
  CHECK (
    (degradation_ci_low IS NULL OR degradation_ci_high IS NULL
     OR degradation_ci_low <= degradation_ci_high)
    AND
    (soiling_ci_low IS NULL OR soiling_ci_high IS NULL
     OR soiling_ci_low <= soiling_ci_high)
  );

-- ── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE plant_analytics IS
    'Spec 22 performance analytics (NREL RdTools): degradation, soiling and '
    'availability per project. NOTE the uniqueness key includes '
    'degradation_method, but only the degradation_* columns are method-specific. '
    'A system analyzed both ways therefore stores its soiling and availability '
    'figures identically on both rows — they are duplicates, not two independent '
    'measurements, and must not be averaged or summed across methods.';

COMMENT ON COLUMN plant_analytics.degradation_pct_per_yr IS
    'Median year-on-year degradation rate, percent per year. Negative means '
    'losing output. NULL where the record is under 24 months: YoY compares each '
    'point to the same point one year prior, so a shorter window yields nothing '
    'meaningful and a point estimate there would be fabricated, not conservative.';

COMMENT ON COLUMN plant_analytics.degradation_ci_low IS
    '2.5th percentile of the YoY distribution. RdTools defaults its interval to '
    '68.2% (±1 sigma); the engine passes confidence_level=95 explicitly so this '
    'column means what its name says.';

COMMENT ON COLUMN plant_analytics.degradation_method IS
    'clearsky (default — normalized against modeled clear-sky irradiance, which '
    'matches the hardware-free premise and avoids irradiance-sensor drift) or '
    'sensor (only where the system has a verified POA channel). Where both ran '
    'and disagree by more than 0.5 %/yr, that disagreement is a diagnostic and is '
    'surfaced as a note on both rows rather than averaged away.';

COMMENT ON COLUMN plant_analytics.soiling_ratio IS
    'Median insolation-weighted soiling ratio from RdTools SRR, as reported '
    '(~0.98 = 2% loss). soiling_loss_pct is its complement. Finding no soiling '
    'signal is a legitimate result for many sites and is recorded as such — the '
    'soiling_* columns stay NULL rather than being forced to a number.';

COMMENT ON COLUMN plant_analytics.availability_pct IS
    'Uptime percent over the window, from RdTools AvailabilityAnalysis, which '
    'separates genuine outages from datalogger communication dropouts. That '
    'separation depends on a cumulative energy channel that keeps counting '
    'through a comms gap; where no revenue-meter channel exists the engine '
    'derives cumulative energy from the same power series that goes NaN during '
    'the dropout, which weakens the distinction. Which basis was used is recorded '
    'per run in reports/plant_analytics.json and shown on the report.';

COMMENT ON COLUMN plant_analytics.ppa_rate_per_kwh IS
    'The rate actually used for the dollar translation, copied from '
    'projects.ppa_rate_per_kwh where set. Where that is NULL a stated default is '
    'used and the output is labelled an estimate — cited-vs-estimated discipline '
    'applies here as everywhere.';

COMMENT ON COLUMN plant_analytics.n_days_analyzed IS
    'Days surviving RdTools filtering, not calendar days in the window. The gap '
    'between the two is the filtering doing its job.';
