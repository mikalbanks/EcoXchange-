import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { REFERENCE_SOLAR_5MW_INPUT } from "./fixtures/reference-solar-5mw-input";
import {
  CANONICAL_PROJECT_FINANCE_UNITS,
  FinanceValidationException,
  calculationRunIdSchema,
  parseProjectFinanceInput,
  projectFinanceInputSchema,
  projectIdSchema,
  scenarioIdSchema,
  underwritingRunIdSchema,
  validateProjectFinanceInput,
} from "./domain-contracts";

const valid = REFERENCE_SOLAR_5MW_INPUT;
const clone = <T>(value: T): T => structuredClone(value);

function expectInvalid(input: unknown, code: string): void {
  const result = validateProjectFinanceInput(input);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.errors.some((error) => error.code === code)).toBe(true);
}

describe("Ticket 02 project-finance domain contracts", () => {
  it("accepts the approved 5 MW reference input without adding defaults or changing values", () => {
    const before = clone(valid);
    const parsed = parseProjectFinanceInput(valid);
    expect(parsed).toEqual(before);
    expect(valid).toEqual(before);
  });

  it("rejects unknown fields instead of silently expanding the finance contract", () => {
    expect(projectFinanceInputSchema.safeParse({ ...valid, invented_bankability_score: 92 }).success).toBe(false);
  });

  it.each([0, -1])("returns INVALID_CAPACITY for capacity %s", (capacity) => {
    const input = clone(valid);
    input.project.capacity_mw_ac = capacity;
    expectInvalid(input, "INVALID_CAPACITY");
  });

  it("enforces capacity-factor mathematical boundaries", () => {
    for (const value of [0, 1.01]) {
      const input = clone(valid);
      input.generation.capacity_factor_p50 = value;
      expectInvalid(input, "INVALID_CAPACITY_FACTOR");
    }
    for (const value of [0.24, 1]) {
      const input = clone(valid);
      input.generation.capacity_factor_p50 = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
  });

  it("enforces degradation mathematical boundaries without policy assumptions", () => {
    for (const value of [0, 0.005, 0.999]) {
      const input = clone(valid);
      input.generation.annual_degradation_rate = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    for (const value of [-0.01, 1]) {
      const input = clone(valid);
      input.generation.annual_degradation_rate = value;
      expectInvalid(input, "INVALID_DEGRADATION");
    }
  });

  it("keeps mathematical DSCR validity separate from underwriting policy", () => {
    for (const value of [1.20, 1.25, 1.30, 2.00]) {
      const input = clone(valid);
      input.financing.target_dscr = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    for (const value of [0, -0.01]) {
      const input = clone(valid);
      input.financing.target_dscr = value;
      expectInvalid(input, "INVALID_DSCR");
    }
  });

  it("validates LTC as a fraction without imposing underwriting thresholds", () => {
    for (const value of [0, 0.65, 0.70, 0.80, 1]) {
      const input = clone(valid);
      input.financing.max_ltc = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    for (const value of [-0.01, 1.01]) {
      const input = clone(valid);
      input.financing.max_ltc = value;
      expectInvalid(input, "INVALID_LTC");
    }
  });

  it("accepts tax-credit scenarios above the base 30 percent assumption", () => {
    for (const value of [0, 0.06, 0.30, 0.40, 0.50]) {
      const input = clone(valid);
      input.tax_credit.itc_rate = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    const negative = clone(valid);
    negative.tax_credit.itc_rate = -0.01;
    expectInvalid(negative, "INVALID_ITC_RATE");
  });

  it("does not impose market transfer-price ranges", () => {
    for (const value of [0, 0.80, 0.92, 1]) {
      const input = clone(valid);
      input.tax_credit.itc_transfer_price = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    const negative = clone(valid);
    negative.tax_credit.itc_transfer_price = -0.01;
    expectInvalid(negative, "INVALID_TRANSFER_PRICE");
  });

  it("enforces amortization/maturity relationships but not PPA-tail policy", () => {
    const tooLong = clone(valid);
    tooLong.financing.amortization_years = 26;
    expectInvalid(tooLong, "INVALID_AMORTIZATION");

    const badMaturity = clone(valid);
    badMaturity.financing.debt_maturity_years = 19;
    expectInvalid(badMaturity, "INVALID_MATURITY");

    const contractTail = clone(valid);
    contractTail.revenue.ppa_term_years = 15;
    expect(validateProjectFinanceInput(contractTail).success).toBe(true);
  });

  it("permits mathematically valid negative escalation", () => {
    const input = clone(valid);
    input.revenue.ppa_escalation_rate = -0.01;
    input.operating_costs.opex_escalation_rate = -0.02;
    expect(validateProjectFinanceInput(input).success).toBe(true);

    input.revenue.ppa_escalation_rate = -1;
    expectInvalid(input, "INVALID_ESCALATION");
  });

  it("requires explicit fields and never inserts policy defaults", () => {
    const input: any = clone(valid);
    delete input.financing.target_dscr;
    const result = validateProjectFinanceInput(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.some((error) => error.field === "financing.target_dscr")).toBe(true);
    expect(() => parseProjectFinanceInput(input)).toThrow(FinanceValidationException);
  });

  it("reports multiple obvious validation errors in one pass", () => {
    const input = clone(valid);
    input.project.capacity_mw_ac = 0;
    input.financing.target_dscr = 0;
    input.transaction_costs.project_capex = -1;
    const result = validateProjectFinanceInput(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const codes = result.errors.map((error) => error.code);
      expect(codes).toContain("INVALID_CAPACITY");
      expect(codes).toContain("INVALID_DSCR");
      expect(codes).toContain("INVALID_CAPEX");
    }
  });

  it("validates annual generation overrides without truncation", () => {
    const good = clone(valid);
    good.generation.annual_generation_override_mwh = Array.from({ length: 25 }, () => 10_000);
    good.generation.annual_generation_override_mwh[4] = 0;
    expect(validateProjectFinanceInput(good).success).toBe(true);

    const negative = clone(good);
    negative.generation.annual_generation_override_mwh![4] = -1;
    expectInvalid(negative, "INVALID_GENERATION_OVERRIDE");

    const short = clone(valid);
    short.generation.annual_generation_override_mwh = [10_000, 9_900];
    expectInvalid(short, "INVALID_GENERATION_OVERRIDE");
  });

  it("validates V0 downside modes without calculating downside", () => {
    const multiplier = clone(valid);
    multiplier.downside.downside_generation_multiplier = 0.90;
    expect(validateProjectFinanceInput(multiplier).success).toBe(true);

    multiplier.downside.downside_generation_multiplier = 1.10;
    expectInvalid(multiplier, "INVALID_DOWNSIDE");

    const explicit = clone(valid);
    explicit.downside = {
      downside_type: "EXPLICIT_GENERATION",
      generation_source_type: "INDEPENDENT_ENGINEER_P90",
      annual_downside_generation_mwh: Array.from({ length: 25 }, () => 9_000),
    };
    expect(validateProjectFinanceInput(explicit).success).toBe(true);
  });

  it("allows optional tax appetite from zero through one", () => {
    for (const value of [0, 0.5, 1]) {
      const input = clone(valid);
      input.tax_credit.sponsor_tax_appetite_pct = value;
      expect(validateProjectFinanceInput(input).success).toBe(true);
    }
    const invalid = clone(valid);
    invalid.tax_credit.sponsor_tax_appetite_pct = 1.01;
    expect(validateProjectFinanceInput(invalid).success).toBe(false);
  });

  it("uses canonical units and decimal-rate convention", () => {
    expect(CANONICAL_PROJECT_FINANCE_UNITS).toEqual([
      "USD",
      "USD_PER_MWH",
      "MW_AC",
      "MWH",
      "RATIO",
      "PERCENT_DECIMAL",
      "YEARS",
      "MONTHS",
    ]);
    expect(valid.tax_credit.itc_rate).toBe(0.30);
    expect(valid.financing.annual_interest_rate).toBe(0.065);
  });

  it("uses branded UUID schemas for persisted domain identifiers", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(projectIdSchema.parse(id)).toBe(id);
    expect(scenarioIdSchema.parse(id)).toBe(id);
    expect(calculationRunIdSchema.parse(id)).toBe(id);
    expect(underwritingRunIdSchema.parse(id)).toBe(id);
    expect(projectIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("keeps the domain contract import surface limited to the validation library", () => {
    const source = fs.readFileSync(fileURLToPath(new URL("./domain-contracts.ts", import.meta.url)), "utf8");
    const imports = source.split("\n").filter((line) => line.startsWith("import "));
    expect(imports).toEqual(["import { z } from \"zod\";"]);
  });
});
