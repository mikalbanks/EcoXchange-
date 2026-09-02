-- SPEC 04 / 0020: immutable calculation-run snapshots and idempotency.

create table if not exists project_finance.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references project_finance.scenarios(id) on delete restrict,
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_engine_version text not null,
  underwriting_policy_id uuid references project_finance.underwriting_policies(id) on delete restrict,
  underwriting_policy_version text,
  input_snapshot_json jsonb not null,
  input_hash text not null,
  idempotency_key text,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED','CANCELLED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  unique (scenario_id, input_hash, calculation_engine_version)
);

create index if not exists pf_calc_runs_scenario_idx on project_finance.calculation_runs(scenario_id, created_at desc);
create index if not exists pf_calc_runs_project_idx on project_finance.calculation_runs(project_id, created_at desc);
create index if not exists pf_calc_runs_created_idx on project_finance.calculation_runs(created_at desc);

alter table project_finance.scenarios
  add constraint scenarios_latest_calculation_fk
  foreign key (latest_calculation_run_id) references project_finance.calculation_runs(id) on delete restrict;

create or replace function project_finance.can_access_calculation(p_run_id uuid)
returns boolean language sql stable security definer set search_path=project_finance,public as $$
  select exists (
    select 1 from project_finance.calculation_runs r
    where r.id=p_run_id and r.organization_id=project_finance.current_organization_id()
  )
$$;

create or replace function project_finance.prevent_completed_calculation_mutation()
returns trigger language plpgsql as $$
begin
  if old.status='SUCCESS' and (
    new.input_snapshot_json is distinct from old.input_snapshot_json or
    new.calculation_engine_version is distinct from old.calculation_engine_version or
    new.input_hash is distinct from old.input_hash or
    new.scenario_id is distinct from old.scenario_id or
    new.project_id is distinct from old.project_id
  ) then
    raise exception 'completed calculation runs are immutable';
  end if;
  return new;
end $$;

create trigger calculation_run_lock
before update on project_finance.calculation_runs
for each row execute function project_finance.prevent_completed_calculation_mutation();

alter table project_finance.calculation_runs enable row level security;
create policy calculation_runs_same_org on project_finance.calculation_runs
for all to authenticated using (organization_id=project_finance.current_organization_id())
with check (organization_id=project_finance.current_organization_id());
