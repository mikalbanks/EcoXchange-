-- SPEC 07 / 0025: provider-neutral AI run and prompt persistence.
-- Optional AI remains outside the deterministic finance/underwriting path.

create table if not exists project_finance.ai_prompt_registry (
  id uuid primary key default gen_random_uuid(),
  prompt_code text not null,
  prompt_version text not null,
  operation_type text not null check (operation_type in ('DOCUMENT_EXTRACTION','UNDERWRITING_EXPLANATION','CREDIT_MEMO')),
  description text,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','RETIRED')),
  created_at timestamptz not null default now(),
  unique(prompt_code,prompt_version)
);

create table if not exists project_finance.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid references project_finance.projects(id) on delete restrict,
  scenario_id uuid references project_finance.scenarios(id) on delete restrict,
  document_id uuid references project_finance.project_documents(id) on delete restrict,
  underwriting_run_id uuid references project_finance.underwriting_runs(id) on delete restrict,
  operation_type text not null check (operation_type in ('DOCUMENT_EXTRACTION','UNDERWRITING_EXPLANATION','CREDIT_MEMO')),
  provider text not null,
  model text not null,
  prompt_code text not null,
  prompt_version text not null,
  input_hash text not null,
  cache_key text,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED','BLOCKED_COST')),
  input_context_json jsonb not null,
  output_json jsonb,
  input_tokens bigint not null default 0,
  cached_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost_usd numeric(24,10) not null default 0,
  actual_cost_usd numeric(24,10),
  error_code text,
  error_message text,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (prompt_code,prompt_version)
    references project_finance.ai_prompt_registry(prompt_code,prompt_version)
    on delete restrict
);

create unique index if not exists pf_ai_runs_cache_success_uq
  on project_finance.ai_runs(organization_id,cache_key)
  where cache_key is not null and status='SUCCESS';
create index if not exists pf_ai_runs_org_created_idx on project_finance.ai_runs(organization_id,created_at desc);
create index if not exists pf_ai_runs_document_idx on project_finance.ai_runs(document_id,created_at desc) where document_id is not null;
create index if not exists pf_ai_runs_underwriting_idx on project_finance.ai_runs(underwriting_run_id,created_at desc) where underwriting_run_id is not null;

alter table project_finance.ai_prompt_registry enable row level security;
alter table project_finance.ai_runs enable row level security;

-- Prompt definitions are readable by authenticated users but are written only by trusted migration/admin paths.
create policy ai_prompt_registry_read on project_finance.ai_prompt_registry
for select to authenticated using (true);

create policy ai_runs_same_org_read on project_finance.ai_runs
for select to authenticated
using (organization_id=project_finance.current_organization_id());

-- No authenticated insert/update/delete policy is intentionally defined for ai_runs.
-- AI run persistence is server/service-role mediated so client code cannot forge usage/cost history.

insert into project_finance.ai_prompt_registry(prompt_code,prompt_version,operation_type,description,status)
values
  ('AI_DOCUMENT_PPA_EXTRACT_V1','1.0.0','DOCUMENT_EXTRACTION','PPA key-term extraction; document text is untrusted and unsupported values return NOT_FOUND.','ACTIVE'),
  ('AI_TERM_SHEET_EXTRACT_V1','1.0.0','DOCUMENT_EXTRACTION','Lender term-sheet structured extraction.','ACTIVE'),
  ('AI_UNDERWRITING_EXPLAIN_V1','1.0.0','UNDERWRITING_EXPLANATION','Explanation of stored deterministic underwriting results without new calculations.','ACTIVE'),
  ('AI_CREDIT_MEMO_V1','1.0.0','CREDIT_MEMO','Preliminary credit-memo draft from stored structured facts and results.','ACTIVE')
on conflict (prompt_code,prompt_version) do nothing;
