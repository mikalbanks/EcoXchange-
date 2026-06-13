import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, colors, CONTENT_WIDTH } from "../styles/reportStyles";
import { ContentPage } from "../components/ContentPage";
import { SectionHeader } from "../components/SectionHeader";
import { BarChartSVG } from "../components/BarChartSVG";
import { ChartLegend } from "../components/ChartLegend";
import { DataTable, type TableColumn } from "../components/DataTable";
import {
  fmtInt,
  fmtNum,
  fmtPct,
  type ReportModel,
  type ReportMonthlyRow,
} from "../reportDataModel";

const STATUS_LABEL: Record<ReportMonthlyRow["status"], string> = {
  verified: "● VER.",
  flagged: "● FLAG",
  pending: "● PEND",
};

export function MonthlyAnalysis({ model }: { model: ReportModel }) {
  const columns: TableColumn<ReportMonthlyRow>[] = [
    { header: "Month", flex: 1.1, cell: (r) => r.shortLabel },
    { header: "Expected kWh", flex: 1.3, align: "right", mono: true, cell: (r) => fmtInt(r.expectedKwh) },
    { header: "POA kWh/m²", flex: 1.1, align: "right", mono: true, cell: (r) => fmtNum(r.poaKwhM2, 1) },
    { header: "Cell °C", flex: 0.9, align: "right", mono: true, cell: (r) => fmtNum(r.cellTempC, 1) },
    { header: "Cap. Factor", flex: 1, align: "right", mono: true, cell: (r) => fmtPct(r.capacityFactorPct) },
    { header: "Status", flex: 1, align: "right", cell: (r) => STATUS_LABEL[r.status] },
  ];

  const verdict = model.allVerified
    ? `${model.monthsVerified}/${model.monthsAnalyzed} ✓`
    : `${model.monthsVerified}/${model.monthsAnalyzed}`;

  const totalRow = [
    "TOTAL",
    fmtInt(model.totals.expectedKwh),
    "—",
    fmtNum(model.totals.avgCellTempC, 1),
    fmtPct(model.totals.capacityFactorPct),
    verdict,
  ];

  return (
    <ContentPage>
      <SectionHeader title="MONTHLY PRODUCTION ANALYSIS" />

      <Text style={styles.blockLabel}>EXPECTED GENERATION BY MONTH</Text>
      <ChartLegend
        items={[
          { label: "Expected (kWh)", color: colors.darkGreen },
          { label: "Simulated inverter", color: colors.lime, outline: true },
          { label: "±15% tolerance", color: colors.medGreen },
        ]}
      />
      <BarChartSVG
        data={model.monthly.map((m) => ({
          label: m.axisLabel,
          value: m.expectedKwh,
          value2: m.simulatedKwh,
        }))}
        width={CONTENT_WIDTH}
        height={168}
        tolerance={0.15}
        yFormatter={(v) => `${Math.round(v / 1000)}k`}
      />

      <Text style={styles.blockLabel}>MONTHLY DATA TABLE</Text>
      <DataTable columns={columns} rows={model.monthly} totalRow={totalRow} />

      <Text style={[styles.chartCaption, { marginTop: 8 }]}>
        Note: Expected generation accounts for temperature derating (SAPM model), angle-of-incidence
        losses (physical IAM), system losses, and annual degradation. Cell temperature values are
        daylight-weighted averages.
      </Text>
    </ContentPage>
  );
}
