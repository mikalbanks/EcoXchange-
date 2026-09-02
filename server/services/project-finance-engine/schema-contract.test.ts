import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "migrations");
const files = [
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
];

const sql = files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");

describe("Spec 04 project-finance schema contract", () => {
  it("ships the complete incremental migration series", () => {
    for (const file of files) expect(fs.existsSync(path.join(root, file))).toBe(true);
  });

  it("isolates the underwriting domain from legacy public projects/users", () => {
    expect(sql).toContain("create schema if not exists project_finance");
    expect(sql).toContain("project_finance.projects");
    expect(sql).toContain("project_finance.users");
  });

  it("persists immutable calculation and underwriting snapshots", () => {
    expect(sql).toContain("input_snapshot_json jsonb not null");
    expect(sql).toContain("completed calculation runs are immutable");
    expect(sql).toContain("completed underwriting runs are immutable");
  });

  it("contains normalized financial and credit result tables", () => {
    for (const table of [
      "annual_project_cashflows",
      "annual_debt_schedules",
      "financing_results",
      "tax_credit_results",
      "capital_stack_results",
      "return_results",
      "downside_results",
      "underwriting_rule_results",
      "risks",
      "conditions_precedent",
      "missing_information",
    ]) expect(sql).toContain(`project_finance.${table}`);
  });

  it("enforces tenant RLS and scenario staleness hooks", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("current_organization_id()");
    expect(sql).toContain("mark_scenario_stale()");
    expect(sql).toContain("mark_fact_linked_scenarios_stale()");
  });

  it("seeds the exact Spec 03 base policy identity", () => {
    expect(sql).toContain("ECOXCHANGE_SOLAR_BASE");
    expect(sql).toContain("0.1.0");
    expect(sql).toContain("target_p50_dscr");
    expect(sql).toContain("0.92");
  });
});
