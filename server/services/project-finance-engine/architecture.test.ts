import { describe, expect, it } from "vitest";

import { calculateInputHash, executeCalculation } from "./application";
import { basePolicyAssumptions } from "./policy";
import { resolveScenario, type Candidate } from "./scenario-resolver";
import type { ProjectFinanceInputs } from "./core";

const baseInput: ProjectFinanceInputs = {
  projectName: "5 MW architecture reference",
  capacityMwAc: 5,
  p50CapacityFactor: 0.24,
  annualDegradationRate: 0.005,
  projectLifeYears: 25,
  ppaTermYears: 25,
  yearOnePpaPricePerMwh: 55,
  annualPpaEscalationRate: 0.01,
  totalProjectCapexUsd: 8_000_000,
  yearOneOpexUsd: 150_000,
  annualOpexEscalationRate: 0.025,
  itcRate: 0.30,
  itcEligibleBasisPercent: 0.95,
  itcTransferPrice: 0.92,
  itcTransferTransactionCostsUsd: 0,
  debtInterestRate: 0.065,
  debtAmortizationYears: 18,
  debtMaturityYears: 18,
  targetP50Dscr: 1.30,
  maximumLtc: 0.70,
  upfrontFeePercent: 0.0125,
  dsraMonths: 6,
  closingCostsUsd: 400_000,
  downsideGenerationMultiplier: 0.90,
  underwritingPolicyId: "ECOXCHANGE_SOLAR_BASE",
  underwritingPolicyVersion: "0.1.0",
};

function fact(value: number, sourceType: Candidate["sourceType"] = "PROJECT_FACT"): Candidate {
  return { value, sourceType };
}

describe("Spec 05 service boundaries", () => {
  it("produces a deterministic canonical input hash independent of object key order", () => {
    const a = calculateInputHash(baseInput);
    const reordered = Object.fromEntries(Object.entries(baseInput).reverse()) as unknown as ProjectFinanceInputs;
    const b = calculateInputHash(reordered);
    expect(a).toBe(b);
  });

  it("keeps calculation execution deterministic and independent of persistence", () => {
    const a = executeCalculation(baseInput);
    const b = executeCalculation({ ...baseInput });
    expect(a.inputHash).toBe(b.inputHash);
    expect(a.result.financingSummary.permanentDebtUsd).toBe(b.result.financingSummary.permanentDebtUsd);
    expect(a.result.financingSummary.permanentDebtUsd).toBeCloseTo(3_364_160, -1);
  });

  it("resolves explicit scenario values before project facts and policy defaults", () => {
    const policy = basePolicyAssumptions(5);
    const resolved = resolveScenario({
      projectName: "Resolver case",
      projectValues: {
        capacity_mw_ac: fact(5, "VERIFIED_PROJECT_FACT"),
        capacity_factor_p50: fact(0.24),
        annual_degradation_rate: fact(0.005),
        project_life_years: fact(25),
        ppa_term_years: fact(25),
        ppa_price_year_1_per_mwh: fact(55),
        ppa_escalation_rate: fact(0.01),
        project_capex: fact(8_000_000),
        opex_year_1: fact(150_000),
        opex_escalation_rate: fact(0.025),
        itc_eligible_basis_pct: fact(0.95),
      },
      scenarioValues: {
        ppa_price_year_1_per_mwh: fact(60, "SCENARIO_OVERRIDE"),
        target_dscr: fact(1.25, "SCENARIO_OVERRIDE"),
      },
      policy,
      policyCode: "ECOXCHANGE_SOLAR_BASE",
      policyVersion: "0.1.0",
    });

    expect(resolved.missingFields).toEqual([]);
    expect(resolved.values.yearOnePpaPricePerMwh).toBe(60);
    expect(resolved.provenance.ppa_price_year_1_per_mwh.sourceType).toBe("SCENARIO_OVERRIDE");
    expect(resolved.values.targetP50Dscr).toBe(1.25);
    expect(resolved.values.debtInterestRate).toBe(0.065);
    expect(resolved.provenance.debt_interest_rate.sourceType).toBe("ECOXCHANGE_POLICY");
  });

  it("reports unresolved calculation inputs instead of inventing values", () => {
    const resolved = resolveScenario({
      projectName: "Incomplete case",
      projectValues: {},
      scenarioValues: {},
      policy: basePolicyAssumptions(5),
      policyCode: "ECOXCHANGE_SOLAR_BASE",
      policyVersion: "0.1.0",
    });
    expect(resolved.missingFields).toContain("project_capex");
    expect(resolved.missingFields).toContain("capacity_mw_ac");
  });
});
