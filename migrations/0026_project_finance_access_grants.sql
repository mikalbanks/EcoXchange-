-- TICKET 08: least-privilege grants for the custom project_finance schema.
-- RLS remains authoritative. Trusted backend/service-role paths perform immutable result writes.

grant select on project_finance.organizations to authenticated;
grant select, insert, update on project_finance.projects to authenticated;
grant select, insert, update on project_finance.project_documents to authenticated;
grant select, insert, update on project_finance.project_document_fields to authenticated;
grant select, insert, update on project_finance.project_facts to authenticated;
grant select, insert, update on project_finance.scenarios to authenticated;
grant select, insert, update on project_finance.scenario_assumptions to authenticated;
grant select, insert on project_finance.policy_overrides to authenticated;
grant select on project_finance.underwriting_policies to authenticated;
grant select on project_finance.underwriting_policy_values to authenticated;

grant select on project_finance.calculation_runs to authenticated;
grant select on project_finance.annual_project_cashflows to authenticated;
grant select on project_finance.annual_debt_schedules to authenticated;
grant select on project_finance.financing_results to authenticated;
grant select on project_finance.tax_credit_results to authenticated;
grant select on project_finance.capital_stack_results to authenticated;
grant select on project_finance.return_results to authenticated;
grant select on project_finance.downside_results to authenticated;
grant select on project_finance.downside_cash_sweep_rows to authenticated;
grant select on project_finance.reconciliation_results to authenticated;
grant select on project_finance.calculation_warnings to authenticated;
grant select on project_finance.calculation_metric_traces to authenticated;
grant select on project_finance.formula_registry to authenticated;
grant select on project_finance.sensitivity_runs to authenticated;
grant select on project_finance.sensitivity_points to authenticated;
grant select on project_finance.underwriting_runs to authenticated;
grant select on project_finance.underwriting_rule_results to authenticated;
grant select on project_finance.underwriting_risks to authenticated;
grant select on project_finance.underwriting_conditions to authenticated;
grant select on project_finance.underwriting_missing_information to authenticated;
grant select on project_finance.audit_events to authenticated;

grant select on project_finance.current_project_facts to authenticated;
grant select on project_finance.project_underwriting_summary to authenticated;
grant select on project_finance.scenario_comparison_summary to authenticated;

-- Service-role is intentionally allowed to execute persistence transactions. RLS bypass
-- behavior remains Supabase-managed; these grants do not expose service credentials to clients.
grant all privileges on all tables in schema project_finance to service_role;
grant execute on all functions in schema project_finance to service_role;

-- Ensure future tables/functions do not accidentally become client-writable by default.
alter default privileges in schema project_finance revoke all on tables from authenticated;
alter default privileges in schema project_finance revoke all on functions from authenticated;
