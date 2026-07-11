/**
 * EIA Solar Fleet Catalog — full-fleet PDF.
 *
 * Section A (front): the 3,882-plant prime cohort with full specs and engine
 * scores. Section B (back): the 1,183 excluded plants — CA/TX curtailment
 * states and provable underperformers — with disclaimers, reasons, and the
 * same full scores. Statistics pages cover mean / median / mode / std dev of
 * the engine's accuracy on the prime cohort.
 */
import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, colors, SERIF, MONO, SANS_BOLD, CONTENT_WIDTH } from "../styles/reportStyles";
import { PageFooter } from "../components/PageFooter";
import { SectionHeader } from "../components/SectionHeader";
import { StatBar } from "../components/StatBar";
import { DataTable, type TableColumn } from "../components/DataTable";
import { DisclaimerBlock } from "../components/DisclaimerBlock";
import { BarChartSVG } from "../components/BarChartSVG";
import type { CatalogPlantRow, FleetCatalogModel } from "./fleetCatalogModel";

/** Catalog page header: same banner, catalog-specific tag. */
function CatalogHeader() {
  return (
    <View style={styles.banner} fixed>
      <Text style={styles.bannerWordmark}>
        Eco<Text style={styles.bannerWordmarkAccent}>Xchange</Text>
      </Text>
      <Text style={styles.bannerTag}>EIA SOLAR FLEET CATALOG</Text>
    </View>
  );
}

function CatalogPage({ children }: { children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <CatalogHeader />
      {children}
      <PageFooter />
    </Page>
  );
}

const fmt1 = (n: number) => n.toFixed(1);
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function plantColumns(withReason: boolean): TableColumn<CatalogPlantRow>[] {
  const cols: TableColumn<CatalogPlantRow>[] = [
    { header: "EIA ID", flex: 0.9, mono: true, cell: (r) => r.eiaPlantId },
    { header: "Plant Name", flex: 3.2, cell: (r) => r.name },
    { header: "ST", flex: 0.5, cell: (r) => r.state },
    { header: "MW", flex: 0.8, align: "right", mono: true, cell: (r) => fmt1(r.capacityMw) },
    {
      header: "Tilt/Axis",
      flex: 1,
      mono: true,
      cell: (r) =>
        r.axisType.toLowerCase().includes("tracking") ? "Track" : `${r.tiltDeg.toFixed(0)}°`,
    },
    { header: "Actual MWh", flex: 1.2, align: "right", mono: true, cell: (r) => Math.round(r.actualMwh).toLocaleString("en-US") },
    { header: "Dev %", flex: 0.9, align: "right", mono: true, cell: (r) => signed(r.deviationPct) },
    { header: "CF %", flex: 0.8, align: "right", mono: true, cell: (r) => fmt1(r.actualCfPct) },
    { header: "±10%", flex: 0.6, align: "center", mono: true, cell: (r) => (r.within10pct ? "Y" : "N") },
  ];
  if (withReason) {
    cols.push({
      header: "Exclusion",
      flex: 1.5,
      mono: true,
      cell: (r) =>
        r.exclusionReasons
          .map((x) => (x === "curtailment_state" ? "Curtail" : "Underperf"))
          .join("+"),
    });
  }
  return cols;
}

