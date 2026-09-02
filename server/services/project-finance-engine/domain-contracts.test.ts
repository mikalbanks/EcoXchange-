import { describe, expect, it } from "vitest";

import fiveMwFixture from "./fixtures/test_case_5mw.json";
import type { ProjectFinanceInputs } from "./core";
import {
  calculationRunIdSchema,
  CANONICAL_PROJECT_FINANCE_UNITS,
  parseProjectFinanceInput,
  projectFinanceInputSchema,
  projectIdSchema,
  scenarioIdSchema,
  underwritingRunIdSchema,
  type ProjectFinanceInputContract,
} from "./domain-contracts";

const fiveMw = fiveMwFixture.inputs as ProjectFinanceInputs;

function asCoreInput(input: ProjectFinanceInputContract): ProjectFinanceInputs {
  return input;
}

describe("Ticket 02 project-finance domain contracts", () => {
  it("accepts the approved 5 MW golden input shape without changing its values", () => {
    const parsed = parseProjectFinanceInput(fiveMw);
    expect(parsed).toEqual(fiveMw);
    expect(asCoreInput(parsed)).toEqual(fiveMw);
  });

  it("rejects unknown fields instead of silently accepting an expanded finance contract", () => {
    const parsed = projectFinanceInputSchema.safeParse({
      ...fiveMw,
      inventedDebtMultiplier: 1.25,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([
    ["capacityMwAc", 0],
    ["totalProjectCapexUsd", -1],
    ["p50CapacityFactor", 1.01],
    ["targetP50Dscr", 0],
    ["maximumLtc", 1.01],
    ["itcEligibleBasisPercent", 1.01],
    ["projectLifeYears", -1],
    ["ppaTermYears", -1],
  ] as const)("rejects invalid %s values at the domain boundary", (field, value) => {
    const parsed = projectFinanceInputSchema.safeParse({ ...fiveMw, [field]: value });
    expect(parsed.success).toBe(false);
  });

  it("enforces debt maturity and amortization cross-field invariants", () => {
    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      debtAmortizationYears: 26,
    }).success).toBe(false);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      debtAmortizationYears: 18,
      debtMaturityYears: 19,
    }).success).toBe(false);
  });

  it("requires annual generation arrays to match the model life", () => {
    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      annualGenerationOverrideMwh: [10_000, 9_950],
    }).success).toBe(false);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      explicitDownsideGenerationMwh: Array.from({ length: 25 }, () => 9_000),
    }).success).toBe(true);
  });

  it("validates advanced optional financing inputs without calculating them", () => {
    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      bridgeEligibleAmountUsd: 2_000_000,
      bridgeAdvancePercent: 0.98,
      discountRate: 0.08,
    }).success).toBe(true);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      bridgeAdvancePercent: 1.01,
    }).success).toBe(false);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      discountRate: -1,
    }).success).toBe(false);
  });

  it("requires explicit values when CUSTOM DSRA or excluded contingency is selected", () => {
    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      dsraReferenceMethod: "CUSTOM",
      customDsraReferenceAnnualDebtServiceUsd: undefined,
    }).success).toBe(false);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      dsraReferenceMethod: "CUSTOM",
      customDsraReferenceAnnualDebtServiceUsd: 329_400,
    }).success).toBe(true);

    expect(projectFinanceInputSchema.safeParse({
      ...fiveMw,
      capexIncludesContingency: false,
      contingencyRate: undefined,
    }).success).toBe(false);
  });

  it("defines one canonical unit registry for future API/document contracts", () => {
    expect(CANONICAL_PROJECT_FINANCE_UNITS).toEqual([
      "USD",
      "USD_PER_MWH",
      "MW_AC",
      "MWH",
      "PERCENT_DECIMAL",
      "YEARS",
      "MONTHS",
      "RATIO",
    ]);
  });

  it("uses branded UUID schemas for persisted domain identifiers", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(projectIdSchema.parse(id)).toBe(id);
    expect(scenarioIdSchema.parse(id)).toBe(id);
    expect(calculationRunIdSchema.parse(id)).toBe(id);
    expect(underwritingRunIdSchema.parse(id)).toBe(id);
    expect(projectIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
