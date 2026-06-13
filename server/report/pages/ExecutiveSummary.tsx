import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";
import { ContentPage } from "../components/ContentPage";
import { SectionHeader } from "../components/SectionHeader";
import { StatBar } from "../components/StatBar";
import { ConfigTable } from "../components/ConfigTable";
import { BulletList } from "../components/BulletList";
import { fmtInt, fmtPct, type ReportModel } from "../reportDataModel";

export function ExecutiveSummary({ model }: { model: ReportModel }) {
  return (
    <ContentPage>
      <SectionHeader title="EXECUTIVE SUMMARY" />

      <StatBar
        items={[
          { label: "Annual Expected Generation", value: `${fmtInt(model.annualExpectedMwh)} MWh` },
          { label: "Capacity Factor", value: fmtPct(model.annualCapacityFactorPct) },
          { label: "Months Analyzed", value: String(model.monthsAnalyzed) },
          {
            label: "Verification Result",
            value: `${model.monthsVerified}/${model.monthsAnalyzed} ✓`,
          },
        ]}
      />

      <Text style={styles.blockLabel}>SYSTEM CONFIGURATION</Text>
      <ConfigTable items={model.config} />

      <Text style={styles.blockLabel}>METHODOLOGY OVERVIEW</Text>
      <Text style={styles.body}>
        Expected generation was calculated using the pvlib open-source photovoltaic modeling library
        (v0.11.1) with the following model chain:
      </Text>
      <BulletList
        items={[
          "Irradiance source: NASA POWER satellite (daily GHI / DNI / DHI)",
          "Transposition: Perez (1990) model — GHI to plane-of-array",
          "Temperature: SAPM cell temperature model (Sandia)",
          "IAM: Physical model (Fresnel reflection losses)",
          "Inverter: Efficiency-weighted with DC clipping at AC rating",
        ]}
      />
      <Text style={[styles.body, { marginTop: 8 }]}>
        The verification engine reconciles three independent data sources — inverter telemetry, utility
        meter, and satellite-derived expected generation — to produce a monthly VERIFIED / FLAGGED /
        PENDING verdict.
      </Text>
    </ContentPage>
  );
}
