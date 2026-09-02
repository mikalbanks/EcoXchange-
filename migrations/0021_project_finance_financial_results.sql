-- TICKET 08 / SPEC 04: normalized deterministic finance outputs.
-- NUMERIC is used for persisted financial values/rates; application code remains authoritative for formulas.

create table if not exists project_finance.annual_project_cashflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null,
  year smallint not null check (year >= 1),
  generation_mwh numeric(24,8) not null,
  ppa_price_per_mwh numeric(24,6) not null,
  revenue numeric(24,6) not null,
  opex numeric(24,6) not null,
  cfads numeric(24,6) not null,
  sponsor_operating_cash_flow numeric(24,6),
  depreciation numeric(24,6),
  tax_shield numeric(24,6),
  created_at timestamptz not null default now(),
  constraint annual_project_cashflows_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (calculation_run_id, year)
);

create table if not exists project_finance.annual_debt_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null,
  year smallint not null check (year >= 1),
  opening_balance numeric(24,6) not null,
  interest numeric(24,6) not null,
  principal numeric(24,6) not null check (principal >= 0),
  debt_service numeric(24,6) not null,
  ending_balance numeric(24,6) not null,
  dscr numeric(18,10),
  created_at timestamptz not null default now(),
  constraint annual_debt_schedules_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (calculation_run_id, year)
);

create table if not exists project_finance.financing_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  dscr_sized_debt numeric(24,6) not null,
  ltc_debt_limit numeric(24,6) not null,
  permanent_debt numeric(24,6) not null,
  binding_constraint text not null check (binding_constraint in ('DSCR','LTC','ZERO_CFADS','NEGATIVE_AMORTIZATION','AMORTIZATION_TERM','OTHER')),
  debt_to_capex numeric(18,10) not null,
  minimum_dscr numeric(18,10),
  minimum_dscr_year smallint,
  balloon_balance numeric(24,6) not null default 0,
  lender_fee numeric(24,6) not null default 0,
  dsra numeric(24,6) not null default 0,
  created_at timestamptz not null default now(),
  constraint financing_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.tax_credit_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  eligible_basis numeric(24,6) not null,
  itc_rate numeric(18,10) not null,
  itc_face_value numeric(24,6) not null,
  transfer_price numeric(18,10) not null,
  gross_transfer_proceeds numeric(24,6) not null,
  transaction_costs numeric(24,6) not null default 0,
  net_transfer_proceeds numeric(24,6) not null,
  depreciable_basis numeric(24,6),
  bonus_depreciation numeric(24,6),
  immediate_tax_shield numeric(24,6),
  created_at timestamptz not null default now(),
  constraint tax_credit_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.capital_stack_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  project_capex numeric(24,6) not null,
  closing_costs numeric(24,6) not null,
  lender_fee numeric(24,6) not null,
  dsra numeric(24,6) not null,
  other_financing_uses numeric(24,6) not null default 0,
  total_closing_uses numeric(24,6) not null,
  permanent_debt numeric(24,6) not null,
  net_itc_proceeds numeric(24,6) not null,
  other_permanent_sources numeric(24,6) not null default 0,
  sponsor_equity numeric(24,6) not null,
  debt_pct_total_uses numeric(18,10) not null,
  itc_pct_total_uses numeric(18,10) not null,
  sponsor_equity_pct_total_uses numeric(18,10) not null,
  other_sources_pct_total_uses numeric(18,10) not null default 0,
  created_at timestamptz not null default now(),
  constraint capital_stack_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.return_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  levered_sponsor_cash_irr numeric(18,10),
  levered_sponsor_cash_irr_status text not null,
  project_unlevered_cash_irr_before_tax_attributes numeric(18,10),
  unlevered_irr_status text,
  sponsor_npv numeric(24,6),
  project_npv numeric(24,6),
  simplified_sponsor_after_tax_irr numeric(18,10),
  tax_module_enabled boolean not null default false,
  irr_warning_code text,
  created_at timestamptz not null default now(),
  constraint return_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.downside_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  downside_type text not null,
  generation_source_type text not null,
  generation_multiplier numeric(18,10),
  minimum_downside_dscr numeric(18,10),
  minimum_downside_dscr_year smallint,
  full_repayment boolean,
  repayment_year smallint,
  unrepaid_balance numeric(24,6),
  interest_shortfall boolean not null default false,
  is_lender_grade_p90 boolean not null default false,
  created_at timestamptz not null default now(),
  constraint downside_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.downside_cash_sweep_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null,
  year smallint not null check (year >= 1),
  opening_balance numeric(24,6) not null,
  downside_cfads numeric(24,6) not null,
  interest_due numeric(24,6) not null,
  cash_available numeric(24,6) not null,
  principal_paid numeric(24,6) not null check (principal_paid >= 0),
  ending_balance numeric(24,6) not null,
  interest_shortfall boolean not null default false,
  created_at timestamptz not null default now(),
  constraint downside_cash_sweep_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (calculation_run_id, year)
);

