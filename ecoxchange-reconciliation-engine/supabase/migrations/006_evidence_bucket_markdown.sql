-- 006_evidence_bucket_markdown.sql
-- Extend the existing `evidence` storage bucket to accept text/markdown
-- alongside application/json. Used by the fleet-validation pipeline to
-- upload the validation report in both formats.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/json', 'text/markdown']
WHERE id = 'evidence';
