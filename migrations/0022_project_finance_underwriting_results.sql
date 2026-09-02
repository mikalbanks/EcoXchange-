-- TICKET 08 / SPEC 04: underwriting storage scaffolding only.
-- Ticket 09 will populate policy decisions; this migration creates immutable storage shapes.

create table if not exists project_finance.underwriting_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  scenario_id uuid not null,
  calculation_run_id uuid not null,
  underwriting_policy_id uuid not null references project_finance.underwriting_policies(id) on delete restrict,
  underwriting_policy_version text not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED')),
  financial_profile text,
  financing_readiness text,
  overall_status text,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint underwriting_runs_project_org_fk foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint underwriting_runs_scenario_org_fk foreign key (scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict,
  constraint underwriting_runs_calculation_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

alter table project_finance.scenarios
  add constraint scenarios_latest_underwriting_fk
  foreign key (latest_underwriting_run_id) references project_finance.underwriting_runs(id) on delete restrict;

create table if not exists project_finance.underwriting_rule_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  rule_id text not null,
  rule_version text not null,
  status text not null,
  severity text not null,
  actual_value_json jsonb,
  required_value_json jsonb,
  message text,
  source_reference text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint underwriting_rule_results_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict,
  unique (underwriting_run_id, rule_id, rule_version)
);

create table if not exists project_finance.underwriting_risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  risk_category text not null,
  severity text not null,
  title text not null,
  description text not null,
  source_rule_id text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint underwriting_risks_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.underwriting_conditions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  condition_code text not null,
  severity text not null,
  title text not null,
  description text not null,
  status text not null default 'OPEN',
  source_rule_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint underwriting_conditions_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict,
  unique (underwriting_run_id, condition_code)
);

create table if not exists project_finance.underwriting_missing_information (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  underwriting_run_id uuid not null,
  field_key text not null,
  reason text not null,
  required_for text not null check (required_for in ('CALCULATION','UNDERWRITING','LENDER_READINESS')),
  severity text not null,
  created_at timestamptz not null default now(),
  constraint underwriting_missing_info_run_org_fk foreign key (underwriting_run_id, organization_id)
    references project_finance.underwriting_runs(id, organization_id) on delete restrict,
  unique (underwriting_run_id, field_key, required_for)
);

create index if not exists pf_underwriting_scenario_idx on project_finance.underwriting_runs(organization_id, scenario_id, created_at desc);
create index if not exists pf_underwriting_calc_idx on project_finance.underwriting_runs(organization_id, calculation_run_id);
create index if not exists pf_rule_results_run_idx on project_finance.underwriting_rule_results(organization_id, underwriting_run_id);
create index if not exists pf_risks_run_idx on project_finance.underwriting_risks(organization_id, underwriting_run_id);
create index if not exists pf_conditions_run_idx on project_finance.underwriting_conditions(organization_id, underwriting_run_id);

create or replace function project_finance.can_access_underwriting(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = project_finance, public
as $$
  select exists (
    select 1 from project_finance.underwriting_runs r
    where r.id = p_run_id
      and r.organization_id = project_finance.current_organization_id()
  )
$$;

revoke all on function project_finance.can_access_underwriting(uuid) from public;
grant execute on function project_finance.can_access_underwriting(uuid) to authenticated, service_role;

create or replace function project_finance.prevent_completed_underwriting_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'SUCCESS' then
    raise exception 'successful underwriting runs are immutable and cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.status = 'SUCCESS' then
    raise exception 'successful underwriting runs are immutable; create a new run';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger underwriting_run_lock
before update or delete on project_finance.underwriting_runs
for each row execute function project_finance.prevent_completed_underwriting_mutation();
