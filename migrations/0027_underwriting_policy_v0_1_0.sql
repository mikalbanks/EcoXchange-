-- TICKET 09 / SPEC 03: explicit versioned policy data only.
-- This does not execute underwriting logic and is not a named-lender policy.

with inserted_policy as (
  insert into project_finance.underwriting_policies (
    organization_id, policy_code, policy_version, status, effective_date,
    description, source_reference, policy_hash
  ) values (
    null,
    'ECOXCHANGE_SOLAR_BASE',
    '0.1.0',
    'ACTIVE',
    date '2026-09-03',
    'EcoXchange preliminary lender-style policy for fully contracted U.S. solar PV projects from 1 to 20 MW AC.',
    'SPEC 03 — Underwriting Policy & Credit Rules',
    encode(digest('ECOXCHANGE_SOLAR_BASE|0.1.0|SPEC03|2026-09-03','sha256'),'hex')
  )
  on conflict do nothing
  returning id
), policy as (
  select id from inserted_policy
  union all
  select id from project_finance.underwriting_policies
   where organization_id is null
     and policy_code='ECOXCHANGE_SOLAR_BASE'
     and policy_version='0.1.0'
  limit 1
)
insert into project_finance.underwriting_policy_values(policy_id,field_key,value_json,unit,applicability_json,source_reference)
select policy.id, v.field_key, v.value_json, v.unit, v.applicability_json, 'SPEC 03 v0.1'
from policy cross join (values
  ('target_p50_dscr','1.30'::jsonb,'x',null::jsonb),
  ('merchant_exposure_warning_pct','0.25'::jsonb,'decimal',null::jsonb),
  ('merchant_exposure_severe_pct','0.30'::jsonb,'decimal',null::jsonb),
  ('dsra_months','6'::jsonb,'months',null::jsonb),
  ('construction_contingency_pct','0.075'::jsonb,'decimal',null::jsonb),
  ('committed_itc_bridge_advance','0.98'::jsonb,'decimal',null::jsonb),
  ('uncommitted_itc_bridge_advance','0.725'::jsonb,'decimal',null::jsonb),
  ('max_ltc','0.65'::jsonb,'decimal','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
  ('max_ltc','0.70'::jsonb,'decimal','{"capacity_mw_ac":{"gte":3,"lte":20}}'::jsonb),
  ('debt_interest_rate_default','0.0725'::jsonb,'decimal','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
  ('debt_interest_rate_default','0.065'::jsonb,'decimal','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
  ('debt_interest_rate_default','0.058'::jsonb,'decimal','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb),
  ('amortization_years_default','15'::jsonb,'years','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
  ('amortization_years_default','18'::jsonb,'years','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
  ('amortization_years_default','20'::jsonb,'years','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb),
  ('closing_cost_range','{"min":125000,"max":300000}'::jsonb,'USD','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
  ('closing_cost_range','{"min":250000,"max":600000}'::jsonb,'USD','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
  ('closing_cost_range','{"min":500000,"max":1000000}'::jsonb,'USD','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb)
) as v(field_key,value_json,unit,applicability_json)
on conflict do nothing;
