// Page 2: monthly production profile + capacity factor in context.

import type { VerificationReportModel } from "../report-utils/report-model.js";
import {
  ReportPage,
  ReportSectionHeader,
} from "../report-components/ReportChrome.js";
import { ReportBarChart } from "../report-components/ReportBarChart.js";
import { ReportHorizontalBars } from "../report-components/ReportHorizontalBars.js";

export function ReportProductionPage({
  model,
  page,
  total,
}: {
  model: VerificationReportModel;
  page: number;
  total: number;
}) {
  const cfScaleMax = Math.max(...model.cfComparison.map((r) => r.pct)) * 1.15;

  return (
    <ReportPage page={page} total={total}>
      <ReportSectionHeader>MONTHLY PRODUCTION PROFILE</ReportSectionHeader>
      <ReportBarChart bars={model.monthlyBars} maxKwh={model.maxMonthKwh} />

      <div className="mt-5 border border-paleGreen bg-cream/40 p-4">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-wide text-darkBg">
          Seasonal Analysis
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1.5 font-mono text-[10.5px]">
          <div className="flex justify-between">
            <dt className="text-textMuted">Peak month</dt>
            <dd className="tabular-nums text-textDark">
              {model.bestMonth.label} ·{" "}
              {Math.round(model.bestMonth.kwh).toLocaleString("en-US")} kWh
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-textMuted">Lowest month</dt>
            <dd className="tabular-nums text-textDark">
              {model.worstMonth.label} ·{" "}
              {Math.round(model.worstMonth.kwh).toLocaleString("en-US")} kWh
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-textMuted">Summer/Winter</dt>
            <dd className="tabular-nums text-textDark">
              {model.seasonalRatio.toFixed(2)}× ratio
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-textMuted">Seasonality</dt>
            <dd className="text-textDark">{model.seasonalityLabel}</dd>
          </div>
        </dl>
      </div>

      <ReportSectionHeader>CAPACITY FACTOR IN CONTEXT</ReportSectionHeader>
      <ReportHorizontalBars
        rows={model.cfComparison.map((row) => ({
          label: row.label,
          valueLabel: `${row.pct.toFixed(1)}%`,
          widthPct: (row.pct / cfScaleMax) * 100,
          fillClass: row.emphasis ? "bg-accentBrt" : "bg-lightGreen",
        }))}
      />
      <p className="mt-2 font-mono text-[8px] text-textMuted">
        Fleet averages: EIA-923 reported generation, fixed-tilt reference
        cohorts · EcoXchange engine {model.engineVersion}
      </p>
    </ReportPage>
  );
}
