-- Keep immutable backtest artifacts server-only. The API publishes selected
-- records; the browser Data API has no direct access to this evidence store.
ALTER TABLE public.pilot_backtest_artifacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.pilot_backtest_artifacts
  FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.pilot_backtest_artifacts TO service_role;

ALTER FUNCTION public.pilot_backtest_artifacts_append_only()
  SET search_path = pg_catalog, public;

NOTIFY pgrst, 'reload schema';
