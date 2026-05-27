-- 005_reference_status.sql
-- Add a fifth allowed value to projects.status so the fleet-validation pipeline
-- can store validated USPVDB plants as 'reference' rows (not active offerings,
-- not onboarding submissions — they're proof-of-engine artifacts).

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('onboarding', 'active', 'suspended', 'decommissioned', 'reference'));
