-- Finish the server-only Data API boundary identified by the Supabase advisor.
REVOKE ALL PRIVILEGES ON TABLE public.projects FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO service_role;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
