-- SPEC 04 / 0019: immutable/versioned policy storage and base-policy seed.

create table if not exists project_finance.underwriting_policies (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null,
  version text not null,
  name text not null,
  description text,
  asset_type text not null,
  jurisdiction text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','RETIRED')),
  effective_from timestamptz,
  effective_to timestamptz,
  policy_hash text not null,
  created_by uuid references project_finance.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (policy_code, version),
  unique (policy_hash)
);

create table if not exists project_finance.underwriting_policy_values (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references project_finance.underwriting_policies(id) on delete restrict,
  field_key text not null,
  value_json jsonb not null,
  unit text,
  applicability_json jsonb,
  source_reference text,
  source_url text,
  source_document_id uuid references project_finance.project_documents(id) on delete restrict,
  source_notes text,
  created_at timestamptz not null default now(),
  unique (policy_id, field_key, applicability_json)
);

alter table project_finance.scenario_assumptions
  add constraint scenario_assumptions_policy_fk
  foreign key (policy_id) references project_finance.underwriting_policies(id) on delete restrict;

alter table project_finance.policy_overrides
  add constraint policy_overrides_policy_fk
  foreign key (policy_id) references project_finance.underwriting_policies(id) on delete restrict;

create index if not exists pf_policy_code_version_idx on project_finance.underwriting_policies(policy_code, version);
create index if not exists pf_policy_values_idx on project_finance.underwriting_policy_values(policy_id, field_key);

alter table project_finance.underwriting_policies enable row level security;
alter table project_finance.underwriting_policy_values enable row level security;

create policy policies_read on project_finance.underwriting_policies for select to authenticated using (true);
create policy policy_values_read on project_finance.underwriting_policy_values for select to authenticated using (true);

-- Seed is environment-neutral policy metadata, not customer data.
with p as (
  insert into project_finance.underwriting_policies
    (policy_code,version,name,description,asset_type,jurisdiction,status,policy_hash)
  values
    ('ECOXCHANGE_SOLAR_BASE','0.1.0','EcoXchange Solar Base','Preliminary conservative bank-style policy for fully contracted U.S. solar PV, 1-20 MW.','SOLAR_PV','US','ACTIVE',encode(digest('ECOXCHANGE_SOLAR_BASE|0.1.0|2026-09-02','sha256'),'hex'))
  on conflict (policy_code,version) do update set name=excluded.name
  returning id
), policy as (
  select id from p
  union all
  select id from project_finance.underwriting_policies where policy_code='ECOXCHANGE_SOLAR_BASE' and version='0.1.0' limit 1
)
insert into project_finance.underwriting_policy_values(policy_id,field_key,value_json,unit,applicability_json,source_reference)
select id, v.field_key, v.value_json, v.unit, v.applicability_json, 'EcoXchange project finance reference report, September 2026 / SPEC 03'
from policy cross join (values
 ('target_p50_dscr','1.30'::jsonb,'x',null::jsonb),
 ('dsra_months','6'::jsonb,'months',null::jsonb),
 ('lender_fee_rate','0.0125'::jsonb,'decimal',null::jsonb),
 ('itc_rate','0.30'::jsonb,'decimal',null::jsonb),
 ('itc_transfer_price','0.92'::jsonb,'decimal',null::jsonb),
 ('construction_contingency_rate','0.075'::jsonb,'decimal',null::jsonb),
 ('committed_itc_bridge_advance','0.98'::jsonb,'decimal',null::jsonb),
 ('uncommitted_itc_bridge_advance','0.725'::jsonb,'decimal',null::jsonb),
 ('max_ltc','0.65'::jsonb,'decimal','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
 ('max_ltc','0.70'::jsonb,'decimal','{"capacity_mw_ac":{"gte":3,"lte":20}}'::jsonb),
 ('debt_interest_rate','0.0725'::jsonb,'decimal','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
 ('debt_interest_rate','0.065'::jsonb,'decimal','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
 ('debt_interest_rate','0.058'::jsonb,'decimal','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb),
 ('amortization_years','15'::jsonb,'years','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
 ('amortization_years','18'::jsonb,'years','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
 ('amortization_years','20'::jsonb,'years','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb),
 ('closing_costs_usd','200000'::jsonb,'USD','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
 ('closing_costs_usd','400000'::jsonb,'USD','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
 ('closing_costs_usd','750000'::jsonb,'USD','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb)
) as v(field_key,value_json,unit,applicability_json)
on conflict do nothing;
