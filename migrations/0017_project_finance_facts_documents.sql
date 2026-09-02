-- SPEC 04 / 0017: historical project facts and document provenance.

create table if not exists project_finance.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  document_status text not null default 'UPLOADED' check (document_status in ('UPLOADED','REVIEWED','VERIFIED','SUPERSEDED','REJECTED')),
  uploaded_by uuid references project_finance.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  checksum text,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists project_finance.project_document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references project_finance.project_documents(id) on delete restrict,
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  field_key text not null,
  extracted_value_json jsonb,
  extraction_method text not null check (extraction_method in ('MANUAL','RULE_BASED','OCR','LLM','EXTERNAL_PARSER')),
  extraction_model text,
  extraction_confidence numeric(18,10),
  reviewed_value_json jsonb,
  review_status text not null default 'UNREVIEWED' check (review_status in ('UNREVIEWED','ACCEPTED','CORRECTED','REJECTED')),
  reviewed_by uuid references project_finance.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.project_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  source_type text not null check (source_type in ('USER_ASSERTION','EXECUTED_DOCUMENT','SPONSOR_DOCUMENT','INDEPENDENT_THIRD_PARTY_REPORT','LENDER_QUOTE','ECOXCHANGE_ASSUMPTION','SYSTEM_DERIVED','UNKNOWN')),
  source_document_id uuid references project_finance.project_documents(id) on delete restrict,
  source_document_field_id uuid references project_finance.project_document_fields(id) on delete restrict,
  confidence_status text not null default 'UNKNOWN' check (confidence_status in ('VERIFIED','REPORTED','UNVERIFIED','DISPUTED','SUPERSEDED','UNKNOWN')),
  effective_date date,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create index if not exists pf_project_facts_key_idx on project_finance.project_facts(project_id, field_key, created_at desc);
create index if not exists pf_project_documents_project_idx on project_finance.project_documents(project_id, uploaded_at desc);
create index if not exists pf_document_fields_project_idx on project_finance.project_document_fields(project_id, field_key);

create or replace view project_finance.current_project_facts as
select distinct on (project_id, field_key) *
from project_finance.project_facts
where superseded_at is null and confidence_status <> 'SUPERSEDED'
order by project_id, field_key, created_at desc;

alter table project_finance.project_documents enable row level security;
alter table project_finance.project_document_fields enable row level security;
alter table project_finance.project_facts enable row level security;

create policy project_documents_same_org on project_finance.project_documents
for all to authenticated
using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy project_document_fields_same_org on project_finance.project_document_fields
for all to authenticated
using (project_finance.can_access_project(project_id))
with check (project_finance.can_access_project(project_id));

create policy project_facts_same_org on project_finance.project_facts
for all to authenticated
using (project_finance.can_access_project(project_id))
with check (project_finance.can_access_project(project_id));
