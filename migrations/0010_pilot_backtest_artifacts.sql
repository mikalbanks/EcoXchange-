CREATE TABLE IF NOT EXISTS pilot_backtest_artifacts (
  result_id uuid PRIMARY KEY,
  site_id text NOT NULL,
  generated_at timestamptz NOT NULL,
  engine_version text NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pilot_backtest_artifacts_report_object
    CHECK (jsonb_typeof(report) = 'object')
);

CREATE INDEX IF NOT EXISTS pilot_backtest_artifacts_latest_idx
  ON pilot_backtest_artifacts (generated_at DESC, result_id DESC);

REVOKE ALL ON pilot_backtest_artifacts FROM PUBLIC;

ALTER TABLE pilot_backtest_artifacts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION pilot_backtest_artifacts_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'pilot_backtest_artifacts is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pilot_backtest_artifacts_no_update ON pilot_backtest_artifacts;
CREATE TRIGGER pilot_backtest_artifacts_no_update
  BEFORE UPDATE OR DELETE ON pilot_backtest_artifacts
  FOR EACH ROW EXECUTE FUNCTION pilot_backtest_artifacts_append_only();
