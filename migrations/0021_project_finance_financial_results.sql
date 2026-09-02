-- SPEC 04 / 0021: normalized financial outputs from SPEC 02.

create table if not exists project_finance.annual_project_cashflows (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  year_number smallint not null check (year_number >= 1),
  generation_mwh numeric(24,6) not null check (generation_mwh >= 0),
  ppa_price_per_mwh numeric(24,6) not null,
  revenue numeric(24,6) not null,
  opex numeric(24,6) not null,
  cfads numeric(24,6) not null,
  depreciation numeric(24,6),
  tax_shield numeric(24,6),
  created_at timestamptz not null default now(),
  unique (calculation_run_id, year_number)
);

create table if not exists project_finance.annual_debt_schedules (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  year_number smallint not null check (year_number >= 1),
  opening_balance numeric(24,6) not null,
  interest numeric(24,6) not null,
  principal numeric(24,6) not null check (principal >= 0),
  debt_service numeric(24,6) not null,
  ending_balance numeric(24,6) not null check (ending_balance >= -1),
  dscr numeric(18,10),
  downside_cfads numeric(24,6),
  downside_dscr numeric(18,10),
  created_at timestamptz not null default now(),
  unique (calculation_run_id, year_number)
);

create table if not exists project_finance.financing_results (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null unique references project_finance.calculation_runs(id) on delete restrict,
  dscr_sized_debt numeric(24,6) not null,
  ltc_debt_limit numeric(24,6) not null,
  permanent_debt numeric(24,6) not null,
  binding_constraint text not null,
  debt_to_capex numeric(18,10) not null,
  min_dscr numeric(18,10),
  min_dscr_year smallint,
  balloon_balance numeric(24,6) not null default 0,
  lender_fee numeric(24,6) not null default 0,
  dsra numeric(24,6) not null default 0,
  sources_uses_difference numeric(24,6) not null default 0,
  debt_reconciliation_difference numeric(24,6) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.tax_credit_results (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null unique references project_finance.calculation_runs(id) on delete restrict,
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
  created_at timestamptz not null default now()
);

create table if not exists project_finance.capital_stack_results (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null unique references project_finance.calculation_runs(id) on delete restrict,
  total_closing_uses numeric(24,6) not null,
  permanent_debt numeric(24,6) not null,
  itc_proceeds numeric(24,6) not null,
  sponsor_equity numeric(24,6) not null,
  other_sources numeric(24,6) not null default 0,
  permanent_debt_pct_uses numeric(18,10) not null,
  itc_pct_uses numeric(18,10) not null,
  sponsor_equity_pct_uses numeric(18,10) not null,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.return_results (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null unique references project_finance.calculation_runs(id) on delete restrict,
  sponsor_cash_irr numeric(18,10),
  simplified_after_tax_irr numeric(18,10),
  project_unlevered_cash_irr numeric(18,10),
  sponsor_npv numeric(24,6),
  project_npv numeric(24,6),
  irr_status text not null,
  irr_warning text,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.downside_results (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null unique references project_finance.calculation_runs(id) on delete restrict,
  downside_type text not null,
  generation_source_type text not null,
  generation_multiplier numeric(18,10),
  minimum_downside_dscr numeric(18,10),
  full_repayment boolean,
  repayment_year smallint,
  unrepaid_balance numeric(24,6),
  interest_shortfall boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.calculation_warnings (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  warning_code text not null,
  severity text not null default 'MEDIUM',
  message text not null,
  metric_key text,
  year_number smallint,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists project_finance.sensitivity_runs (
  id uuid primary key default gen_random_uuid(),
  base_calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  scenario_id uuid not null references project_finance.scenarios(id) on delete restrict,
  sensitivity_type text not null,
  variable_key text not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCESS','FAILED','CANCELLED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists project_finance.sensitivity_points (
  id uuid primary key default gen_random_uuid(),
  sensitivity_run_id uuid not null references project_finance.sensitivity_runs(id) on delete restrict,
  point_index integer not null,
  input_value_json jsonb not null,
  permanent_debt numeric(24,6) not null,
  debt_to_capex numeric(18,10) not null,
  sponsor_equity numeric(24,6) not null,
  minimum_dscr numeric(18,10),
  sponsor_cash_irr numeric(18,10),
  binding_constraint text not null,
  calculation_run_id uuid references project_finance.calculation_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (sensitivity_run_id, point_index)
);

create table if not exists project_finance.formula_registry (
  id uuid primary key default gen_random_uuid(),
  formula_code text not null,
  version text not null,
  name text not null,
  description text,
  formula_expression_text text,
  implementation_reference text,
  created_at timestamptz not null default now(),
  unique (formula_code, version)
);

create table if not exists project_finance.calculation_metric_traces (
  id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references project_finance.calculation_runs(id) on delete restrict,
  metric_key text not null,
  metric_value_json jsonb not null,
  formula_code text not null,
  formula_version text not null,
  dependency_values_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (calculation_run_id, metric_key, formula_code, formula_version)
);

create index if not exists pf_cashflows_run_idx on project_finance.annual_project_cashflows(calculation_run_id,year_number);
create index if not exists pf_debt_schedule_run_idx on project_finance.annual_debt_schedules(calculation_run_id,year_number);
create index if not exists pf_warnings_run_idx on project_finance.calculation_warnings(calculation_run_id);
