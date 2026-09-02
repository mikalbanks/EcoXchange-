-- TICKET 08 / SPEC 04: audit events, immutable successful records, and tenant RLS.

create table if not exists project_finance.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  actor_user_id varchar references public.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'PROJECT_CREATED','PROJECT_FACT_ADDED','PROJECT_FACT_SUPERSEDED','DOCUMENT_UPLOADED',
    'SCENARIO_CREATED','SCENARIO_UPDATED','SCENARIO_MARKED_STALE','POLICY_OVERRIDE_CREATED',
    'CALCULATION_STARTED','CALCULATION_COMPLETED','CALCULATION_FAILED','UNDERWRITING_COMPLETED'
  )),
  entity_type text not null,
  entity_id uuid not null,
  project_id uuid references project_finance.projects(id) on delete restrict,
  scenario_id uuid references project_finance.scenarios(id) on delete restrict,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pf_audit_org_created_idx on project_finance.audit_events(organization_id, created_at desc);
create index if not exists pf_audit_project_created_idx on project_finance.audit_events(project_id, created_at desc);

create or replace function project_finance.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  raise exception 'audit events are append-only';
end $$;

create trigger audit_events_append_only
before update or delete on project_finance.audit_events
for each row execute function project_finance.prevent_audit_mutation();

create or replace function project_finance.prevent_success_child_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
declare
  run_id uuid;
begin
  run_id := case when tg_op = 'DELETE' then old.calculation_run_id else new.calculation_run_id end;
  if exists (select 1 from project_finance.calculation_runs r where r.id = run_id and r.status = 'SUCCESS') then
    raise exception 'successful calculation outputs are immutable; create a new run';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function project_finance.prevent_success_underwriting_child_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
declare
  run_id uuid;
begin
  run_id := case when tg_op = 'DELETE' then old.underwriting_run_id else new.underwriting_run_id end;
  if exists (select 1 from project_finance.underwriting_runs r where r.id = run_id and r.status = 'SUCCESS') then
    raise exception 'successful underwriting outputs are immutable; create a new run';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Protect insert/update/delete after the parent calculation is finalized SUCCESS.
do $$
declare t text;
begin
  foreach t in array array[
    'annual_project_cashflows','annual_debt_schedules','financing_results','tax_credit_results',
    'capital_stack_results','return_results','downside_results','downside_cash_sweep_rows',
    'reconciliation_results','calculation_warnings','calculation_metric_traces'
  ] loop
    execute format(
      'create trigger %I before insert or update or delete on project_finance.%I for each row execute function project_finance.prevent_success_child_mutation()',
      t || '_immutable', t
    );
  end loop;
end $$;

-- Underwriting children become immutable once their underwriting run succeeds.
do $$
declare t text;
begin
  foreach t in array array[
    'underwriting_rule_results','underwriting_risks','underwriting_conditions','underwriting_missing_information'
  ] loop
    execute format(
      'create trigger %I before insert or update or delete on project_finance.%I for each row execute function project_finance.prevent_success_underwriting_child_mutation()',
      t || '_immutable', t
    );
  end loop;
end $$;

-- Once a policy version is referenced by a calculation or underwriting run, neither
-- the policy record nor its value rows may be rewritten. A new version is required.
create or replace function project_finance.prevent_used_policy_mutation()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
declare
  policy_id uuid;
begin
  if tg_table_name = 'underwriting_policies' then
    policy_id := old.id;
  else
    policy_id := old.policy_id;
  end if;

  if exists (select 1 from project_finance.calculation_runs r where r.underwriting_policy_id = policy_id)
     or exists (select 1 from project_finance.underwriting_runs u where u.underwriting_policy_id = policy_id) then
    raise exception 'used policy versions are immutable; create a new version';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger underwriting_policies_immutable_when_used
before update or delete on project_finance.underwriting_policies
for each row execute function project_finance.prevent_used_policy_mutation();

create trigger underwriting_policy_values_immutable_when_used
before update or delete on project_finance.underwriting_policy_values
for each row execute function project_finance.prevent_used_policy_mutation();

-- RLS for calculation outputs. Authenticated clients receive read-only tenant access;
-- trusted server/database roles perform transactional writes.
do $$
declare t text;
begin
  foreach t in array array[
    'annual_project_cashflows','annual_debt_schedules','financing_results','tax_credit_results',
    'capital_stack_results','return_results','downside_results','downside_cash_sweep_rows',
    'reconciliation_results','calculation_warnings','calculation_metric_traces'
  ] loop
    execute format('alter table project_finance.%I enable row level security', t);
    execute format(
      'create policy %I on project_finance.%I for select to authenticated using (organization_id = project_finance.current_organization_id())',
      t || '_same_org_select', t
    );
  end loop;
end $$;

alter table project_finance.sensitivity_runs enable row level security;
alter table project_finance.sensitivity_points enable row level security;
create policy sensitivity_runs_same_org_select on project_finance.sensitivity_runs
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy sensitivity_points_same_org_select on project_finance.sensitivity_points
for select to authenticated using (organization_id = project_finance.current_organization_id());

alter table project_finance.underwriting_runs enable row level security;
create policy underwriting_runs_same_org_select on project_finance.underwriting_runs
for select to authenticated using (organization_id = project_finance.current_organization_id());

do $$
declare t text;
begin
  foreach t in array array[
    'underwriting_rule_results','underwriting_risks','underwriting_conditions','underwriting_missing_information'
  ] loop
    execute format('alter table project_finance.%I enable row level security', t);
    execute format(
      'create policy %I on project_finance.%I for select to authenticated using (organization_id = project_finance.current_organization_id())',
      t || '_same_org_select', t
    );
  end loop;
end $$;

alter table project_finance.audit_events enable row level security;
create policy audit_events_same_org_select on project_finance.audit_events
for select to authenticated using (organization_id = project_finance.current_organization_id());

-- No authenticated INSERT/UPDATE/DELETE policies exist for finance results,
-- underwriting results, sensitivity results, or audit history.
