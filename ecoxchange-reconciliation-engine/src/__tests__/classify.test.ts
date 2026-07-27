import { describe, expect, it } from "vitest";
import { classifyAnomaly } from "../reconciliation/classify.js";
import { reconcile } from "../reconciliation/reconcile.js";
import { DEFAULT_TOLERANCES } from "../config/tolerances.js";
import type {
  ExpectedGenerationOutput,
  ProjectConfig,
  ReconciliationInput,
} from "../utils/types.js";

describe("classifyAnomaly — one test per rule (spec 7)", () => {
  it("Rule 1: weather anomaly — low GHI, inverter tracking expected", () => {
    const c = classifyAnomaly(-8, 2, -9, { ghi_vs_historical_avg_pct: -28 });
    expect(c.category).toBe("weather_anomaly");
    expect(c.confidence).toBe("high");
    expect(c.reasoning).toContain("28% below the historical average");
    expect(c.recommended_action).toContain("No action required");
  });

  it("Rule 2: inverter fault — inverter << utility << expected", () => {
    const c = classifyAnomaly(-22, -12, -11);
    expect(c.category).toBe("inverter_fault");
    expect(c.confidence).toBe("high");
    expect(c.reasoning).toContain("partial inverter downtime");
  });

  it("Rule 3: soiling — progressive decline, inverter ≈ utility", () => {
    const c = classifyAnomaly(-19.7, 4.1, -22.9, {
      prior_month_inv_vs_expected: -7.2,
      prior_month_status: "verified",
    });
    expect(c.category).toBe("soiling");
    expect(c.confidence).toBe("medium");
    expect(c.reasoning).toContain("7.2% below expected last month");
    expect(c.reasoning).toContain("19.7% this month");
    expect(c.recommended_action).toContain("Schedule panel cleaning");
  });

  it("Rule 4: curtailment — sudden drop, inverter > utility", () => {
    const c = classifyAnomaly(-18, 9, -25, {
      prior_month_status: "verified",
      prior_month_inv_vs_expected: 1.2,
    });
    expect(c.category).toBe("curtailment");
    expect(c.confidence).toBe("medium");
    expect(c.reasoning).toContain("grid curtailment");
  });

  it("Rule 5: meter error — inverter ≈ expected, utility diverges", () => {
    const c = classifyAnomaly(-3, 18, -20);
    expect(c.category).toBe("meter_error");
    expect(c.confidence).toBe("medium");
    expect(c.reasoning).toContain("utility meter");
  });

  it("Rule 6: degradation — steady stable deficit, sources agree", () => {
    // Note: within -25..-10 the soiling rule (3) shadows degradation by
    // spec order, so the reachable degradation window is -30..-25 with a
    // stable month-over-month deviation.
    const c = classifyAnomaly(-27, 1, -28, {
      prior_month_inv_vs_expected: -26,
      prior_month_status: "flagged",
    });
    expect(c.category).toBe("degradation");
    expect(c.confidence).toBe("low");
    expect(c.reasoning).toContain("0.75%/yr");
  });

  it("Default: unknown when no signature matches", () => {
    const c = classifyAnomaly(22, 1, 21);
    expect(c.category).toBe("unknown");
    expect(c.confidence).toBe("low");
    expect(c.recommended_action.length).toBeGreaterThan(0);
  });

  it("handles missing utility data (two-way check) without crashing", () => {
    const c = classifyAnomaly(-19.7, null, null, {
      prior_month_inv_vs_expected: -7.2,
    });
    expect(c.category).toBe("soiling"); // rule 3 tolerates null inv_vs_utility
  });

  describe("rule precedence", () => {
    it("weather beats inverter-fault when GHI explains the deficit", () => {
      // Deviations that would satisfy rule 2, but GHI is the story and the
      // deficit is small — rule 1 requires |inv_vs_expected| < 10, so use
      // -8 with utility divergence; rule 1 fires first.
      const c = classifyAnomaly(-8, -12, -9, {
        ghi_vs_historical_avg_pct: -30,
      });
      expect(c.category).toBe("weather_anomaly");
    });

    it("inverter-fault beats soiling when the inverter lags the meter", () => {
      const c = classifyAnomaly(-20, -10, -12, {
        prior_month_inv_vs_expected: -7,
      });
      expect(c.category).toBe("inverter_fault");
    });

    it("soiling beats curtailment (spec rule order)", () => {
      // -20% with prior decline; inv_vs_utility 6 satisfies curtailment's
      // >5 but also soiling's <8 — soiling is evaluated first.
      const c = classifyAnomaly(-20, 6, -24, {
        prior_month_inv_vs_expected: -6,
        prior_month_status: "verified",
      });
      expect(c.category).toBe("soiling");
    });
  });
});

describe("reconcile() classification wiring", () => {
  const project = { id: "p1", name: "Test" } as unknown as ProjectConfig;

  function makeInput(
    inverterKwh: number | null,
    utilityKwh: number | null,
    expectedKwh: number,
  ): ReconciliationInput {
    const expected: ExpectedGenerationOutput = {
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      expected_kwh: expectedKwh,
      daily_breakdown: [],
      assumptions: {
        degradation_factor: 0.98,
        system_losses: 0.14,
        albedo: 0.2,
        transposition_model: "perez",
      },
    };
    return {
      project,
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      inverter_reading:
        inverterKwh === null
          ? null
          : { kwh_gross: inverterKwh, data_quality: "complete" },
      utility_reading:
        utilityKwh === null ? null : { kwh_net: utilityKwh, data_quality: "complete" },
      expected_generation: expected,
      tolerances: DEFAULT_TOLERANCES,
    };
  }

  it("attaches a classification to flagged records", () => {
    const out = reconcile({
      ...makeInput(612_400, 588_200, 762_800),
      classification_context: {
        prior_month_inv_vs_expected: -7.2,
        prior_month_status: "verified",
      },
    });
    expect(out.status).toBe("flagged");
    expect(out.classification).toBeDefined();
    expect(out.classification!.category).toBe("soiling");
  });

  it("never attaches a classification to verified records", () => {
    const out = reconcile(makeInput(500_000, 495_000, 505_000));
    expect(out.status).toBe("verified");
    expect(out.classification).toBeUndefined();
  });

  it("never attaches a classification to pending records", () => {
    const out = reconcile(makeInput(null, 495_000, 505_000));
    expect(out.status).toBe("pending");
    expect(out.classification).toBeUndefined();
  });

  it("classification never changes the verdict", () => {
    const flaggedWithCtx = reconcile({
      ...makeInput(612_400, 588_200, 762_800),
      classification_context: { ghi_vs_historical_avg_pct: -40 },
    });
    const flaggedWithout = reconcile(makeInput(612_400, 588_200, 762_800));
    expect(flaggedWithCtx.status).toBe(flaggedWithout.status);
    expect(flaggedWithCtx.flag_reasons).toEqual(flaggedWithout.flag_reasons);
  });
});
