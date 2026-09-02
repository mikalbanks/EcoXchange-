import { describe, expect, it } from "vitest";
import oneMwJson from "./reference-solar-1mw.json";
import fiveMwJson from "./reference-solar-5mw.json";
import twentyMwJson from "./reference-solar-20mw.json";
import { calculateProjectFinanceCore, runSensitivity } from "../returns-downside";
import {
  GOLDEN_TOLERANCES,
  blockingComparisons,
  calculateGoldenCase,
  runGoldenSensitivityDiagnostics,
  type GoldenFixtureFile,
} from "./golden-validation";

const fixtures = [oneMwJson, fiveMwJson, twentyMwJson] as unknown as GoldenFixtureFile[];

function failureMessage(fixture: GoldenFixtureFile) {
  const comparison = calculateGoldenCase(fixture);
  const failures = blockingComparisons(comparison).filter((item) => item.status === "FAIL_IMPLEMENTATION");
  return failures.map((item) => `${fixture.case_id} ${item.metric}: source=${item.source} calculated=${item.calculated} variance=${item.variance}`).join("\n");
}

describe("Ticket 07 blocking golden base cases", () => {
  for (const fixture of fixtures) {
    it(`reconstructs ${fixture.case_id} blocking finance metrics`, () => {
      const comparison = calculateGoldenCase(fixture);
      const failures = blockingComparisons(comparison).filter((item) => item.status === "FAIL_IMPLEMENTATION");
      expect(failures, failureMessage(fixture)).toEqual([]);

      const result = comparison.result;
      expect(result.debt.reconciliation.debt_reconciled).toBe(true);
      expect(Math.abs(result.debt.reconciliation.debt_reconciliation_difference)).toBeLessThanOrEqual(GOLDEN_TOLERANCES.RECONCILIATION_USD);
      expect(result.capital_stack.reconciliation.sources_uses_reconciled).toBe(true);
      expect(Math.abs(result.capital_stack.reconciliation.sources_uses_difference)).toBeLessThanOrEqual(GOLDEN_TOLERANCES.RECONCILIATION_USD);
      expect(result.debt.financing_summary.binding_constraint).toBe("DSCR");
      expect(result.debt.annual_debt_schedule.at(-1)?.ending_balance ?? 0).toBeLessThanOrEqual(1);
      expect(result.warnings.some((warning) => warning.code === "ILLUSTRATIVE_DOWNSIDE_NOT_P90")).toBe(true);
    });
  }

  it("reconstructs source capital-stack percentages within displayed precision", () => {
    for (const fixture of fixtures) {
      const result = calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs));
      const capital = result.capital_stack.capital_stack;
      const expected = fixture.expected_outputs;
      expect(Math.abs(capital.permanent_debt_pct_total_uses - expected.debt_pct_total_uses_source)).toBeLessThanOrEqual(GOLDEN_TOLERANCES.CAPITAL_STACK_PERCENT_ABS);
      expect(Math.abs(capital.itc_proceeds_pct_total_uses - expected.itc_pct_total_uses_source)).toBeLessThanOrEqual(GOLDEN_TOLERANCES.CAPITAL_STACK_PERCENT_ABS);
      expect(Math.abs(capital.sponsor_equity_pct_total_uses - expected.sponsor_pct_total_uses_source)).toBeLessThanOrEqual(GOLDEN_TOLERANCES.CAPITAL_STACK_PERCENT_ABS);
      const totalPct = capital.permanent_debt_pct_total_uses + capital.itc_proceeds_pct_total_uses + capital.sponsor_equity_pct_total_uses + (capital.other_sources_pct_total_uses ?? 0);
      expect(Math.abs(totalPct - 1)).toBeLessThan(1e-9);
    }
  });

  it("preserves the documented simplified-tax difference instead of changing production tax formulas to fit the source", () => {
    for (const fixture of fixtures) {
      const comparison = calculateGoldenCase(fixture);
      expect(comparison.comparisons.find((item) => item.metric === "source_full_tax_tax_shield")?.status).toBe("KNOWN_SPEC_DIFFERENCE");
      expect(comparison.comparisons.find((item) => item.metric === "source_full_tax_irr")?.status).toBe("KNOWN_SPEC_DIFFERENCE");
    }
  });
});

