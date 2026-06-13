import React from "react";
import { Text } from "@react-pdf/renderer";
import { styles, colors, CONTENT_WIDTH } from "../styles/reportStyles";
import { ContentPage } from "../components/ContentPage";
import { SectionHeader } from "../components/SectionHeader";
import { StatBar } from "../components/StatBar";
import { BarChartSVG } from "../components/BarChartSVG";
import { DataTable, type TableColumn } from "../components/DataTable";
import { DisclaimerBlock } from "../components/DisclaimerBlock";
import {
  fmtInt,
  fmtUsd,
  fmtUsdRate,
  type ReportModel,
  type ReportRevenueRow,
} from "../reportDataModel";

/** Renders only when model.includeRevenue is true (PPA rate present). */
export function RevenueEstimate({ model }: { model: ReportModel }) {
  const revenue = model.revenue;
  if (!revenue) return null;

  const columns: TableColumn<ReportRevenueRow>[] = [
    { header: "Month", flex: 1.2, cell: (r) => r.shortLabel },
    { header: "Expected kWh", flex: 1.4, align: "right", mono: true, cell: (r) => fmtInt(r.expectedKwh) },
    { header: "PPA Rate", flex: 1.2, align: "right", mono: true, cell: (r) => fmtUsdRate(r.ratePerKwh) },
    { header: "Revenue", flex: 1.3, align: "right", mono: true, cell: (r) => fmtUsd(r.revenueUsd) },
  ];

  const totalRow = [
    "TOTAL",
    fmtInt(model.annualExpectedKwh),
    "—",
    fmtUsd(revenue.totalRevenueUsd),
  ];

  return (
    <ContentPage>
      <SectionHeader title="REVENUE ESTIMATE" />

      <StatBar
        items={[
          { label: "Annual Revenue", value: fmtUsd(revenue.annualRevenueUsd) },
          { label: "Monthly Avg", value: fmtUsd(revenue.monthlyAvgUsd) },
          { label: "PPA Rate", value: `${fmtUsdRate(revenue.ppaRatePerKwh)}/kWh` },
          { label: "Escalator", value: `${revenue.escalatorPct}%/yr` },
        ]}
      />

      <Text style={styles.blockLabel}>MONTHLY REVENUE</Text>
      <BarChartSVG
        data={revenue.rows.map((r, i) => ({ label: model.monthly[i]?.axisLabel ?? "", value: r.revenueUsd }))}
        width={CONTENT_WIDTH}
        height={150}
        color={colors.medGreen}
        yFormatter={(v) => `$${Math.round(v / 1000)}k`}
      />

      <Text style={styles.blockLabel}>REVENUE TABLE</Text>
      <DataTable columns={columns} rows={revenue.rows} totalRow={totalRow} />

      <Text style={styles.blockLabel}>IMPORTANT DISCLAIMERS</Text>
      <DisclaimerBlock
        lines={[
          "Revenue estimates are based on expected generation from the pvlib physics model applied to historical satellite weather.",
          "Actual revenue will depend on real production, which may differ from modeled expectations due to equipment performance, weather variability, curtailment, and grid conditions.",
          "PPA escalator is applied annually from the commissioning date.",
          "This is not a financial projection or guarantee of returns.",
        ]}
      />
    </ContentPage>
  );
}
