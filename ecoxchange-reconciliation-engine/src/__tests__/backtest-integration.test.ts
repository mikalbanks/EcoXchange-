import { describe, it, expect } from "vitest";
import { runBacktest } from "../backtest/runner.js";
import { SCENARIOS } from "../backtest/scenarios.js";

const RUN = process.env.RUN_NETWORK_TESTS === "1";
const d = RUN ? describe : describe.skip;

d("reference backtests against NASA POWER (spec §5.6)", () => {
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    it(
      `${key}: annual within PVWatts band, CF in industry range, no false flags at 0% deviation`,
      async () => {
        const report = await runBacktest({
          project: scenario.project,
          start_month: scenario.start_month,
          end_month: scenario.end_month,
          // Spec §5.6 #3 deliberately runs a degenerate 0%-deviation series to
          // prove the engine raises no false flags. That trips the Spec 19 G1
          // independence assertion by design, so the acknowledgement is
          // required here — this report is asserted on and discarded, never
          // persisted or published.
          simulation: {
            monthly_deviation_pct: 0,
            acknowledge_zero_deviation: true,
          },
        });

        const annual = report.summary.annual_expected_mwh;
        // Allow ±10% beyond PVWatts band (spec §5.6 #1)
        const low = scenario.pvwatts_annual_mwh_low * 0.9;
        const high = scenario.pvwatts_annual_mwh_high * 1.1;
        expect(annual).toBeGreaterThanOrEqual(low);
        expect(annual).toBeLessThanOrEqual(high);

        const cf = report.summary.capacity_factor_pct;
        expect(cf).toBeGreaterThanOrEqual(scenario.capacity_factor_low_pct - 2);
        expect(cf).toBeLessThanOrEqual(scenario.capacity_factor_high_pct + 2);

        // Spec §5.6 #3: zero false flags at 0% deviation
        expect(report.summary.months_flagged).toBe(0);

        // Spec §5.6 #2: seasonal ratio (max/min) plausible
        const monthly = report.monthly_results.map((m) => m.expected_kwh);
        const maxM = Math.max(...monthly);
        const minM = Math.min(...monthly);
        expect(maxM / minM).toBeGreaterThan(1.3);
      },
      120_000,
    );

    it(`${key}: -20% deviation flags every month`, async () => {
      const report = await runBacktest({
        project: scenario.project,
        start_month: scenario.start_month,
        end_month: scenario.end_month,
        simulation: { monthly_deviation_pct: -20 },
      });
      expect(report.summary.months_flagged).toBe(report.summary.months_tested);
    }, 120_000);
  }
});
