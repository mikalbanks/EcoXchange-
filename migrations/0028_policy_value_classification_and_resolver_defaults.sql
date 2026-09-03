-- TICKET 10: narrow corrective migration for deterministic policy-default resolution.
-- Adds classification so the resolver can distinguish calculation defaults from
-- underwriting thresholds/reference values. No finance formulas or credit rules live here.

alter table project_finance.underwriting_policy_values
  add column if not exists value_classification text not null default 'REFERENCE_ONLY'
  check (value_classification in ('CALCULATION_DEFAULT','UNDERWRITING_THRESHOLD','READINESS_THRESHOLD','REFERENCE_ONLY'));

update project_finance.underwriting_policy_values
set value_classification = case
  when field_key in (
    'target_p50_dscr','dsra_months','max_ltc','debt_interest_rate_default',
    'amortization_years_default','construction_contingency_pct'
  ) then 'CALCULATION_DEFAULT'
  when field_key in ('merchant_exposure_warning_pct','merchant_exposure_severe_pct') then 'UNDERWRITING_THRESHOLD'
  else value_classification
end
where policy_id in (
  select id from project_finance.underwriting_policies
  where policy_code='ECOXCHANGE_SOLAR_BASE' and policy_version='0.1.0'
);

with p as (
  select id from project_finance.underwriting_policies
  where policy_code='ECOXCHANGE_SOLAR_BASE' and policy_version='0.1.0'
  order by created_at asc limit 1
)
insert into project_finance.underwriting_policy_values
  (policy_id, field_key, value_json, unit, applicability_json, source_reference, value_classification)
select p.id, v.field_key, v.value_json, v.unit, v.applicability_json, 'SPEC 03 v0.1 / Ticket 10 resolver classification', 'CALCULATION_DEFAULT'
from p cross join (values
  ('lender_fee_rate','0.0125'::jsonb,'decimal',null::jsonb),
  ('itc_rate','0.30'::jsonb,'decimal',null::jsonb),
  ('itc_transfer_price','0.92'::jsonb,'ratio',null::jsonb),
  ('dsra_reference_method','"YEAR_ONE"'::jsonb,null::text,null::jsonb),
  ('debt_maturity_years_default','15'::jsonb,'years','{"capacity_mw_ac":{"gte":1,"lt":3}}'::jsonb),
  ('debt_maturity_years_default','18'::jsonb,'years','{"capacity_mw_ac":{"gte":3,"lt":10}}'::jsonb),
  ('debt_maturity_years_default','20'::jsonb,'years','{"capacity_mw_ac":{"gte":10,"lte":20}}'::jsonb)
) as v(field_key,value_json,unit,applicability_json)
on conflict do nothing;

comment on column project_finance.underwriting_policy_values.value_classification is
  'Controls whether ScenarioResolver may automatically use a policy value as a calculation default.';