create table if not exists project_finance.reconciliation_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null unique,
  debt_reconciliation_difference numeric(24,6) not null,
  debt_reconciled boolean not null,
  sources_uses_difference numeric(24,6) not null,
  sources_uses_reconciled boolean not null,
  created_at timestamptz not null default now(),
  constraint reconciliation_results_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.calculation_warnings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null,
  code text not null,
  severity text not null,
  message text not null,
  metric_key text,
  year smallint,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint calculation_warnings_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict
);

create table if not exists project_finance.formula_registry (
  formula_id text primary key,
  formula_name text not null,
  formula_version integer not null check (formula_version >= 1),
  description text,
  effective_from_engine_version text,
  retired_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.calculation_metric_traces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  calculation_run_id uuid not null,
  metric_key text not null,
  formula_id text not null references project_finance.formula_registry(formula_id) on delete restrict,
  value_json jsonb not null,
  dependencies_json jsonb not null,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  constraint calculation_metric_traces_run_org_fk foreign key (calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (calculation_run_id, metric_key, formula_id)
);

create table if not exists project_finance.sensitivity_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  project_id uuid not null,
  scenario_id uuid not null,
  base_calculation_run_id uuid not null,
  variable text not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED')),
  created_by varchar references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint sensitivity_runs_project_org_fk foreign key (project_id, organization_id)
    references project_finance.projects(id, organization_id) on delete restrict,
  constraint sensitivity_runs_scenario_org_fk foreign key (scenario_id, organization_id)
    references project_finance.scenarios(id, organization_id) on delete restrict,
  constraint sensitivity_runs_base_run_org_fk foreign key (base_calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (id, organization_id)
);

create table if not exists project_finance.sensitivity_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references project_finance.organizations(id) on delete restrict,
  sensitivity_run_id uuid not null,
  sequence integer not null check (sequence >= 0),
  input_value_json jsonb not null,
  child_calculation_run_id uuid,
  summary_json jsonb,
  created_at timestamptz not null default now(),
  constraint sensitivity_points_run_org_fk foreign key (sensitivity_run_id, organization_id)
    references project_finance.sensitivity_runs(id, organization_id) on delete restrict,
  constraint sensitivity_points_child_calc_org_fk foreign key (child_calculation_run_id, organization_id)
    references project_finance.calculation_runs(id, organization_id) on delete restrict,
  unique (sensitivity_run_id, sequence)
);

create index if not exists pf_cashflows_run_idx on project_finance.annual_project_cashflows(organization_id, calculation_run_id, year);
create index if not exists pf_debt_schedule_run_idx on project_finance.annual_debt_schedules(organization_id, calculation_run_id, year);
create index if not exists pf_sweep_run_idx on project_finance.downside_cash_sweep_rows(organization_id, calculation_run_id, year);
create index if not exists pf_warnings_run_idx on project_finance.calculation_warnings(organization_id, calculation_run_id);
create index if not exists pf_traces_run_idx on project_finance.calculation_metric_traces(organization_id, calculation_run_id, metric_key);
create index if not exists pf_sensitivity_project_idx on project_finance.sensitivity_runs(organization_id, project_id, created_at desc);