describe("Ticket 07 published sensitivity behavior", () => {
  it("resizes senior debt at every 5 MW PPA sensitivity point", () => {
    const fixture = fiveMwJson as unknown as GoldenFixtureFile;
    const diagnostics = runGoldenSensitivityDiagnostics(fixture);
    const debts = diagnostics.ppa.points.map((point) => point.permanent_debt);
    expect(new Set(debts.map((value) => value.toFixed(2))).size).toBeGreaterThan(1);
    expect(diagnostics.ppa.points.map((point) => point.input_value)).toEqual([40, 45, 50, 55, 60]);
  });

  it("resizes senior debt under 5 MW interest-rate changes while leaving CFADS untouched", () => {
    const fixture = fiveMwJson as unknown as GoldenFixtureFile;
    const original = structuredClone(fixture.explicit_fixture_inputs);
    const diagnostics = runGoldenSensitivityDiagnostics(fixture);
    const debts = diagnostics.rates.points.map((point) => point.permanent_debt);
    expect(new Set(debts.map((value) => value.toFixed(2))).size).toBeGreaterThan(1);
    expect(fixture.explicit_fixture_inputs).toEqual(original);
  });

  it("keeps senior debt invariant across 6%, 30%, 40%, and 50% ITC sensitivities", () => {
    const fixture = fiveMwJson as unknown as GoldenFixtureFile;
    const diagnostics = runGoldenSensitivityDiagnostics(fixture);
    const debts = diagnostics.itc.points.map((point) => point.permanent_debt);
    expect(Math.max(...debts) - Math.min(...debts)).toBeLessThanOrEqual(0.01);
    expect(new Set(diagnostics.itc.points.map((point) => point.sponsor_equity.toFixed(2))).size).toBeGreaterThan(1);
  });

  it("validates capex and capacity-factor full-rerun invariants without fabricating source grid targets", () => {
    const fixture = fiveMwJson as unknown as GoldenFixtureFile;
    const base = calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs));
    const capex = runSensitivity(fixture.explicit_fixture_inputs, "PROJECT_CAPEX", [7_500_000, 8_000_000, 8_500_000]);
    const cf = runSensitivity(fixture.explicit_fixture_inputs, "CAPACITY_FACTOR", [0.22, 0.24, 0.26]);
    expect(new Set(capex.points.map((point) => point.sponsor_equity.toFixed(2))).size).toBeGreaterThan(1);
    expect(new Set(cf.points.map((point) => point.permanent_debt.toFixed(2))).size).toBeGreaterThan(1);
    expect(base.operating.annual_project_cash_flows[0]?.generation_mwh).toBe(10_512);
  });
});

describe("Ticket 07 trace, provenance, and determinism gates", () => {
  it("audits the required 5 MW metric traces", () => {
    const fixture = fiveMwJson as unknown as GoldenFixtureFile;
    const result = calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs));
    const requiredKeys = [
      "generation_mwh.year_1",
      "revenue.year_1",
      "cfads.year_1",
      "dscr_sized_debt",
      "ltc_debt_limit",
      "permanent_debt",
      "itc_net_transfer_proceeds",
      "dsra",
      "sponsor_equity",
      "levered_sponsor_cash_irr",
    ];
    for (const key of requiredKeys) expect(result.metric_traces.some((trace) => trace.metric_key === key), `missing trace ${key}`).toBe(true);
    expect(fixture.provenance.target_dscr).toBe("SOURCE_EXPLICIT");
    expect(fixture.provenance.ppa_price_year_1_per_mwh).toBe("SOURCE_EXPLICIT");
    expect(fixture.provenance.closing_costs).toBe("RECONSTRUCTION_INFERRED");
  });

  it("produces identical full-engine output for 1,000 repeated runs per golden case", () => {
    for (const fixture of fixtures) {
      const baseline = JSON.stringify(calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs)));
      for (let iteration = 0; iteration < 1_000; iteration += 1) {
        expect(JSON.stringify(calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs)))).toBe(baseline);
      }
    }
  });
});
