-- SPEC 04 / 0022: underwriting snapshots, rule results, risks, conditions, missing info.

create table if not exists project_finance.underwriting_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references project_finance.projects(id) on delete restrict,
  scenario_id uuid not null references project_finance.scenarios(id) on delete restrict,
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  policy_id uuid not null references project_finance.underwriting_policies(id) on delete restrict,
  policy_version text not null,
  input_snapshot_json jsonb not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED')),
  overall_credit_status text check (overall_credit_status is null or overall_credit_status in ('PASS','PASS_WITH_CONDITIONS','REVIEW_REQUIRED','FAIL','INSUFFICIENT_INFORMATION','OUT_OF_SCOPE')),
  financial_bankability text check (financial_bankability is null or financial_bankability in ('STRONG','ACCEPTABLE','THIN','WEAK','UNFINANCEABLE_UNDER_POLICY','UNKNOWN')),
  financing_readiness text check (financing_readiness is null or financing_readiness in ('EARLY','DEVELOPING','FINANCING_READY','CLOSING_READY','OPERATING','UNKNOWN')),
  created_by uuid references project_finance.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table project_finance.scenarios
  add constraint scenarios_latest_underwriting_fk
  foreign key (latest_underwriting_run_id) references project_finance.underwriting_runs(id) on delete restrict;

create table if not exists project_finance.underwriting_rule_results (
  id uuid primary key default gen_random_uuid(),
  underwriting_run_id uuid not null references project_finance.underwriting_runs(id) on delete restrict,
  rule_id text not null,
  rule_version text not null,
  category text not null,
  status text not null check (status in ('PASS','FAIL','CONDITION','REVIEW','NOT_APPLICABLE','INSUFFICIENT_INFORMATION','INDICATIVE_PASS')),
  severity text not null check (severity in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  actual_value_json jsonb,
  required_value_json jsonb,
  message text not null,
  condition_to_clear text,
  source_reference text,
  created_at timestamptz not null default now(),
  unique (underwriting_run_id, rule_id, rule_version)
);

create table if not exists project_finance.risks (
  id uuid primary key default gen_random_uuid(),
  underwriting_run_id uuid not null references project_finance.underwriting_runs(id) on delete restrict,
  risk_id text not null,
  category text not null check (category in ('REVENUE','PRODUCTION','CONSTRUCTION','INTERCONNECTION','PERMITTING','COUNTERPARTY','SPONSOR','TAX_CREDIT','FINANCIAL','REFINANCING','DOCUMENTATION')),
  severity text not null check (severity in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  description text not null,
  evidence_json jsonb,
  mitigation text,
  status text not null default 'OPEN' check (status in ('OPEN','MITIGATED','ACCEPTED','RESOLVED')),
  created_at timestamptz not null default now(),
  unique (underwriting_run_id, risk_id)
);

create table if not exists project_finance.conditions_precedent (
  id uuid primary key default gen_random_uuid(),
  underwriting_run_id uuid not null references project_finance.underwriting_runs(id) on delete restrict,
  condition_code text not null,
  category text not null,
  description text not null,
  severity text not null check (severity in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  source_rule_id text,
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','SATISFIED','WAIVED')),
  target_resolution_date date,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  unique (underwriting_run_id, condition_code)
);

create table if not exists project_finance.missing_information (
  id uuid primary key default gen_random_uuid(),
  underwriting_run_id uuid not null references project_finance.underwriting_runs(id) on delete restrict,
  field_key text not null,
  importance text not null check (importance in ('LOW','MEDIUM','HIGH','CRITICAL')),
  reason text not null,
  blocks_calculation boolean not null default false,
  blocks_credit_assessment boolean not null default true,
  recommended_source_type text,
  status text not null default 'OPEN' check (status in ('OPEN','PROVIDED','WAIVED')),
  created_at timestamptz not null default now(),
  unique (underwriting_run_id, field_key)
);

create index if not exists pf_underwriting_scenario_idx on project_finance.underwriting_runs(scenario_id,created_at desc);
create index if not exists pf_underwriting_calc_idx on project_finance.underwriting_runs(calculation_run_id);
create index if not exists pf_rule_results_run_idx on project_finance.underwriting_rule_results(underwriting_run_id);
create index if not exists pf_risks_run_idx on project_finance.risks(underwriting_run_id);
create index if not exists pf_conditions_run_idx on project_finance.conditions_precedent(underwriting_run_id);

create or replace function project_finance.can_access_underwriting(p_run_id uuid)
returns boolean language sql stable security definer set search_path=project_finance,public as $$
  select exists (
    select 1 from project_finance.underwriting_runs r
    where r.id=p_run_id and r.organization_id=project_finance.current_organization_id()
  )
$$;

create or replace function project_finance.prevent_completed_underwriting_mutation()
returns trigger language plpgsql as $$
begin
  if old.status='SUCCESS' and (
    new.input_snapshot_json is distinct from old.input_snapshot_json or
    new.calculation_run_id is distinct from old.calculation_run_id or
    new.policy_id is distinct from old.policy_id or
    new.policy_version is distinct from old.policy_version
  ) then
    raise exception 'completed underwriting runs are immutable';
  end if;
  return new;
end $$;

create trigger underwriting_run_lock before update on project_finance.underwriting_runs
for each row execute function project_finance.prevent_completed_underwriting_mutation();
