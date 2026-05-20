#!/usr/bin/env node
import { Command } from "commander";
import { SCENARIOS } from "./backtest/scenarios.js";
import { runBacktest } from "./backtest/runner.js";
import { writeJsonReport, writeMarkdownReport } from "./backtest/report.js";

const program = new Command();
program
  .name("ecoxchange-reconciliation")
  .description("EcoXchange three-way reconciliation engine CLI")
  .version("0.1.0");

program
  .command("backtest")
  .description("Run a reference backtest scenario against NASA POWER")
  .option(
    "-s, --scenario <name>",
    "scenario key: savannah | billerica | phoenix | all",
    "all",
  )
  .option("-d, --deviation <pct>", "monthly deviation pct (default 0)", "0")
  .option("--out <dir>", "output directory for reports", "./reports")
  .action(async (opts) => {
    const scenarioKeys =
      opts.scenario === "all"
        ? Object.keys(SCENARIOS)
        : [opts.scenario as string];
    const deviation = Number.parseFloat(opts.deviation);
    if (!Number.isFinite(deviation)) {
      console.error(`Invalid deviation: ${opts.deviation}`);
      process.exit(1);
    }

    console.log("scenario        | annual MWh | PVWatts band   | within | CF%");
    console.log("----------------|------------|----------------|--------|-----");

    for (const key of scenarioKeys) {
      const scenario = SCENARIOS[key];
      if (!scenario) {
        console.error(`Unknown scenario: ${key}`);
        process.exit(1);
      }
      const report = await runBacktest({
        project: scenario.project,
        start_month: scenario.start_month,
        end_month: scenario.end_month,
        simulation: { monthly_deviation_pct: deviation },
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      writeJsonReport(`${opts.out}/${key}-${stamp}.json`, report);
      writeMarkdownReport(`${opts.out}/${key}-${stamp}.md`, report, scenario);

      const annual = report.summary.annual_expected_mwh;
      // Spec §5.6 #1: pass if within ±10% of the PVWatts band.
      const low = scenario.pvwatts_annual_mwh_low * 0.9;
      const high = scenario.pvwatts_annual_mwh_high * 1.1;
      const inBand = annual >= low && annual <= high;
      console.log(
        `${key.padEnd(15)} | ${annual.toFixed(1).padStart(10)} | ` +
          `${`${scenario.pvwatts_annual_mwh_low}-${scenario.pvwatts_annual_mwh_high}`.padEnd(14)} | ` +
          `${inBand ? "yes   " : "NO    "} | ${report.summary.capacity_factor_pct.toFixed(1)}`,
      );
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
