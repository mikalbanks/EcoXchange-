-- SPEC 04 / 0018: scenarios, provenance-rich assumptions, overrides, staleness.

create table if not exists project_finance.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  name text not null,
  description text,
  scenario_type text not null default 'CUSTOM' check (scenario_type in ('BASE','CUSTOM','SENSITIVITY_BASE','LENDER_CASE','DOWNSIDE')),
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','CALCULATED','STALE','ARCHIVED')),
  parent_scenario_id uuid references project_finance.scenarios(id) on delete restrict,
  latest_calculation_run_id uuid,
  latest_underwriting_run_id uuid,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists project_finance.scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references project_finance.scenarios(id) on delete restrict,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  source_classification text not null check (source_classification in ('USER_FACT','DOCUMENT_FACT','LENDER_QUOTE','ECOXCHANGE_POLICY','USER_ASSUMPTION','SYSTEM_DERIVED')),
  source_fact_id uuid references project_finance.project_facts(id) on delete restrict,
  source_document_id uuid references project_finance.project_documents(id) on delete restrict,
  policy_id uuid,
  policy_version text,
  overridden_from_value_json jsonb,
  override_reason text,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, field_key)
);

create table if not exists project_finance.policy_overrides (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references project_finance.scenarios(id) on delete restrict,
  policy_id uuid,
  policy_field_key text not null,
  original_value_json jsonb not null,
  override_value_json jsonb not null,
  reason text not null,
  source_type text not null check (source_type in ('USER_ASSUMPTION','LENDER_QUOTE','EXECUTED_TERM_SHEET','OTHER')),
  source_document_id uuid references project_finance.project_documents(id) on delete restrict,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists pf_scenarios_project_idx on project_finance.scenarios(project_id, updated_at desc);
create index if not exists pf_scenarios_org_idx on project_finance.scenarios(organization_id);
create index if not exists pf_scenario_assumptions_idx on project_finance.scenario_assumptions(scenario_id, field_key);

create trigger scenarios_touch_updated_at before update on project_finance.scenarios
for each row execute function project_finance.touch_updated_at();
create trigger scenario_assumptions_touch_updated_at before update on project_finance.scenario_assumptions
for each row execute function project_finance.touch_updated_at();

create or replace function project_finance.mark_scenario_stale()
returns trigger language plpgsql as $$
begin
  update project_finance.scenarios
  set status = case when status = 'ARCHIVED' then status else 'STALE' end,
      updated_at = now()
  where id = coalesce(new.scenario_id, old.scenario_id);
  return coalesce(new, old);
end $$;

create trigger assumption_marks_scenario_stale
after insert or update or delete on project_finance.scenario_assumptions
for each row execute function project_finance.mark_scenario_stale();

create or replace function project_finance.mark_fact_linked_scenarios_stale()
returns trigger language plpgsql as $$
begin
  if new.superseded_at is distinct from old.superseded_at and new.superseded_at is not null then
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
after update of superseded_at on project_finance.project_facts
for each row execute function project_finance.mark_fact_linked_scenarios_stale();

alter table project_finance.scenarios enable row level security;
alter table project_finance.scenario_assumptions enable row level security;
alter table project_finance.policy_overrides enable row level security;

create policy scenarios_same_org on project_finance.scenarios
for all to authenticated using (organization_id = project_finance.current_organization_id())
with check (organization_id = project_finance.current_organization_id());

create policy assumptions_same_org on project_finance.scenario_assumptions
for all to authenticated using (exists (select 1 from project_finance.scenarios s where s.id=scenario_id and s.organization_id=project_finance.current_organization_id()))
with check (exists (select 1 from project_finance.scenarios s where s.id=scenario_id and s.organization_id=project_finance.current_organization_id()));

create policy overrides_same_org on project_finance.policy_overrides
for all to authenticated using (exists (select 1 from project_finance.scenarios s where s.id=scenario_id and s.organization_id=project_finance.current_organization_id()))
with check (exists (select 1 from project_finance.scenarios s where s.id=scenario_id and s.organization_id=project_finance.current_organization_id()));
