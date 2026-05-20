import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { BacktestReport } from "./runner.js";
import type { ReferenceScenario } from "./scenarios.js";

export function writeJsonReport(path: string, report: BacktestReport): void {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), JSON.stringify(report, null, 2), "utf8");
}

export function renderMarkdown(
  report: BacktestReport,
  scenario?: ReferenceScenario,
): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(`- **Generated:** ${report.generated_at}`);
  lines.push(`- **Engine version:** ${report.engine_version}`);
  lines.push(`- **System:** ${report.system.name}`);
  lines.push(`- **Location:** ${report.system.location}`);
  lines.push(`- **Capacity:** ${report.system.capacity_kw_dc} kW-DC`);
  lines.push(`- **Configuration:** ${report.system.configuration}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Months tested | ${report.summary.months_tested} |`);
  lines.push(`| Months verified | ${report.summary.months_verified} |`);
  lines.push(`| Months flagged | ${report.summary.months_flagged} |`);
  lines.push(
    `| Annual expected | ${report.summary.annual_expected_mwh.toFixed(1)} MWh |`,
  );
  lines.push(
    `| Capacity factor | ${report.summary.capacity_factor_pct.toFixed(1)}% |`,
  );
  lines.push(
    `| Mean monthly deviation | ${report.summary.mean_deviation_pct.toFixed(2)}% |`,
  );
  if (scenario) {
    const annual = report.summary.annual_expected_mwh;
    const inBand =
      annual >= scenario.pvwatts_annual_mwh_low &&
      annual <= scenario.pvwatts_annual_mwh_high;
    lines.push(
      `| PVWatts band | ${scenario.pvwatts_annual_mwh_low}–${scenario.pvwatts_annual_mwh_high} MWh |`,
    );
    lines.push(`| Within PVWatts band? | ${inBand ? "yes" : "NO"} |`);
  }
  lines.push("");
  lines.push("## Monthly results");
  lines.push("");
  lines.push(
    `| Month | GHI (kWh/m²) | Expected (kWh) | Sim. Inverter (kWh) | Dev applied % | Inv vs Expected % | Status |`,
  );
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of report.monthly_results) {
    lines.push(
      `| ${r.month} | ${r.ghi_kwh_m2.toFixed(1)} | ${r.expected_kwh.toFixed(0)} | ` +
        `${r.simulated_inverter_kwh.toFixed(0)} | ${r.deviation_applied_pct.toFixed(2)} | ` +
        `${r.inv_vs_expected_pct === null ? "—" : r.inv_vs_expected_pct.toFixed(2)} | ${r.status} |`,
    );
  }
  return lines.join("\n");
}

export function writeMarkdownReport(
  path: string,
  report: BacktestReport,
  scenario?: ReferenceScenario,
): void {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), renderMarkdown(report, scenario), "utf8");
}