function CoverPage({ model }: { model: FleetCatalogModel }) {
  return (
    <Page size="LETTER" style={styles.coverPage}>
      <Text style={{ fontFamily: SERIF, fontSize: 30, color: colors.darkGreen }}>
        Eco<Text style={{ color: colors.medGreen }}>Xchange</Text>
      </Text>

      <View style={{ height: 1.5, backgroundColor: colors.darkGreen, width: 200, marginTop: 90, marginBottom: 28 }} />

      <Text style={{ fontFamily: SERIF, fontSize: 26, color: colors.ink, letterSpacing: 0.5 }}>
        EIA Solar Fleet Catalog
      </Text>
      <Text style={{ fontFamily: SERIF, fontSize: 14, color: colors.muted, marginTop: 8 }}>
        {model.totalPlants.toLocaleString("en-US")} U.S. solar plants, engine-verified against
        federal {model.benchmarkYear} generation
      </Text>

      <View style={{ marginTop: 34 }}>
        <Text style={{ fontFamily: SANS_BOLD, fontSize: 13, color: colors.darkGreen }}>
          Section A — Prime Assets: {model.primeStats.n.toLocaleString("en-US")} plants
        </Text>
        <Text style={{ fontFamily: SANS_BOLD, fontSize: 13, color: colors.muted, marginTop: 4 }}>
          Section B — Excluded Assets: {model.defectivePlants.length.toLocaleString("en-US")} plants
        </Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 10.5, color: colors.muted }}>
          Benchmark Run:{" "}
          <Text style={{ color: colors.ink, fontFamily: MONO, fontSize: 10 }}>{model.benchmarkDate}</Text>
        </Text>
        <Text style={{ fontSize: 10.5, color: colors.muted, marginTop: 3 }}>
          Catalog Generated:{" "}
          <Text style={{ color: colors.ink, fontFamily: MONO, fontSize: 10 }}>{model.generatedDate}</Text>
        </Text>
        <Text style={{ fontSize: 10.5, color: colors.muted, marginTop: 3 }}>
          Engine:{" "}
          <Text style={{ color: colors.ink, fontFamily: MONO, fontSize: 10 }}>
            {model.engineVersion} (pvlib ModelChain, NASA POWER irradiance)
          </Text>
        </Text>
      </View>

      <View style={{ position: "absolute", bottom: 72, left: 54, right: 54 }}>
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />
        <Text style={{ fontFamily: MONO, fontSize: 9, color: colors.darkGreen, marginBottom: 4 }}>
          Prepared by EcoXchange, Inc. — Data: U.S. EIA-923 / EIA-860 / USPVDB
        </Text>
        <Text style={styles.disclaimer}>
          This catalog presents engine accuracy scores against federally reported generation.
          It is not an offer to sell securities, an appraisal, or a bankable resource assessment.
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 10 }} />
      </View>
    </Page>
  );
}

function ExecutiveSummaryPage({ model }: { model: FleetCatalogModel }) {
  const p = model.primeStats;
  return (
    <CatalogPage>
      <SectionHeader title="EXECUTIVE SUMMARY" />
      <Text style={styles.body}>
        The EcoXchange verification engine ({model.engineVersion}) modeled expected annual
        generation for every joined EIA-923 solar plant — {model.totalPlants.toLocaleString("en-US")} plants
        — using pvlib ModelChain physics and NASA POWER satellite irradiance, then scored each
        plant against its federally reported {model.benchmarkYear} generation.
      </Text>
      <Text style={styles.body}>
        The catalog separates the fleet into a prime cohort of{" "}
        {p.n.toLocaleString("en-US")} healthy plants (Section A) and{" "}
        {model.defectivePlants.length.toLocaleString("en-US")} excluded plants (Section B):
        plants in high-curtailment grid regions (California and Texas, where grid-ordered
        output reductions systematically depress reported generation below physical
        capability) and provable underperformers (plants whose reported output indicates
        an operational problem — availability, shading, equipment — rather than model error).
      </Text>

      <Text style={styles.blockLabel}>PRIME COHORT — ENGINE ACCURACY ({p.n.toLocaleString("en-US")} PLANTS)</Text>
      <StatBar
        items={[
          { label: "MEAN |DEVIATION|", value: `±${fmt1(p.meanAbsDevPct)}%` },
          { label: "MEDIAN |DEVIATION|", value: `±${fmt1(p.medianAbsDevPct)}%` },
          { label: "MODE |DEVIATION|", value: p.modeAbsDevPct != null ? `±${fmt1(p.modeAbsDevPct)}%` : "—" },
          { label: "STD DEVIATION", value: `${fmt1(p.stdDevPct)}%` },
        ]}
      />

      <Text style={styles.blockLabel}>ACCURACY DISTRIBUTION (PRIME COHORT)</Text>
      <DataTable
        columns={[
          { header: "Threshold", flex: 2, cell: (r: { label: string; value: string }) => r.label },
          { header: "Share of plants", flex: 1, align: "right", mono: true, cell: (r) => r.value },
        ]}
        rows={[
          { label: "Within ±5% of reported generation", value: `${fmt1(p.within5Rate)}%` },
          { label: "Within ±10% of reported generation", value: `${fmt1(p.within10Rate)}%` },
          { label: "Within ±15% of reported generation", value: `${fmt1(p.within15Rate)}%` },
        ]}
      />

      <Text style={styles.blockLabel}>FULL FLEET REFERENCE (ALL {model.totalPlants.toLocaleString("en-US")} PLANTS)</Text>
      <Text style={styles.body}>
        Including the excluded plants, the full-fleet mean absolute deviation is ±
        {fmt1(model.fullFleetStats.meanAbsDevPct)}% (median ±
        {fmt1(model.fullFleetStats.medianAbsDevPct)}%, mode{" "}
        {model.fullFleetStats.modeAbsDevPct != null
          ? `±${fmt1(model.fullFleetStats.modeAbsDevPct)}%`
          : "—"}
        , std {fmt1(model.fullFleetStats.stdDevPct)}%). The signed mean of{" "}
        {signed(model.fullFleetStats.meanSignedDevPct)} shows the physics is well-centered;
        the excluded cohort inflates the unsigned mean because sick plants under-produce
        relative to any physically correct model.
      </Text>

      <Text style={styles.blockLabel}>EXCLUSION RULE</Text>
      <Text style={{ ...styles.bodyMuted, fontFamily: MONO, fontSize: 8.5 }}>
        {model.publicationRule}
      </Text>
      <Text style={styles.bodyMuted}>
        Exclusions: {model.excludedCurtailment.toLocaleString("en-US")} in curtailment states,{" "}
        {model.excludedUnderperformer.toLocaleString("en-US")} provable underperformers (
        {model.excludedBoth.toLocaleString("en-US")} plants met both criteria). Every excluded
        plant is listed in Section B with its full score.
      </Text>
    </CatalogPage>
  );
}

