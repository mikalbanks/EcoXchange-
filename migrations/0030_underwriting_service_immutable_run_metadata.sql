-- TICKET 12: narrow persistence additions for immutable underwriting orchestration.
-- No finance formulas or underwriting rules are implemented here.

alter table project_finance.underwriting_runs
  add column if not exists execution_status text,
  add column if not exists underwriting_engine_version text,
  add column if not exists underwriting_input_snapshot_json jsonb,
  add column if not exists underwriting_input_hash text,
  add column if not exists underwriting_result_hash text,
  add column if not exists idempotency_key text,
  add column if not exists started_at timestamptz;

update project_finance.underwriting_runs
set execution_status = case
  when status = 'SUCCESS' then 'SUCCESS'
  when status = 'FAILED' then 'FAILED'
  else coalesce(status, 'PENDING')
end
where execution_status is null;

alter table project_finance.underwriting_runs
  alter column execution_status set default 'PENDING';

alter table project_finance.underwriting_runs
  add constraint underwriting_runs_execution_status_check
  check (execution_status in ('PENDING','RUNNING','SUCCESS','FAILED')) not valid;

create unique index if not exists pf_underwriting_idempotency_unique
  on project_finance.underwriting_runs(organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists pf_underwriting_calc_idx
  on project_finance.underwriting_runs(organization_id, calculation_run_id, created_at desc);
create index if not exists pf_underwriting_hash_idx
  on project_finance.underwriting_runs(underwriting_input_hash, underwriting_engine_version, created_at desc)
  where execution_status = 'SUCCESS';

create table if not exists project_finance.underwriting_lender_fit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  lender_category text not null,
  fit text not null check (fit in ('HIGH','MODERATE','LOW','NOT_APPLICABLE')),
  reason_codes_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint underwriting_lender_fit_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict,
  unique (underwriting_run_id, lender_category)
);

create table if not exists project_finance.underwriting_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  recommendation_code text not null,
  category text,
  priority text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint underwriting_recommendations_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict,
  unique (underwriting_run_id, recommendation_code)
);

alter table project_finance.underwriting_lender_fit enable row level security;
alter table project_finance.underwriting_recommendations enable row level security;

create policy underwriting_lender_fit_same_org_select on project_finance.underwriting_lender_fit
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy underwriting_recommendations_same_org_select on project_finance.underwriting_recommendations
for select to authenticated using (organization_id = project_finance.current_organization_id());

create trigger underwriting_lender_fit_immutable
before insert or update or delete on project_finance.underwriting_lender_fit
for each row execute function project_finance.prevent_success_underwriting_child_mutation();
create trigger underwriting_recommendations_immutable
before insert or update or delete on project_finance.underwriting_recommendations
for each row execute function project_finance.prevent_success_underwriting_child_mutation();

comment on column project_finance.underwriting_runs.execution_status is
  'Execution lifecycle; distinct from overall_status credit conclusion.';
comment on column project_finance.underwriting_runs.underwriting_input_snapshot_json is
  'Immutable facts/calculation/policy snapshot evaluated by the deterministic underwriting engine.';
