-- 003_storage_bucket.sql
-- Private bucket for raw API evidence (JSON only, 10MB cap).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', false, 10485760, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;