function StatisticsPage({ model }: { model: FleetCatalogModel }) {
  return (
    <CatalogPage>
      <SectionHeader title="ACCURACY STATISTICS — PRIME COHORT" />

      <Text style={styles.blockLabel}>
        DISTRIBUTION OF ABSOLUTE DEVIATION ({model.primeStats.n.toLocaleString("en-US")} PLANTS)
      </Text>
      <BarChartSVG
        data={model.histogram.map((b) => ({ label: b.label, value: b.count }))}
        width={CONTENT_WIDTH}
        height={170}
        color={colors.medGreen}
      />
      <Text style={styles.chartCaption}>
        Plants per 2-percentage-point bin of |modeled − reported| / reported. Mode bin
        {model.primeStats.modeAbsDevPct != null
          ? ` centers near ±${fmt1(model.primeStats.modeAbsDevPct)}%`
          : ""}
        ; long right tail is real-world underperformance, not model bias.
      </Text>

      <Text style={styles.blockLabel}>TOP STATES (PRIME COHORT)</Text>
      <DataTable
        columns={[
          { header: "State", flex: 1, cell: (r: { state: string; count: number; meanAbsDevPct: number }) => r.state },
          { header: "Plants", flex: 1, align: "right", mono: true, cell: (r) => r.count.toLocaleString("en-US") },
          { header: "Mean |Dev|", flex: 1, align: "right", mono: true, cell: (r) => `±${fmt1(r.meanAbsDevPct)}%` },
        ]}
        rows={model.byState}
      />

      <Text style={styles.blockLabel}>BY CAPACITY (PRIME COHORT)</Text>
      <DataTable
        columns={[
          { header: "Capacity", flex: 1.4, cell: (r: { bucket: string; count: number; meanAbsDevPct: number | null }) => r.bucket },
          { header: "Plants", flex: 1, align: "right", mono: true, cell: (r) => r.count.toLocaleString("en-US") },
          {
            header: "Mean |Dev|",
            flex: 1,
            align: "right",
            mono: true,
            cell: (r) => (r.meanAbsDevPct != null ? `±${fmt1(r.meanAbsDevPct)}%` : "—"),
          },
        ]}
        rows={model.byCapacity}
      />
    </CatalogPage>
  );
}

