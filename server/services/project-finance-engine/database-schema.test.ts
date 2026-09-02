import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationNames = [
  "0015_project_finance_core_tenancy.sql",
  "0016_project_finance_projects.sql",
  "0017_project_finance_facts_documents.sql",
  "0018_project_finance_scenarios.sql",
  "0019_project_finance_policies.sql",
  "0020_project_finance_calculation_runs.sql",
  "0021_project_finance_financial_results.sql",
  "0022_project_finance_underwriting_results.sql",
  "0023_project_finance_audit_rls.sql",
  "0024_project_finance_views_indexes.sql",
  "0026_project_finance_access_grants.sql",
] as const;

function migration(name: (typeof migrationNames)[number]): string {
  return readFileSync(resolve(process.cwd(), "migrations", name), "utf8");
}

const allTicket08Sql = migrationNames.map(migration).join("\n");

describe("Ticket 08 project-finance database contract", () => {
  it("is additive and contains no destructive production reset commands", () => {
    expect(allTicket08Sql).not.toMatch(/\bdrop\s+(table|schema|database)\b/i);
    expect(allTicket08Sql).not.toMatch(/\btruncate\b/i);
    expect(allTicket08Sql).not.toMatch(/\bdelete\s+from\s+public\./i);
    expect(allTicket08Sql).not.toMatch(/on\s+delete\s+cascade/i);
  });

  it("extends the existing public.users identity instead of creating a second auth table", () => {
    const tenancy = migration("0015_project_finance_core_tenancy.sql");
    expect(tenancy).toContain("alter table public.users add column if not exists organization_id uuid");
    expect(tenancy).toContain("public.users u");
    expect(allTicket08Sql).not.toContain("create table if not exists project_finance.users");
    expect(allTicket08Sql).not.toContain("references project_finance.users");
  });

  it("creates all required persistence aggregates", () => {
    const required = [
      "project_finance.projects",
      "project_finance.project_facts",
      "project_finance.project_documents",
      "project_finance.project_document_fields",
      "project_finance.scenarios",
      "project_finance.scenario_assumptions",
      "project_finance.underwriting_policies",
      "project_finance.underwriting_policy_values",
      "project_finance.policy_overrides",
      "project_finance.calculation_runs",
      "project_finance.annual_project_cashflows",
      "project_finance.annual_debt_schedules",
      "project_finance.financing_results",
      "project_finance.tax_credit_results",
      "project_finance.capital_stack_results",
      "project_finance.return_results",
      "project_finance.downside_results",
      "project_finance.downside_cash_sweep_rows",
      "project_finance.reconciliation_results",
      "project_finance.calculation_warnings",
      "project_finance.formula_registry",
      "project_finance.calculation_metric_traces",
      "project_finance.sensitivity_runs",
      "project_finance.sensitivity_points",
      "project_finance.underwriting_runs",
      "project_finance.underwriting_rule_results",
      "project_finance.underwriting_risks",
      "project_finance.underwriting_conditions",
      "project_finance.underwriting_missing_information",
      "project_finance.audit_events",
    ];
    for (const table of required) expect(allTicket08Sql, `missing ${table}`).toContain(table);
  });

  it("uses NUMERIC rather than floating point for persisted finance values", () => {
    const finance = migration("0021_project_finance_financial_results.sql");
    expect(finance).toMatch(/numeric\(24,6\)/i);
    expect(finance).toMatch(/numeric\(18,10\)/i);
    expect(finance).toMatch(/numeric\(24,8\)/i);
    expect(finance).not.toMatch(/\b(real|float|double precision)\b/i);
  });

  it("preserves null semantics for legitimately unavailable metrics", () => {
    const finance = migration("0021_project_finance_financial_results.sql");
    expect(finance).toMatch(/minimum_dscr numeric\(18,10\),/);
    expect(finance).toMatch(/levered_sponsor_cash_irr numeric\(18,10\),/);
    expect(finance).toMatch(/sponsor_npv numeric\(24,6\),/);
    expect(finance).toMatch(/simplified_sponsor_after_tax_irr numeric\(18,10\),/);
  });

  it("enforces one current fact per project and field without deleting history", () => {
    const facts = migration("0017_project_finance_facts_documents.sql");
    expect(facts).toContain("where is_current");
    expect(facts).toContain("supersedes_fact_id");
    expect(facts).toContain("superseded_at");
    expect(facts).toContain("supersede_project_fact");
  });

  it("stores exact immutable calculation snapshots and supports reusable deterministic cache lookup", () => {
    const runs = migration("0020_project_finance_calculation_runs.sql");
    expect(runs).toContain("input_snapshot_json jsonb not null");
    expect(runs).toContain("input_hash text not null");
    expect(runs).toContain("calculation_engine_version text not null");
    expect(runs).toContain("policy_hash text");
    expect(runs).toContain("result_hash text");
    expect(runs).toContain("where status = 'SUCCESS'");
    expect(runs).not.toContain("unique (scenario_id, input_hash, calculation_engine_version)");
  });

  it("blocks inserts, updates, and deletes to result rows after a run succeeds", () => {
    const security = migration("0023_project_finance_audit_rls.sql");
    expect(security).toContain("before insert or update or delete");
    expect(security).toContain("r.status = 'SUCCESS'");
    expect(security).toContain("successful calculation outputs are immutable");
  });

  it("makes audit history append-only and used policy versions immutable", () => {
    const security = migration("0023_project_finance_audit_rls.sql");
    expect(security).toContain("audit events are append-only");
    expect(security).toContain("used policy versions are immutable");
    expect(security).toContain("underwriting_policy_values_immutable_when_used");
  });

  it("does not activate underwriting policy defaults in the database migration", () => {
    const policies = migration("0019_project_finance_policies.sql");
    expect(policies).not.toContain("ECOXCHANGE_SOLAR_BASE");
    expect(policies).not.toMatch(/target_p50_dscr|target_dscr|0\.70.*max_ltc/i);
  });

  it("uses tenant-scoped RLS and security-invoker summary views", () => {
    const security = migration("0023_project_finance_audit_rls.sql");
    const views = migration("0024_project_finance_views_indexes.sql");
    expect(allTicket08Sql.match(/enable row level security/gi)?.length ?? 0).toBeGreaterThan(10);
    expect(security).toContain("organization_id = project_finance.current_organization_id()");
    expect(views.match(/security_invoker = true/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("grants clients only the operations backed by explicit RLS policies", () => {
    const grants = migration("0026_project_finance_access_grants.sql");
    expect(grants).toContain("grant select, insert, update on project_finance.projects to authenticated");
    expect(grants).toContain("grant select on project_finance.calculation_runs to authenticated");
    expect(grants).not.toMatch(/grant\s+(all|insert|update|delete).*project_finance\.calculation_runs\s+to\s+authenticated/i);
    expect(grants).toContain("revoke all on tables from authenticated");
  });

  it("keeps project-finance documents private", () => {
    const views = migration("0024_project_finance_views_indexes.sql");
    expect(views).toContain("'project-finance-documents', 'project-finance-documents', false");
    expect(views).toContain("storage.foldername(name)");
    expect(views).not.toContain("public = true");
  });

  it("links sensitivity points to immutable child calculation runs", () => {
    const finance = migration("0021_project_finance_financial_results.sql");
    expect(finance).toContain("child_calculation_run_id uuid");
    expect(finance).toContain("sensitivity_points_child_calc_org_fk");
  });
});
