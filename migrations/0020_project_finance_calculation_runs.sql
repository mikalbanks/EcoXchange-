-- TICKET 08 / SPEC 04: immutable calculation-run snapshots and version metadata.

create table if not exists project_finance.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  scenario_id uuid not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED')),
  calculation_engine_version text not null,
  underwriting_policy_id uuid references project_finance.underwriting_policies(id) on delete restrict,
  underwriting_policy_version text,
  input_hash text not null,
  policy_hash text,
  result_hash text,
  input_snapshot_json jsonb not null,
  idempotency_key text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  failure_code text,
  failure_details_json jsonb,
  constraint calculation_runs_project_org_fk foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint calculation_runs_scenario_org_fk foreign key (scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create unique index if not exists pf_calc_idempotency_unique
  on project_finance.calculation_runs(organization_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists pf_calc_runs_scenario_idx on project_finance.calculation_runs(organization_id, scenario_id, created_at desc);
create index if not exists pf_calc_runs_project_idx on project_finance.calculation_runs(organization_id, project_id, created_at desc);
create index if not exists pf_calc_runs_cache_idx
  on project_finance.calculation_runs(input_hash, calculation_engine_version, created_at desc)
  where status = 'SUCCESS';
create index if not exists pf_calc_runs_latest_success_idx
  on project_finance.calculation_runs(organization_id, scenario_id, completed_at desc)
  where status = 'SUCCESS';

alter table project_finance.scenarios
  add constraint scenarios_latest_calculation_fk
  foreign key (latest_calculation_run_id) references project_finance.calculation_runs(id) on delete restrict;

create or replace function project_finance.can_access_calculation(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = project_finance, public
as $$
  select exists (
    select 1 from project_finance.calculation_runs r
    where r.id = p_run_id
      and r.organization_id = project_finance.current_organization_id()
  )
$$;

revoke all on function project_finance.can_access_calculation(uuid) from public;
grant execute on function project_finance.can_access_calculation(uuid) to authenticated, service_role;

create or replace function project_finance.prevent_completed_calculation_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'SUCCESS' then
    raise exception 'successful calculation runs are immutable and cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.status = 'SUCCESS' then
    raise exception 'successful calculation runs are immutable; create a new run';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger calculation_run_lock
before update or delete on project_finance.calculation_runs
for each row execute function project_finance.prevent_completed_calculation_mutation();

alter table project_finance.calculation_runs enable row level security;

create policy calculation_runs_same_org_select on project_finance.calculation_runs
for select to authenticated using (organization_id = project_finance.current_organization_id());

-- Calculation runs/results are written by trusted backend transactions, not directly by clients.
