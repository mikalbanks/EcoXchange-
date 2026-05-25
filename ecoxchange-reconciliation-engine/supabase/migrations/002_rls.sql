-- 002_rls.sql
-- Enable RLS on all engine tables. The engine writes via service-role key
-- (RLS bypassed). The dashboard reads via anon key with read-only policies.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read projects" ON projects
    FOR SELECT USING (status = 'active');

CREATE POLICY "Public read verification_records" ON verification_records
    FOR SELECT USING (true);

CREATE POLICY "Public read raw_readings" ON raw_readings
    FOR SELECT USING (true);

CREATE POLICY "Public read engine_runs" ON engine_runs
    FOR SELECT USING (true);
