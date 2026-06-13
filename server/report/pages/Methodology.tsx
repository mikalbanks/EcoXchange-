import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, colors } from "../styles/reportStyles";
import { ContentPage } from "../components/ContentPage";
import { SectionHeader } from "../components/SectionHeader";
import { BulletList } from "../components/BulletList";
import { DataTable, type TableColumn } from "../components/DataTable";
import type { ReportModel } from "../reportDataModel";

interface Triple {
  a: string;
  b: string;
  c: string;
}
interface Pair {
  a: string;
  b: string;
}

const toleranceCols: TableColumn<Triple>[] = [
  { header: "Check", flex: 1.3, cell: (r) => r.a },
  { header: "Threshold", flex: 0.8, mono: true, cell: (r) => r.b },
  { header: "Rationale", flex: 2, cell: (r) => r.c },
];
const toleranceRows: Triple[] = [
  { a: "Inverter vs Expected", b: "±15%", c: "Model uncertainty: 5–10% (satellite) + 3–5% (system)" },
  { a: "Inverter vs Utility", b: "±10%", c: "Self-consumption gap (net vs gross)" },
  { a: "Utility vs Expected", b: "±20%", c: "Net export vs gross expected generation" },
];

const sourceCols: TableColumn<Triple>[] = [
  { header: "Source", flex: 1.3, cell: (r) => r.a },
  { header: "Provider", flex: 1.2, cell: (r) => r.b },
  { header: "Resolution", flex: 1.3, mono: true, cell: (r) => r.c },
];
const sourceRows: Triple[] = [
  { a: "Solar irradiance", b: "NASA POWER", c: "Daily, 0.5° grid" },
  { a: "Air temperature", b: "NASA POWER", c: "Daily, 0.5° grid" },
  { a: "Wind speed", b: "NASA POWER", c: "Daily, 0.5° grid" },
  { a: "Physics model", b: "pvlib v0.11.1", c: "Hourly simulation" },
  { a: "Benchmarking", b: "NREL PVWatts", c: "TMY / annual" },
];

const modelCols: TableColumn<Pair>[] = [
  { header: "Component", flex: 1.1, cell: (r) => r.a },
  { header: "Model / Setting", flex: 1.6, mono: true, cell: (r) => r.b },
];
const modelRows: Pair[] = [
  { a: "Transposition", b: "Perez (1990)" },
  { a: "Cell temperature", b: "SAPM (Sandia) — open rack" },
  { a: "IAM", b: "Physical (Fresnel)" },
  { a: "γ_pdc", b: "-0.40%/°C (monocrystalline)" },
  { a: "Inverter efficiency", b: "96% (weighted CEC)" },
  { a: "Albedo", b: "0.20 (vegetation)" },
];

export function Methodology({ model }: { model: ReportModel }) {
  return (
    <ContentPage>
      <SectionHeader title="METHODOLOGY & DATA SOURCES" />

      <Text style={styles.blockLabel}>VERIFICATION ENGINE</Text>
      <Text style={styles.body}>
        EcoXchange's production verification engine reconciles three independent data sources to produce
        a deterministic monthly verification verdict:
      </Text>
      <BulletList
        items={[
          "Inverter telemetry — gross DC/AC production from the inverter monitoring portal (SolarEdge, Enphase, etc.)",
          "Utility meter — net energy exported, accessed via Bayou utility data aggregation (66% U.S. coverage)",
          "Satellite-derived expected generation — calculated using pvlib with NASA POWER irradiance data",
        ]}
      />
      <Text style={[styles.bodyMuted, { marginTop: 6, lineHeight: 1.5 }]}>
        For backtest reports (this document), simulated inverter data with ±3% random noise is used in
        place of real inverter telemetry, since the project has not yet been onboarded to the live
        verification system. (Engine: {model.engineLabel}.)
      </Text>

      <Text style={styles.blockLabel}>TOLERANCE CONFIGURATION</Text>
      <DataTable columns={toleranceCols} rows={toleranceRows} />

      <Text style={styles.blockLabel}>DATA SOURCES</Text>
      <DataTable columns={sourceCols} rows={sourceRows} />

      <Text style={styles.blockLabel}>PHYSICS MODEL CONFIGURATION</Text>
      <DataTable columns={modelCols} rows={modelRows} />

      <Text style={styles.blockLabel}>LIMITATIONS & CAVEATS</Text>
      <BulletList
        items={[
          "Satellite irradiance has inherent spatial resolution limits (0.5° ≈ 55 km). Localized weather effects (coastal fog, building shadows, terrain shading) are not captured.",
          "Temperature and wind speed are daily averages; diurnal variation is approximated via clear-sky profile weighting.",
          "This report presents methodology-documented estimates. It does not constitute a bankable resource assessment, which requires an independent engineer (e.g., DNV) review.",
          "Actual system performance depends on equipment condition, installation quality, and operational practices not modeled.",
        ]}
      />

      <View style={{ marginTop: 14 }}>
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 6 }} />
        <Text style={styles.disclaimer}>EcoXchange, Inc. · ecoxchange.net</Text>
        <Text style={styles.disclaimer}>Report engine: ecoxchange-pvlib-service v1.0.0</Text>
        <Text style={styles.disclaimer}>Generated: {model.generatedTimestamp}</Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 6 }} />
      </View>
    </ContentPage>
  );
}
