-- TICKET 11: narrow corrective metadata required by calculation orchestration.
-- No financial formulas, underwriting rules, or destructive changes.

alter table project_finance.calculation_runs
  add column if not exists resolver_version text;

update project_finance.calculation_runs
set resolver_version = coalesce(resolver_version, input_snapshot_json #>> '{resolution,resolver_version}', '0.1.0')
where resolver_version is null;

alter table project_finance.calculation_runs
  alter column resolver_version set not null;

alter table project_finance.policy_overrides
  add column if not exists policy_version text;

update project_finance.policy_overrides o
set policy_version = p.policy_version
from project_finance.underwriting_policies p
where o.policy_id = p.id and o.policy_version is null;

create index if not exists pf_calc_input_engine_success_idx
  on project_finance.calculation_runs(input_hash, calculation_engine_version, created_at desc)
  where status = 'SUCCESS';

comment on column project_finance.calculation_runs.resolver_version is
  'ScenarioResolver behavior version used to assemble the immutable calculation input snapshot.';
comment on column project_finance.policy_overrides.policy_version is
  'Policy version explicitly bound to this override. Resolver rejects stale or missing bindings.';
