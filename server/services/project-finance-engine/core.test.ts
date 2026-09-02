import { describe, expect, it } from "vitest";

import oneMwFixture from "./fixtures/test_case_1mw.json";
import fiveMwFixture from "./fixtures/test_case_5mw.json";
import twentyMwFixture from "./fixtures/test_case_20mw.json";
import {
  ANALYSIS_TYPE,
  CALCULATION_ENGINE_VERSION,
  ProjectFinanceValidationError,
  buildOperatingForecast,
  calculateDebtSizing,
  calculateIrr,
  calculateTransferredItc,
  runProjectFinanceV0,
  runSensitivity,
  type ProjectFinanceInputs,
} from "./core";

const oneMw = oneMwFixture.inputs as ProjectFinanceInputs;
const fiveMw = fiveMwFixture.inputs as ProjectFinanceInputs;
const twentyMw = twentyMwFixture.inputs as ProjectFinanceInputs;

function expectWithinPct(actual: number, expected: number, pct: number): void {
  const allowed = Math.max(0.01, Math.abs(expected) * pct);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(allowed);
}

describe("project-finance-engine Spec 02 deterministic core", () => {
  it("reproduces the 5 MW operating and transferable-ITC benchmark", () => {
    const forecast = buildOperatingForecast(fiveMw);
    const itc = calculateTransferredItc(fiveMw);

    expect(forecast).toHaveLength(25);
    expect(forecast[0].generationMwh).toBeCloseTo(10_512, 8);
    expect(forecast[0].revenueUsd).toBeCloseTo(578_160, 8);
    expect(forecast[0].opexUsd).toBeCloseTo(150_000, 8);
    expect(forecast[0].cfadsUsd).toBeCloseTo(428_160, 8);
    expect(forecast[0].allowableDebtServiceUsd).toBeCloseTo(329_353.8461538461, 6);
    expect(itc.eligibleBasisUsd).toBeCloseTo(7_600_000, 8);
    expect(itc.itcFaceValueUsd).toBeCloseTo(2_280_000, 8);
    expect(itc.netTransferProceedsUsd).toBeCloseTo(2_097_600, 8);
  });

  it.each([
    ["1 MW", oneMwFixture],
    ["5 MW", fiveMwFixture],
    ["20 MW", twentyMwFixture],
  ])("reproduces the %s golden debt case", (_name, fixture) => {
    const input = fixture.inputs as ProjectFinanceInputs;
    const expected = fixture.expected;
    const result = runProjectFinanceV0(input);

    expectWithinPct(result.yearOneCfadsUsd, expected.yearOneCfadsUsd, fixture.tolerance.simplePct);
    expectWithinPct(result.financingSummary.permanentDebtUsd, expected.permanentDebtUsd, fixture.tolerance.debtPct);
    expectWithinPct(result.financingSummary.debtToCapex, expected.debtToCapex, fixture.tolerance.debtPct);
    expectWithinPct(
      result.taxCreditResult.netTransferProceedsUsd,
      expected.itcNetTransferProceedsUsd,
      fixture.tolerance.simplePct,
    );
    expectWithinPct(result.financingSummary.dsraRequiredUsd, expected.dsraRequiredUsd, fixture.tolerance.debtPct);
    expectWithinPct(result.capitalStack.sponsorEquityUsd, expected.sponsorEquityUsd, fixture.tolerance.sponsorEquityPct);
    expect(result.financingSummary.bindingConstraint).toBe(expected.bindingConstraint);
    expect(result.reconciliation.debtReconciled).toBe(true);
    expect(result.reconciliation.sourcesUsesReconciled).toBe(true);
  });

  it("reconstructs the 5 MW debt capacity rather than assuming the report output", () => {
    const forecast = buildOperatingForecast(fiveMw);
    const sizing = calculateDebtSizing(fiveMw, forecast);

    expect(sizing.rawPvDebtCapacityUsd).toBeCloseTo(3_364_160.1747, 3);
    expect(sizing.dscrSizedDebtUsd).toBeCloseTo(3_364_160.1747, 3);
    expect(sizing.ltcMaximumDebtUsd).toBe(5_600_000);
    expect(sizing.permanentDebtUsd).toBeCloseTo(3_364_160.1747, 3);
    expect(sizing.bindingConstraint).toBe("DSCR");
  });

  it("builds a reconciled sculpted schedule and approximately holds target DSCR", () => {
    const result = runProjectFinanceV0(fiveMw);

    expect(result.annualDebtSchedule).toHaveLength(18);
    expect(result.annualDebtSchedule[0].openingBalanceUsd).toBeCloseTo(result.financingSummary.permanentDebtUsd, 6);
    expect(result.annualDebtSchedule.at(-1)?.endingBalanceUsd).toBeLessThanOrEqual(1);
    expect(result.financingSummary.minimumDscr).not.toBeNull();
    expect(result.financingSummary.minimumDscr as number).toBeCloseTo(1.30, 6);
    expect(result.financingSummary.dsraRequiredUsd).toBeCloseTo(164_676.92307692306, 3);
    expect(result.financingSummary.lenderUpfrontFeeUsd).toBeCloseTo(42_052.002184, 3);
    expect(result.capitalStack.sponsorEquityUsd).toBeCloseTo(2_994_968.7505, 2);
  });

  it("retains negative CFADS rather than flooring project economics at zero", () => {
    const stressed: ProjectFinanceInputs = {
      ...fiveMw,
      yearOnePpaPricePerMwh: 5,
    };
    const result = runProjectFinanceV0(stressed);

    expect(result.annualProjectCashflows[0].cfadsUsd).toBeLessThan(0);
    expect(result.annualProjectCashflows[0].allowableDebtServiceUsd).toBeLessThan(0);
    expect(result.warnings.some((warning) => warning.code === "NEGATIVE_CFADS")).toBe(true);
  });

  it("uses an explicit annual production array ahead of capacity-factor production", () => {
    const override = Array.from({ length: 25 }, () => 9_000);
    const result = runProjectFinanceV0({ ...fiveMw, annualGenerationOverrideMwh: override });

    expect(result.annualProjectCashflows[0].generationMwh).toBe(9_000);
    expect(result.annualProjectCashflows[24].generationMwh).toBe(9_000);
  });

  it("does not assign merchant revenue after the PPA expires and warns about the tail", () => {
    const result = runProjectFinanceV0({ ...fiveMw, ppaTermYears: 20 });

    expect(result.annualProjectCashflows[19].revenueUsd).toBeGreaterThan(0);
    expect(result.annualProjectCashflows[20].revenueUsd).toBe(0);
    expect(result.annualProjectCashflows[20].cfadsUsd).toBeLessThan(0);
    expect(result.warnings.some((warning) => warning.code === "UNCONTRACTED_TAIL")).toBe(true);
  });

  it("re-sculpts debt service when LTC binds below DSCR capacity", () => {
    const ltcBound: ProjectFinanceInputs = { ...fiveMw, maximumLtc: 0.20 };
    const result = runProjectFinanceV0(ltcBound);

    expect(result.financingSummary.bindingConstraint).toBe("LTC");
    expect(result.financingSummary.permanentDebtUsd).toBeCloseTo(1_600_000, 6);
    expect(result.financingSummary.minimumDscr as number).toBeGreaterThan(1.30);
    expect(result.reconciliation.debtReconciled).toBe(true);
  });

  it("distinguishes maturity from amortization and exposes a mini-perm balloon", () => {
    const result = runProjectFinanceV0({ ...fiveMw, debtMaturityYears: 5 });

    expect(result.financingSummary.balloonBalanceAtMaturityUsd).toBeGreaterThan(0);
    expect(result.annualDebtSchedule).toHaveLength(18);
  });

  it("stress-tests downside production against base debt service without resizing the loan", () => {
    const base = runProjectFinanceV0(fiveMw);
    const downside = base.downsideResults;

    expect(downside).not.toBeNull();
    expect(base.financingSummary.permanentDebtUsd).toBeCloseTo(3_364_160.1747, 3);
    expect(downside?.minimumDscr as number).toBeLessThan(1.30);
    expect(base.annualDebtSchedule[0].downsideDscr).toBeCloseTo(
      (downside?.cfadsUsd[0] as number) / base.annualDebtSchedule[0].debtServiceUsd,
      8,
    );
    expect(base.warnings.some((warning) => warning.code === "ILLUSTRATIVE_DOWNSIDE")).toBe(true);
  });

  it("supports the simplified optional tax module without treating tax appetite as automatic", () => {
    const noAppetite = runProjectFinanceV0({
      ...fiveMw,
      taxModule: {
        enabled: true,
        bonusDepreciationPct: 1,
        federalTaxRate: 0.21,
        sponsorTaxAppetitePct: 0,
      },
    });
    const fullAppetite = runProjectFinanceV0({
      ...fiveMw,
      taxModule: {
        enabled: true,
        bonusDepreciationPct: 1,
        federalTaxRate: 0.21,
        sponsorTaxAppetitePct: 1,
      },
    });

    expect(noAppetite.taxCreditResult.immediateTaxShieldUsd).toBe(0);
    expect(fullAppetite.taxCreditResult.depreciableBasisUsd).toBeCloseTo(6_460_000, 2);
    expect(fullAppetite.taxCreditResult.immediateTaxShieldUsd).toBeCloseTo(1_356_600, 2);
    expect(fullAppetite.sponsorReturns.simplifiedSponsorAfterTaxIrr?.irr as number).toBeGreaterThan(
      fullAppetite.sponsorReturns.leveredSponsorCashIrr.irr as number,
    );
  });

  it("recalculates debt and equity for sensitivities without mutating the base scenario", () => {
    const originalPpa = fiveMw.yearOnePpaPricePerMwh;
    const ppa = runSensitivity(fiveMw, "PPA_PRICE", [40, 55, 60]);
    const rates = runSensitivity(fiveMw, "INTEREST_RATE", [0.055, 0.065, 0.075]);

    expect(fiveMw.yearOnePpaPricePerMwh).toBe(originalPpa);
    expect(ppa[0].permanentDebtUsd).toBeLessThan(ppa[1].permanentDebtUsd);
    expect(ppa[2].permanentDebtUsd).toBeGreaterThan(ppa[1].permanentDebtUsd);
    expect(rates[0].permanentDebtUsd).toBeGreaterThan(rates[1].permanentDebtUsd);
    expect(rates[2].permanentDebtUsd).toBeLessThan(rates[1].permanentDebtUsd);
  });

  it("returns stable calculation metadata and formula traceability", () => {
    const result = runProjectFinanceV0(fiveMw);

    expect(result.metadata.calculationEngineVersion).toBe(CALCULATION_ENGINE_VERSION);
    expect(result.metadata.analysisType).toBe(ANALYSIS_TYPE);
    expect(result.formulaTrace.some((trace) => trace.formulaId === "DSCR_DEBT_CAPACITY_V1")).toBe(true);
    expect(result.formulaTrace.some((trace) => trace.formulaId === "ITC_TRANSFER_PROCEEDS_V1")).toBe(true);
  });

  it("provides guarded IRR statuses instead of blindly returning a number", () => {
    expect(calculateIrr([-100, 120]).status).toBe("VALID");
    expect(calculateIrr([100, 20, 10]).status).toBe("NO_SIGN_CHANGE");
    expect(calculateIrr([-100, 230, -132]).status).toBe("MULTIPLE_ROOT_RISK");
  });

  it("throws typed validation errors rather than inventing missing/absurd assumptions", () => {
    try {
      runProjectFinanceV0({ ...fiveMw, p50CapacityFactor: 1.1 });
      throw new Error("expected validation error");
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectFinanceValidationError);
      expect((error as ProjectFinanceValidationError).code).toBe("INVALID_CAPACITY_FACTOR");
    }
  });

  it("is deterministic across repeated calls and has no network or LLM dependency", () => {
    const first = runProjectFinanceV0(fiveMw);
    for (let i = 0; i < 20; i += 1) {
      expect(runProjectFinanceV0(fiveMw)).toEqual(first);
    }
  });
});
