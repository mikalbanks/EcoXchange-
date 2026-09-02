-- SPEC 04 / 0023: audit events, RLS for child tables, immutable successful results.

create table if not exists project_finance.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid references project_finance.projects(id) on delete restrict,
  scenario_id uuid references project_finance.scenarios(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('CREATE','UPDATE','DELETE','ARCHIVE','RESTORE','CALCULATE','UNDERWRITE','OVERRIDE_POLICY','UPLOAD_DOCUMENT','ACCEPT_EXTRACTED_FIELD','SUPERSEDE_FACT')),
  actor_user_id uuid references project_finance.users(id) on delete restrict,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pf_audit_org_created_idx on project_finance.audit_events(organization_id,created_at desc);
create index if not exists pf_audit_project_created_idx on project_finance.audit_events(project_id,created_at desc);

create or replace function project_finance.prevent_success_child_mutation()
returns trigger language plpgsql as $$
declare run_id uuid;
begin
  run_id := case when tg_op='DELETE' then old.calculation_run_id else new.calculation_run_id end;
  if exists (select 1 from project_finance.calculation_runs r where r.id=run_id and r.status='SUCCESS') then
    raise exception 'successful calculation outputs are immutable; create a new run';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function project_finance.prevent_success_underwriting_child_mutation()
returns trigger language plpgsql as $$
declare run_id uuid;
begin
  run_id := case when tg_op='DELETE' then old.underwriting_run_id else new.underwriting_run_id end;
  if exists (select 1 from project_finance.underwriting_runs r where r.id=run_id and r.status='SUCCESS') then
    raise exception 'successful underwriting outputs are immutable; create a new run';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

-- Apply immutable-output guards to tables tied directly to a calculation run.
do $$
declare t text;
begin
  foreach t in array array[
    'annual_project_cashflows','annual_debt_schedules','financing_results','tax_credit_results',
    'capital_stack_results','return_results','downside_results','calculation_warnings','calculation_metric_traces'
  ] loop
    execute format('create trigger %I before update or delete on project_finance.%I for each row execute function project_finance.prevent_success_child_mutation()', t||'_immutable', t);
  end loop;
end $$;

-- Apply immutable-output guards to underwriting result tables.
do $$
declare t text;
begin
  foreach t in array array['underwriting_rule_results','risks','conditions_precedent','missing_information'] loop
    execute format('create trigger %I before update or delete on project_finance.%I for each row execute function project_finance.prevent_success_underwriting_child_mutation()', t||'_immutable', t);
  end loop;
end $$;

-- Child-table RLS. Trusted backend/service-role writes bypass these policies.
do $$
declare t text;
begin
  foreach t in array array[
    'annual_project_cashflows','annual_debt_schedules','financing_results','tax_credit_results',
    'capital_stack_results','return_results','downside_results','calculation_warnings','calculation_metric_traces'
  ] loop
    execute format('alter table project_finance.%I enable row level security',t);
    execute format('create policy %I on project_finance.%I for select to authenticated using (project_finance.can_access_calculation(calculation_run_id))',t||'_same_org',t);
  end loop;
end $$;

alter table project_finance.sensitivity_runs enable row level security;
alter table project_finance.sensitivity_points enable row level security;
create policy sensitivity_runs_same_org on project_finance.sensitivity_runs for select to authenticated
using (project_finance.can_access_calculation(base_calculation_run_id));
create policy sensitivity_points_same_org on project_finance.sensitivity_points for select to authenticated
using (exists (select 1 from project_finance.sensitivity_runs s where s.id=sensitivity_run_id and project_finance.can_access_calculation(s.base_calculation_run_id)));

alter table project_finance.underwriting_runs enable row level security;
create policy underwriting_runs_same_org on project_finance.underwriting_runs for all to authenticated
using (organization_id=project_finance.current_organization_id())
with check (organization_id=project_finance.current_organization_id());

do $$
declare t text;
begin
  foreach t in array array['underwriting_rule_results','risks','conditions_precedent','missing_information'] loop
    execute format('alter table project_finance.%I enable row level security',t);
    execute format('create policy %I on project_finance.%I for select to authenticated using (project_finance.can_access_underwriting(underwriting_run_id))',t||'_same_org',t);
  end loop;
end $$;

alter table project_finance.audit_events enable row level security;
create policy audit_events_same_org on project_finance.audit_events for select to authenticated
using (organization_id=project_finance.current_organization_id());

-- Audit history is append-only for application users; no update/delete policy is created.
