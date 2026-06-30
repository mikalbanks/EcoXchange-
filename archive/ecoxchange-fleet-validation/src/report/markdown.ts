import type { BatchBacktestReport } from "../utils/types.js";

function pct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function renderMarkdown(r: BatchBacktestReport): string {
  const lines: string[] = [];
  lines.push(`# ${r.title}`);
  lines.push("");
  lines.push(`Generated: ${r.generated_at} · engine v${r.engine_version}`);
  lines.push("");
  lines.push("## Data Sources");
  lines.push("");
  lines.push(`- USPVDB: ${r.sources.uspvdb_version}`);
  lines.push(`- EIA Form 860: year ${r.sources.eia860_year}`);
  lines.push(`- EIA Form 923: year ${r.sources.eia923_year}`);
  lines.push(`- Satellite irradiance: ${r.sources.irradiance}`);
  lines.push("");
  lines.push("## Fleet Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Total plants in USPVDB | ${r.fleet.total_plants_in_uspvdb} |`);
  lines.push(`| Plants in 1–20 MW band | ${r.fleet.plants_in_1_20mw_band} |`);
  lines.push(`| Plants with EIA 923 data | ${r.fleet.plants_with_eia923_data} |`);
  lines.push(`| Plants successfully backtested | ${r.fleet.plants_successfully_backtested} |`);
  lines.push(`| Plants errored | ${r.fleet.plants_errored} |`);
  lines.push(`| Total capacity (MW) | ${r.fleet.total_capacity_mw} |`);
  lines.push(`| States represented | ${r.fleet.states_represented} |`);
  lines.push(`| PVDAQ-refined plants | ${r.fleet.pvdaq_refined} |`);
  lines.push("");
  lines.push("## Headline Validation");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  const v = r.validation;
  lines.push(`| Mean deviation | ${pct(v.mean_deviation_pct)} |`);
  lines.push(`| Median deviation | ${pct(v.median_deviation_pct)} |`);
  lines.push(`| Mean absolute deviation | ${v.mean_absolute_deviation_pct.toFixed(2)}% |`);
  lines.push(`| Std dev | ${v.std_dev_deviation_pct.toFixed(2)}% |`);
  lines.push(`| Within ±5% | ${v.plants_within_5pct} (${v.pct_within_5.toFixed(1)}%) |`);
  lines.push(`| Within ±10% | ${v.plants_within_10pct} (${v.pct_within_10.toFixed(1)}%) |`);
  lines.push(`| Within ±15% | ${v.plants_within_15pct} (${v.pct_within_15.toFixed(1)}%) |`);
  lines.push(`| Mean expected CF | ${v.mean_expected_cf.toFixed(2)}% |`);
  lines.push(`| Mean actual CF | ${v.mean_actual_cf.toFixed(2)}% |`);
  lines.push(`| CF Pearson R | ${v.cf_correlation.toFixed(3)} |`);
  lines.push(`| Overestimates / Underestimates | ${v.overestimate_count} / ${v.underestimate_count} |`);
  lines.push("");
  lines.push("## By State (top 15)");
  lines.push("");
  lines.push(`| State | Plants | Mean Deviation | % within ±10% |`);
  lines.push(`|---|---|---|---|`);
  for (const s of r.by_state.slice(0, 15)) {
    lines.push(
      `| ${s.state} | ${s.count} | ${pct(s.mean_deviation_pct)} | ${s.pct_within_10.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## By Capacity Band");
  lines.push("");
  lines.push(`| Band | Plants | Mean Deviation | % within ±10% |`);
  lines.push(`|---|---|---|---|`);
  for (const s of r.by_capacity_band) {
    lines.push(
      `| ${s.band} | ${s.count} | ${pct(s.mean_deviation_pct)} | ${s.pct_within_10.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## By Technology");
  lines.push("");
  lines.push(`| Technology | Plants | Mean Deviation | % within ±10% |`);
  lines.push(`|---|---|---|---|`);
  for (const s of r.by_technology) {
    lines.push(
      `| ${s.technology} | ${s.count} | ${pct(s.mean_deviation_pct)} | ${s.pct_within_10.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## By Axis Type");
  lines.push("");
  lines.push(`| Axis | Plants | Mean Deviation | % within ±10% |`);
  lines.push(`|---|---|---|---|`);
  for (const s of r.by_axis) {
    lines.push(
      `| ${s.axis_type} | ${s.count} | ${pct(s.mean_deviation_pct)} | ${s.pct_within_10.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## Top Outliers");
  lines.push("");
  lines.push("### Worst Overestimates");
  lines.push("");
  lines.push(`| Plant | State | Deviation | Likely Cause |`);
  lines.push(`|---|---|---|---|`);
  for (const o of r.outliers.worst_overestimates) {
    lines.push(`| ${o.name} | ${o.state} | ${pct(o.deviation_pct)} | ${o.likely_cause} |`);
  }
  lines.push("");
  lines.push("### Worst Underestimates");
  lines.push("");
  lines.push(`| Plant | State | Deviation | Likely Cause |`);
  lines.push(`|---|---|---|---|`);
  for (const o of r.outliers.worst_underestimates) {
    lines.push(`| ${o.name} | ${o.state} | ${pct(o.deviation_pct)} | ${o.likely_cause} |`);
  }
  if (r.errors.length > 0) {
    lines.push("");
    lines.push("## Errors");
    lines.push("");
    for (const e of r.errors.slice(0, 25)) {
      lines.push(`- **${e.name}** (EIA ${e.eia_id}): ${e.error}`);
    }
    if (r.errors.length > 25) {
      lines.push(`- ... and ${r.errors.length - 25} more`);
    }
  }
  return lines.join("\n");
}
