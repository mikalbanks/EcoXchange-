import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, colors, CONTENT_WIDTH } from "../styles/reportStyles";
import { ContentPage } from "../components/ContentPage";
import { SectionHeader } from "../components/SectionHeader";
import { BarChartSVG } from "../components/BarChartSVG";
import { DualAxisChartSVG } from "../components/DualAxisChartSVG";
import { ChartLegend } from "../components/ChartLegend";
import { fmtInt, fmtNum, fmtPct, type ReportModel } from "../reportDataModel";

export function SeasonalAnalysis({ model }: { model: ReportModel }) {
  const avg = model.annualCapacityFactorPct;

  return (
    <ContentPage>
      <SectionHeader title="SEASONAL & PERFORMANCE ANALYSIS" />

      <Text style={styles.blockLabel}>CAPACITY FACTOR BY MONTH</Text>
      <BarChartSVG
        data={model.monthly.map((m) => ({ label: m.axisLabel, value: m.capacityFactorPct }))}
        width={CONTENT_WIDTH}
        height={150}
        yFormatter={(v) => `${Math.round(v)}%`}
        averageLine={avg}
        averageLabel={`avg ${fmtPct(avg)}`}
      />

      <Text style={styles.blockLabel}>CELL TEMPERATURE EFFECT</Text>
      <ChartLegend
        items={[
          { label: "Capacity factor (%)", color: colors.darkGreen },
          { label: "Cell temp (°C)", color: colors.lime },
        ]}
      />
      <DualAxisChartSVG
        data={model.monthly.map((m) => ({
          label: m.axisLabel,
          bar: m.capacityFactorPct,
          line: m.cellTempC,
        }))}
        width={CONTENT_WIDTH}
        height={150}
        refLine={25}
        refLabel="25°C STC"
        leftFormatter={(v) => `${Math.round(v)}%`}
        rightFormatter={(v) => `${Math.round(v)}°`}
      />

      <Text style={styles.blockLabel}>KEY OBSERVATIONS</Text>
      <View style={{ marginBottom: 6 }}>
        <Text style={styles.body}>
          Peak production month: {model.peakMonthLabel} ({fmtInt(model.peakMonthKwh)} kWh,{" "}
          {fmtPct(model.peakMonthCfPct)} cap. factor)
        </Text>
        <Text style={styles.body}>
          Low production month: {model.lowMonthLabel} ({fmtInt(model.lowMonthKwh)} kWh,{" "}
          {fmtPct(model.lowMonthCfPct)} cap. factor)
        </Text>
        <Text style={styles.body}>Peak-to-trough ratio: {fmtNum(model.peakToTroughRatio, 2)}×</Text>
        <Text style={styles.body}>
          Annual capacity factor: {fmtPct(model.annualCapacityFactorPct)} (within the typical range for
          fixed-tilt systems in the southeastern U.S.: 16–20%)
        </Text>
      </View>
      <Text style={[styles.bodyMuted, { lineHeight: 1.5 }]}>
        Temperature derating reduces summer output relative to STC conditions. This effect is most
        pronounced in {model.hottestMonthLabel} (avg cell temp {fmtNum(model.hottestMonthCellTempC, 1)}
        °C, {fmtNum(model.hottestMonthCellTempC - 25, 1)}°C above STC), where capacity factor is
        suppressed despite comparable irradiance. This is expected physics behavior for
        monocrystalline silicon modules (γ_pdc = {model.moduleGammaPdc}).
      </Text>
    </ContentPage>
  );
}
