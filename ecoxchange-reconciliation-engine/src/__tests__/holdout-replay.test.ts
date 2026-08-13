import { describe, expect, it } from "vitest";
import { replay, type HoldoutPlant } from "../../scripts/replay-holdout.js";

function plant(): HoldoutPlant {
  return {
    plant_id: "fixture",
    months: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const even = month % 2 === 0;
      return {
        period_start: `2024-${String(month).padStart(2, "0")}-01`,
        raw_deviation_pct: even ? 20 : 2,
        seasonal_residual_pct: even ? 20 : 2,
      };
    }),
  };
}

describe("Spec 20 hold-out replay discipline", () => {
  it("fits odd months once and scores only the six even months", () => {
    const counts = replay([plant()]);
    expect(counts.months).toBe(6);
    expect(counts.flatUncalibrated).toBe(6);
    expect(counts.flatCalibrated).toBe(6);
    expect(counts.singleMonthGate).toBe(4);
    expect(counts.detectExceeded).toBe(6);
    expect(counts.pendingCalibrationPlants).toBe(0);
    expect(counts.rawResiduals).toHaveLength(6);
    expect(counts.seasonalResiduals).toHaveLength(6);
    expect(counts.calibratedResiduals).toHaveLength(6);
    // February and December use the widened winter gate; the other four even
    // months breach the 10% floor produced by the quiet odd-month fit.
    expect(counts.perPlantGate).toBe(4);
  });

  it("does not let even-month outliers widen their own frozen calibration", () => {
    const input = plant();
    for (const month of input.months) {
      if (Number(month.period_start.slice(5, 7)) % 2 === 0) {
        month.raw_deviation_pct = 200;
        month.seasonal_residual_pct = 200;
      }
    }
    const counts = replay([input]);
    expect(counts.perPlantGate).toBe(6);
  });

  it("does not treat non-adjacent detect exceedances as persistence", () => {
    const input = plant();
    input.months = input.months.filter((month) => !month.period_start.startsWith("2024-03"));
    for (const month of input.months) {
      month.raw_deviation_pct = 0;
      month.seasonal_residual_pct = month.period_start.startsWith("2024-02") ? 16 : 0;
    }
    const counts = replay([input]);
    expect(counts.perPlantGate).toBe(0);
  });

  it("uses cap bands and reports plants with insufficient fit history as pending", () => {
    const input = plant();
    input.months = input.months.slice(0, 4);
    input.months[1]!.raw_deviation_pct = 20;
    input.months[1]!.seasonal_residual_pct = 20;
    const counts = replay([input]);
    expect(counts.pendingCalibrationPlants).toBe(1);
    expect(counts.singleMonthGate).toBe(0);
  });
});