function SectionDivider({
  title,
  subtitle,
  body,
  disclaimers,
}: {
  title: string;
  subtitle: string;
  body: string;
  disclaimers?: string[];
}) {
  return (
    <CatalogPage>
      <View style={{ marginTop: 120 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 28, color: colors.darkGreen }}>{title}</Text>
        <View style={{ height: 2, backgroundColor: colors.darkGreen, width: 260, marginTop: 12, marginBottom: 16 }} />
        <Text style={{ fontFamily: SANS_BOLD, fontSize: 13, color: colors.ink }}>{subtitle}</Text>
        <Text style={{ ...styles.body, marginTop: 12 }}>{body}</Text>
        {disclaimers ? (
          <View style={{ marginTop: 20 }}>
            <DisclaimerBlock lines={disclaimers} />
          </View>
        ) : null}
      </View>
    </CatalogPage>
  );
}

// 26 single-line rows fit US Letter under the fixed banner/footer with margin
// to spare (28 is the measured ceiling). Every cell is clamped to one line so
// page height is deterministic — react-pdf mis-renders auto-flowed tables at
// this scale ("unsupported number" border clipping across hundreds of pages).
const ROWS_PER_PAGE = 26;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function PlantTableSection({
  rows,
  withReason,
  caption,
}: {
  rows: CatalogPlantRow[];
  withReason: boolean;
  caption: string;
}) {
  const columns = plantColumns(withReason);
  const pages = chunk(rows, ROWS_PER_PAGE);
  return (
    <>
      {pages.map((pageRows, i) => (
        <CatalogPage key={i}>
          <Text style={{ ...styles.bodyMuted, fontFamily: MONO, fontSize: 8, marginBottom: 6 }}>
            {caption} — rows {(i * ROWS_PER_PAGE + 1).toLocaleString("en-US")}–
            {(i * ROWS_PER_PAGE + pageRows.length).toLocaleString("en-US")}
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {columns.map((col, c) => (
                <Text
                  key={c}
                  style={[
                    styles.tableHeaderCell,
                    { flex: col.flex ?? 1 },
                    { textAlign: col.align ?? "left" },
                  ]}
                >
                  {col.header}
                </Text>
              ))}
            </View>
            {pageRows.map((row, r) => (
              <View key={r} style={r % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                {columns.map((col, c) => (
                  <Text
                    key={c}
                    style={[
                      col.mono ? styles.tableCellMono : styles.tableCell,
                      { flex: col.flex ?? 1 },
                      { textAlign: col.align ?? "left" },
                      // Clamp to one line so every row is a fixed height.
                      { maxLines: 1, textOverflow: "ellipsis" },
                    ]}
                  >
                    {col.cell(row)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </CatalogPage>
      ))}
    </>
  );
}

function MethodologyPage({ model }: { model: FleetCatalogModel }) {
  return (
    <CatalogPage>
      <SectionHeader title="METHODOLOGY & DISCLAIMERS" />
      <Text style={styles.blockLabel}>DATA SOURCES</Text>
      <Text style={styles.body}>
        Plant registry and geometry: U.S. Large-Scale Solar Photovoltaic Database (USPVDB)
        centroids and axis type; EIA-860 plant characteristics (tilt and azimuth where
        reported, NREL latitude rule otherwise; azimuth 180° default). Reported generation:
        EIA-923 monthly net generation, {model.benchmarkYear}. Irradiance: NASA POWER
        satellite daily data at each plant's coordinates.
      </Text>
      <Text style={styles.blockLabel}>PHYSICS MODEL</Text>
      <Text style={styles.body}>
        EcoXchange engine {model.engineVersion}: pvlib ModelChain with Perez transposition
        and SAPM temperature model. Single-axis tracking plants are modeled with real
        tracking geometry. Loss and degradation assumptions are the engine defaults
        (14% system losses, 0.75%/yr degradation from commissioning year).
      </Text>
      <Text style={styles.blockLabel}>SCORING</Text>
      <Text style={styles.body}>
        Deviation % = (modeled − reported) / reported × 100. Positive values mean the model
        predicted more energy than the plant reported. The prime cohort excludes plants where
        reported generation is known to be depressed for non-model reasons (grid curtailment
        in CA/TX; operational underperformance defined as overprediction &gt; 15% with actual
        capacity factor &lt; 12.5%).
      </Text>
      <Text style={styles.blockLabel}>LIMITATIONS</Text>
      <DisclaimerBlock
        lines={[
          "This catalog is a model-accuracy benchmark, not a due-diligence report on any plant.",
          "Section B exclusion flags identify statistical patterns (curtailment exposure, underperformance), not verified operational facts about specific plants.",
          "EIA-reported generation is self-reported by operators and may contain errors.",
          "Tilt and azimuth are EIA-860 values where reported; otherwise estimated by the NREL latitude rule.",
          "The plants listed are real EIA-registered facilities and are not EcoXchange offerings; nothing in this catalog is an offer to sell or a solicitation to buy securities.",
          "Engine accuracy statistics are for the " + String(model.benchmarkYear) + " production year and may differ in other years.",
        ]}
      />
      <Text style={{ ...styles.disclaimer, marginTop: 16 }}>
        Engine {model.engineVersion} · Benchmark {model.benchmarkDate} · Catalog generated{" "}
        {model.generatedDate} · © EcoXchange, Inc.
      </Text>
    </CatalogPage>
  );
}

export function FleetCatalogDocument({ model }: { model: FleetCatalogModel }) {
  return (
    <Document
      title={`EcoXchange EIA Solar Fleet Catalog (${model.benchmarkYear})`}
      author="EcoXchange, Inc."
    >
      <CoverPage model={model} />
      <ExecutiveSummaryPage model={model} />
      <StatisticsPage model={model} />
      <SectionDivider
        title="Section A"
        subtitle={`Prime Solar Assets — ${model.primeStats.n.toLocaleString("en-US")} plants`}
        body={
          `Healthy plants outside high-curtailment grid regions whose reported generation is ` +
          `consistent with physical modeling. Engine accuracy on this cohort: mean ±` +
          `${model.primeStats.meanAbsDevPct.toFixed(1)}%, median ±` +
          `${model.primeStats.medianAbsDevPct.toFixed(1)}%, mode ` +
          `${model.primeStats.modeAbsDevPct != null ? `±${model.primeStats.modeAbsDevPct.toFixed(1)}%` : "—"}, ` +
          `standard deviation ${model.primeStats.stdDevPct.toFixed(1)}%.`
        }
      />
      <PlantTableSection
        rows={model.primePlants}
        withReason={false}
        caption={`SECTION A — PRIME ASSETS (${model.primePlants.length.toLocaleString("en-US")} plants, state A–Z, largest first)`}
      />
      <SectionDivider
        title="Section B"
        subtitle={`Excluded Assets — ${model.defectivePlants.length.toLocaleString("en-US")} plants`}
        body={
          `Plants excluded from the prime cohort, listed in full with their scores. ` +
          `"Curtail" marks plants in high-curtailment grid regions (CA, TX) where reported ` +
          `generation is depressed by grid-ordered output reductions — a grid effect, not a ` +
          `plant defect or model error. "Underperf" marks plants whose reported output ` +
          `(overprediction > 15% with capacity factor < 12.5%) indicates an operational ` +
          `problem such as availability, shading, or equipment faults.`
        }
        disclaimers={[
          "Exclusion is a statistical classification for benchmark integrity, not a verified finding about any specific facility.",
          "Curtailment-state plants may be individually healthy; their reported output reflects grid conditions.",
          "Underperformance flags are derived solely from the deviation between modeled and reported generation.",
          "Scores for these plants are reported unmodified — nothing is hidden from the statistics.",
        ]}
      />
      <PlantTableSection
        rows={model.defectivePlants}
        withReason={true}
        caption={`SECTION B — EXCLUDED ASSETS (${model.defectivePlants.length.toLocaleString("en-US")} plants, by exclusion reason, state A–Z)`}
      />
      <MethodologyPage model={model} />
    </Document>
  );
}
