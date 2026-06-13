-- 007_pvlib_fields.sql
-- Higher-fidelity system fields consumed by the pvlib expected-generation
-- microservice. All optional with sensible defaults so existing rows and the
-- in-process fallback model are unaffected.

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS module_type TEXT NOT NULL DEFAULT 'monocrystalline',
    ADD COLUMN IF NOT EXISTS inverter_efficiency DOUBLE PRECISION NOT NULL DEFAULT 0.96,
    ADD COLUMN IF NOT EXISTS dc_ac_ratio DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    ADD COLUMN IF NOT EXISTS racking_type TEXT NOT NULL DEFAULT 'open_rack',
    -- albedo is not present in the original schema (001); add it here.
    ADD COLUMN IF NOT EXISTS albedo DOUBLE PRECISION NOT NULL DEFAULT 0.2;

-- Constrain the enumerated fields to the values the service understands.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_module_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_module_type_check
    CHECK (module_type IN ('monocrystalline', 'polycrystalline', 'thin_film', 'cdte'));

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_racking_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_racking_type_check
    CHECK (racking_type IN ('open_rack', 'roof_mount', 'single_axis_tracker'));
