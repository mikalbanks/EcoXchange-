-- The transactional app uses server-side Postgres and service-role access.
-- None of these internal tables is a supported browser-facing Data API.
-- Remove inherited Supabase grants and enable RLS as defense in depth.

DO $$
DECLARE
  table_name text;
  internal_tables text[] := ARRAY[
    'accounts', 'anomaly_flags', 'capital_stacks',
    'data_room_checklist_items', 'distributions', 'documents',
    'energy_production', 'interconnection_queue_entries',
    'investor_interests', 'irradiance_snapshots',
    'jurisdiction_ppa_benchmarks', 'marketplace_meta', 'meters',
    'postings', 'ppas', 'project_approval_logs', 'queue_entry_analytics',
    'readiness_scores', 'revenue_records', 'scada_connectors',
    'scada_data_sources', 'sgt_intervals', 'transactions', 'users',
    'verification_runs', 'conversations', 'messages',
    'capital_account_entries', 'distribution_allocations',
    'distribution_runs', 'expected_generation_reports', 'fund_interests',
    'itc_positions', 'member_positions', 'members', 'period_financials',
    'portfolios', 'dev_projects', 'reserve_accounts', 'reserve_movements',
    'site_uncertainty', 'spvs', 'tax_allocations', 'waterfall_terms'
  ];
BEGIN
  FOREACH table_name IN ARRAY internal_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
        table_name
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

-- New internal tables/functions should not become browser-accessible by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
