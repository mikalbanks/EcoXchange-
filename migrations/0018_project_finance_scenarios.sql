-- TICKET 08 / SPEC 04: scenarios, provenance-rich assumptions, overrides, and staleness.

create table if not exists project_finance.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  name text not null,
  description text,
  scenario_type text not null default 'CUSTOM' check (scenario_type in ('BASE','CUSTOM','SENSITIVITY_BASE','LENDER_CASE','DOWNSIDE')),
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','CALCULATED','STALE','ARCHIVED')),
  parent_scenario_id uuid,
  latest_calculation_run_id uuid,
  latest_underwriting_run_id uuid,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint scenarios_project_org_fk foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint scenarios_parent_org_fk foreign key (parent_scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create table if not exists project_finance.scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  scenario_id uuid not null,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  source_type text not null check (source_type in ('USER_ASSERTION','PROJECT_FACT','LENDER_QUOTE','ECOXCHANGE_POLICY','USER_ASSUMPTION','SYSTEM_DERIVED')),
  provenance_type text,
  source_fact_id uuid,
  source_document_id uuid,
  policy_id uuid,
  policy_version text,
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenario_assumptions_scenario_org_fk foreign key (scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict,
  constraint scenario_assumptions_source_fact_fk foreign key (source_fact_id)
    references project_finance.project_facts(id) on delete restrict,
  constraint scenario_assumptions_source_document_fk foreign key (source_document_id)
    references project_finance.project_documents(id) on delete restrict,
  unique (scenario_id, field_key)
);

create table if not exists project_finance.policy_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  scenario_id uuid not null,
  field_key text not null,
  policy_id uuid,
  policy_value_json jsonb not null,
  override_value_json jsonb not null,
  reason text not null,
  source_type text not null check (source_type in ('USER_ASSUMPTION','LENDER_QUOTE','EXECUTED_TERM_SHEET','OTHER')),
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint policy_overrides_scenario_org_fk foreign key (scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict
);

create index if not exists pf_scenarios_project_idx on project_finance.scenarios(organization_id, project_id, updated_at desc);
create index if not exists pf_scenarios_active_idx on project_finance.scenarios(organization_id, project_id, updated_at desc) where archived_at is null;
create index if not exists pf_scenario_assumptions_idx on project_finance.scenario_assumptions(organization_id, scenario_id, field_key);

create trigger scenarios_touch_updated_at before update on project_finance.scenarios
for each row execute function project_finance.touch_updated_at();
create trigger scenario_assumptions_touch_updated_at before update on project_finance.scenario_assumptions
for each row execute function project_finance.touch_updated_at();

create or replace function project_finance.validate_scenario_assumption_sources()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  if new.source_fact_id is not null and not exists (
    select 1 from project_finance.project_facts f
    join project_finance.scenarios s on s.id = new.scenario_id
    where f.id = new.source_fact_id
      and f.organization_id = new.organization_id
      and f.project_id = s.project_id
  ) then
    raise exception 'source fact must belong to the same tenant and project as the scenario';
  end if;

  if new.source_document_id is not null and not exists (
    select 1 from project_finance.project_documents d
    join project_finance.scenarios s on s.id = new.scenario_id
    where d.id = new.source_document_id
      and d.organization_id = new.organization_id
      and d.project_id = s.project_id
  ) then
    raise exception 'source document must belong to the same tenant and project as the scenario';
  end if;

  return new;
end $$;

create trigger scenario_assumption_source_guard
before insert or update on project_finance.scenario_assumptions
for each row execute function project_finance.validate_scenario_assumption_sources();

create or replace function project_finance.mark_scenario_stale()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
declare
  target_scenario_id uuid;
begin
  target_scenario_id := case when tg_op = 'DELETE' then old.scenario_id else new.scenario_id end;
  update project_finance.scenarios
  set status = case when status = 'ARCHIVED' then status else 'STALE' end,
      updated_at = now()
  where id = target_scenario_id;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger assumption_marks_scenario_stale
after insert or update or delete on project_finance.scenario_assumptions
for each row execute function project_finance.mark_scenario_stale();

create or replace function project_finance.mark_fact_linked_scenarios_stale()
returns trigger
language plpgsql
set search_path = project_finance, public
as $$
begin
  if old.is_current and not new.is_current then
    update project_finance.scenarios s
    set status = case when s.status = 'ARCHIVED' then s.status else 'STALE' end,
        updated_at = now()
    where exists (
      select 1 from project_finance.scenario_assumptions a
      where a.scenario_id = s.id and a.source_fact_id = new.id
    );
  end if;
  return new;
end $$;

create trigger superseded_fact_marks_scenario_stale
after update of is_current on project_finance.project_facts
for each row execute function project_finance.mark_fact_linked_scenarios_stale();

alter table project_finance.scenarios enable row level security;
alter table project_finance.scenario_assumptions enable row level security;
alter table project_finance.policy_overrides enable row level security;

create policy scenarios_same_org_select on project_finance.scenarios
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy scenarios_same_org_insert on project_finance.scenarios
for insert to authenticated with check (
  organization_id = project_finance.current_organization_id()
  and project_finance.can_access_project(project_id)
  and (created_by is null or created_by = project_finance.current_actor_user_id())
);
create policy scenarios_same_org_update on project_finance.scenarios
for update to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy assumptions_same_org_select on project_finance.scenario_assumptions
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy assumptions_same_org_insert on project_finance.scenario_assumptions
for insert to authenticated with check (organization_id = project_finance.current_organization_id());
create policy assumptions_same_org_update on project_finance.scenario_assumptions
for update to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy overrides_same_org_select on project_finance.policy_overrides
for select to authenticated using (organization_id = project_finance.current_organization_id());
create policy overrides_same_org_insert on project_finance.policy_overrides
for insert to authenticated with check (organization_id = project_finance.current_organization_id());

-- No authenticated DELETE policies for scenarios/assumptions/overrides. Archive or supersede instead.
