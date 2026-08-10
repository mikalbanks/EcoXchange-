-- 013_spec19_containment.sql
-- Spec 19 Task A — immediate containment.
--
-- The Savannah demo project carries the twelve zero-deviation fixture records
-- documented in docs/spec-19-diagnostic.md. It is marked status = 'active',
-- which makes it visible to getActiveProjects() and to any scheduled job that
-- iterates active projects. Suspend it so nothing picks the fixture up.
--
-- The row is NOT deleted: it is the evidence for the diagnostic and the basis
-- for the Task C reseed.
--
-- Applied by hand (there is no migration runner in this repo) and recorded in
-- APPLIED.md.

UPDATE projects
SET status = 'suspended',
    updated_at = now()
WHERE inverter_plant_id = 'demo-plant-001';
