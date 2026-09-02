import { describe, expect, it } from "vitest";

import {
  buildOperatingForecast,
  calculateDebtSizing,
  calculateTransferredItc,
  runProjectFinanceV0,
  type ProjectFinanceInputs,
} from "./core";

const fiveMwReferenceCase: ProjectFinanceInputs = {
  projectName: "EcoXchange 5 MW reference case",
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
  targetP50Dscr: 1.30,
  maximumLtc: 0.70,
  upfrontFeePercent: 0.0125,
  dsraMonths: 6,
};

describe("project-finance-engine V0 deterministic core", () => {
  it("reproduces the 5 MW year-one operating benchmark", () => {
    const forecast = buildOperatingForecast(fiveMwReferenceCase);

    expect(forecast).toHaveLength(25);
    expect(forecast[0].generationMwh).toBeCloseTo(10_512, 6);
    expect(forecast[0].revenueUsd).toBeCloseTo(578_160, 2);
    expect(forecast[0].opexUsd).toBeCloseTo(150_000, 2);
    expect(forecast[0].cfadsUsd).toBeCloseTo(428_160, 2);
    expect(forecast[0].allowableDebtServiceUsd).toBeCloseTo(329_353.846, 2);
  });

  it("reproduces the 5 MW transferred-ITC benchmark", () => {
    const result = calculateTransferredItc(fiveMwReferenceCase);

    expect(result.eligibleBasisUsd).toBeCloseTo(7_600_000, 2);
    expect(result.itcFaceValueUsd).toBeCloseTo(2_280_000, 2);
    expect(result.grossTransferProceedsUsd).toBeCloseTo(2_097_600, 2);
    expect(result.netTransferProceedsUsd).toBeCloseTo(2_097_600, 2);
  });

  it("reproduces the report's approximately $3.364m DSCR-sized permanent debt", () => {
    const forecast = buildOperatingForecast(fiveMwReferenceCase);
    const sizing = calculateDebtSizing(fiveMwReferenceCase, forecast);

    expect(sizing.dscrSizedDebtUsd).toBeCloseTo(3_364_160, -1);
    expect(sizing.ltcMaximumDebtUsd).toBe(5_600_000);
    expect(sizing.permanentDebtUsd).toBeCloseTo(3_364_160, -1);
    expect(sizing.bindingConstraint).toBe("DSCR");
  });

  it("runs without any LLM or external-service dependency", () => {
    const result = runProjectFinanceV0(fiveMwReferenceCase);

    expect(result.yearOneCfadsUsd).toBeCloseTo(428_160, 2);
    expect(result.debtSizing.bindingConstraint).toBe("DSCR");
    expect(result.operatingForecast[24].year).toBe(25);
  });

  it("does not assign merchant revenue after the PPA expires", () => {
    const shortPpa = { ...fiveMwReferenceCase, ppaTermYears: 20 };
    const forecast = buildOperatingForecast(shortPpa);

    expect(forecast[19].revenueUsd).toBeGreaterThan(0);
    expect(forecast[20].revenueUsd).toBe(0);
    expect(forecast[20].cfadsUsd).toBeLessThan(0);
  });

  it("rejects an invalid capacity factor rather than silently inventing an assumption", () => {
    expect(() =>
      buildOperatingForecast({ ...fiveMwReferenceCase, p50CapacityFactor: 1.1 }),
    ).toThrow(/p50CapacityFactor/);
  });
});
