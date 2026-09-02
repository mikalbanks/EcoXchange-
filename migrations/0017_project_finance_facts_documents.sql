-- TICKET 08 / SPEC 04: append/supersede project facts and private-document metadata.

create table if not exists project_finance.project_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  document_type text not null check (document_type in (
    'PPA','PROJECT_BUDGET','ENERGY_YIELD_REPORT','INTERCONNECTION_AGREEMENT','EPC_CONTRACT',
    'O_AND_M','INSURANCE','SITE_CONTROL','PERMIT','TAX_REVIEW','LENDER_TERM_SHEET',
    'FINANCIAL_MODEL','OTHER'
  )),
  filename text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  checksum text,
  document_status text not null default 'UPLOADED' check (document_status in ('UPLOADED','REVIEWED','VERIFIED','SUPERSEDED','REJECTED')),
  uploaded_by varchar references public.users(id) on delete restrict,
  superseded_by_document_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint project_documents_project_org_fk
    foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint project_documents_superseded_by_fk
    foreign key (superseded_by_document_id)
    references project_finance.project_documents(id) on delete restrict,
  unique (id, organization_id)
);

create table if not exists project_finance.project_document_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  document_id uuid not null,
  project_id uuid not null,
  field_key text not null,
  value_json jsonb,
  unit text,
  extraction_method text not null check (extraction_method in ('MANUAL','RULE_BASED','OCR','LLM','EXTERNAL_PARSER')),
  confidence numeric(18,10) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  review_status text not null default 'UNREVIEWED' check (review_status in ('UNREVIEWED','ACCEPTED','CORRECTED','REJECTED')),
  evidence_page integer check (evidence_page is null or evidence_page >= 1),
  evidence_text text,
  reviewed_value_json jsonb,
  reviewed_by varchar references public.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint project_document_fields_document_org_fk
    foreign key (document_id, organization_id)
    references project_finance.project_documents(id, organization_id) on delete restrict,
  constraint project_document_fields_project_org_fk
    foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create table if not exists project_finance.project_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  source_type text not null check (source_type in (
    'USER_ASSERTION','EXECUTED_DOCUMENT','SPONSOR_DOCUMENT','INDEPENDENT_ENGINEER_REPORT',
    'LENDER_QUOTE','ECOXCHANGE_ASSUMPTION','SYSTEM_DERIVED','UNKNOWN'
  )),
  confidence_status text not null default 'UNKNOWN' check (confidence_status in ('VERIFIED','REPORTED','UNVERIFIED','DISPUTED','SUPERSEDED','UNKNOWN')),
  source_document_id uuid,
  supersedes_fact_id uuid,
  is_current boolean not null default true,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint project_facts_project_org_fk
    foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint project_facts_source_document_org_fk
    foreign key (source_document_id, organization_id)
    references project_finance.project_documents(id, organization_id) on delete restrict,
  constraint project_facts_supersedes_fk
    foreign key (supersedes_fact_id)
    references project_finance.project_facts(id) on delete restrict,
  check ((is_current and superseded_at is null) or (not is_current))
);

create unique index if not exists pf_project_facts_one_current
  on project_finance.project_facts(project_id, field_key)
  where is_current;
create index if not exists pf_project_facts_org_project_key_idx
  on project_finance.project_facts(organization_id, project_id, field_key, created_at desc);
create index if not exists pf_project_documents_org_project_idx
  on project_finance.project_documents(organization_id, project_id, created_at desc);
create index if not exists pf_document_fields_org_project_idx
  on project_finance.project_document_fields(organization_id, project_id, field_key);

create or replace function project_finance.supersede_project_fact(p_old_fact_id uuid, p_new_fact_id uuid)
returns void
language plpgsql
security definer
set search_path = project_finance, public
as $$
declare
  old_row project_finance.project_facts;
  new_row project_finance.project_facts;
begin
  select * into old_row from project_finance.project_facts where id = p_old_fact_id for update;
  select * into new_row from project_finance.project_facts where id = p_new_fact_id for update;
  if old_row.id is null or new_row.id is null then raise exception 'fact not found'; end if;
  if old_row.organization_id <> new_row.organization_id or old_row.project_id <> new_row.project_id or old_row.field_key <> new_row.field_key then
    raise exception 'facts must share organization, project, and field_key';
  end if;
  if old_row.organization_id <> project_finance.current_organization_id() then raise exception 'tenant access denied'; end if;

  update project_finance.project_facts
  set is_current = false, confidence_status = 'SUPERSEDED', superseded_at = now()
  where id = p_old_fact_id;
  update project_finance.project_facts
  set is_current = true, supersedes_fact_id = p_old_fact_id, superseded_at = null
  where id = p_new_fact_id;
end $$;

revoke all on function project_finance.supersede_project_fact(uuid, uuid) from public;
grant execute on function project_finance.supersede_project_fact(uuid, uuid) to authenticated, service_role;

create or replace view project_finance.current_project_facts
with (security_invoker = true)
as
select id, organization_id, project_id, field_key, value_json, unit, source_type,
       confidence_status, source_document_id, created_by, created_at
from project_finance.project_facts
where is_current;

alter table project_finance.project_documents enable row level security;
alter table project_finance.project_document_fields enable row level security;
alter table project_finance.project_facts enable row level security;

create policy project_documents_same_org_select on project_finance.project_documents
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy project_documents_same_org_insert on project_finance.project_documents
for insert to authenticated with check (
  organization_id = project_finance.current_organization_id()
  and project_finance.can_access_project(project_id)
  and (uploaded_by is null or uploaded_by = project_finance.current_actor_user_id())
);
create policy project_documents_same_org_update on project_finance.project_documents
for update to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy project_document_fields_same_org_select on project_finance.project_document_fields
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy project_document_fields_same_org_insert on project_finance.project_document_fields
for insert to authenticated with check (organization_id = project_finance.current_organization_id() and project_finance.can_access_project(project_id));
create policy project_document_fields_same_org_update on project_finance.project_document_fields
for update to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy project_facts_same_org_select on project_finance.project_facts
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy project_facts_same_org_insert on project_finance.project_facts
for insert to authenticated with check (
  organization_id = project_finance.current_organization_id()
  and project_finance.can_access_project(project_id)
  and (created_by is null or created_by = project_finance.current_actor_user_id())
);
create policy project_facts_same_org_update on project_finance.project_facts
for update to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

-- No authenticated DELETE policies. Facts/documents are superseded, not hard-deleted.
