import type { ReactNode } from "react";
import { complianceMode } from "../compliance/config/complianceMode.js";
import { disclaimerConfig } from "../compliance/config/disclaimerConfig.js";
import { ENGINE_VERSION } from "../config/engine.js";
import benchmarkData from "../data/benchmark-results.json";
import { formatMonthShort, formatUsd } from "../utils/formatters.js";
import type { ProjectMeta, ProjectSummary, VerificationRecord } from "../utils/types.js";

export interface ReportInput {
  project: ProjectMeta;
  records: VerificationRecord[];
  summary: ProjectSummary;
  generatedAt: Date;
  /** "live" = expected series from the deployed pvlib engine at generation time. */
  dataSource?: "live" | "cached";
}

// Count-weighted mean absolute deviation over the 1–5 and 5–20 MW buckets —
// the EcoXchange target segment cited in the methodology section.
const targetSegmentMad: number | null = (() => {
  const rows = benchmarkData.by_capacity.filter(
    (b) => (b.bucket === "1–5 MW" || b.bucket === "5–20 MW") &&
      b.count > 0 && b.mean_abs_deviation_pct !== null,
  );
  const n = rows.reduce((s, b) => s + b.count, 0);
  if (n === 0) return null;
  return rows.reduce((s, b) => s + b.count * (b.mean_abs_deviation_pct as number), 0) / n;
})();

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtSigned = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const monthName = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function Page({ children, footer = true, page, total }: {
  children: ReactNode;
  footer?: boolean;
  page: number;
  total: number;
}) {
  return (
    <div
      className="pdf-page relative flex w-[794px] h-[1123px] flex-col bg-white px-16 py-14 text-textDark"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div className="flex-1">{children}</div>
      {footer ? (
        <div className="mt-8 flex items-center justify-between border-t border-paleGreen pt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-textMuted">
          <span>EcoXchange · Production Verification Report</span>
          <span>
            Engine {ENGINE_VERSION} · Page {page} of {total}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
      § {children}
    </p>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-paleGreen/60 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.04em] text-textMuted">{label}</dt>
      <dd className="font-mono text-[12px] tabular-nums text-textDark">{value}</dd>
    </div>
  );
}

/**
 * The 6-page Production Verification Report, laid out as fixed A4 pages for
 * the html2canvas -> jsPDF pipeline (src/reports/pdf.ts). Rendered in an
 * offscreen container only while a download is in flight.
 */
export function VerificationReportTemplate({
  project,
  records,
  summary,
  generatedAt,
  dataSource = "cached",
}: ReportInput) {
  const totalExpected = records.reduce((s, r) => s + r.expected_kwh, 0);
  const totalInverter = records.reduce((s, r) => s + r.inverter_kwh, 0);
  const meanDev = records.reduce((s, r) => s + r.inv_vs_expected_pct, 0) / records.length;
  const meanAbsDev = records.reduce((s, r) => s + Math.abs(r.inv_vs_expected_pct), 0) / records.length;
  const verifiedCount = records.filter((r) => r.status === "verified").length;
  const periodLabel =
    records.length > 0
      ? `${monthName(records[0].period_start)} – ${monthName(records[records.length - 1].period_start)}`
      : "—";
  const year = records.length > 0 ? records[0].period_start.slice(0, 4) : "";
  const hasPpa = (project.ppa_rate_per_kwh ?? 0) > 0;
  const maxKwh = Math.max(...records.map((r) => Math.max(r.expected_kwh, r.inverter_kwh)));
  const disclaimers = disclaimerConfig[complianceMode];
  const totalPages = hasPpa ? 6 : 5;
  let cumulativeRevenue = 0;

  return (
    <>
      {/* ── Page 1: Cover ── */}
      <Page page={1} total={totalPages} footer={false}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 bg-accentBrt" aria-hidden />
            <span className="font-heading text-2xl italic text-darkBg">EcoXchange</span>
          </div>

          <div className="mt-40">
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-medGreen">
              Production Verification Report
            </p>
            <div className="mt-2 h-px w-64 bg-medGreen" />
            <h1 className="mt-10 font-heading text-[40px] italic leading-tight text-darkBg">
              {project.name}
            </h1>
            <p className="mt-2 font-mono text-[12px] text-textMuted">
              {project.location} ({Math.abs(project.latitude).toFixed(2)}°
              {project.latitude >= 0 ? "N" : "S"}, {Math.abs(project.longitude).toFixed(2)}°
              {project.longitude >= 0 ? "E" : "W"})
            </p>
          </div>

          <div className="mt-16 space-y-1.5 font-mono text-[11px] text-textDark">
            <p>Report Period: {periodLabel}</p>
            <p>Generated: {fmtDate(generatedAt)}</p>
            <p>Engine Version: {ENGINE_VERSION} (pvlib ModelChain)</p>
          </div>

          <p className="mt-14 font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
            § Confidential
          </p>

          <div className="mt-auto font-mono text-[10px] text-textMuted">
            <p>Prepared by EcoXchange, Inc.</p>
            <p>ecoxchange.net</p>
          </div>
        </div>
      </Page>

      {/* ── Page 2: Executive Summary ── */}
      <Page page={2} total={totalPages}>
        <Tag>Executive Summary</Tag>
        <h2 className="mt-1 font-heading text-[26px] italic text-darkBg">Executive Summary</h2>

        <div className="mt-6 grid grid-cols-2 gap-x-10">
          <dl>
            <SpecRow label="Capacity" value={`${fmtInt(project.capacity_kw)} kW DC`} />
            <SpecRow label="Tilt / Azimuth" value={`${project.tilt_deg}° / ${project.azimuth_deg}°`} />
            <SpecRow label="Module Efficiency" value={`${Math.round(project.module_efficiency * 100)}%`} />
            <SpecRow label="System Losses" value={`${Math.round(project.system_losses * 100)}%`} />
          </dl>
          <dl>
            <SpecRow label="Location" value={project.location} />
            <SpecRow label="Commissioned" value={project.commissioning_date} />
            <SpecRow label="Offtake" value={project.offtake_type.replace(/_/g, " ")} />
            <SpecRow
              label="PPA Rate"
              value={hasPpa ? `$${project.ppa_rate_per_kwh.toFixed(3)}/kWh` : "—"}
            />
          </dl>
        </div>

        <div className="mt-8 bg-darkBg px-6 py-5">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="font-mono text-[22px] tabular-nums text-accentBrt">{fmtInt(totalExpected / 1000)}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-paleGreen">Expected MWh</p>
            </div>
            <div>
              <p className="font-mono text-[22px] tabular-nums text-accentBrt">{fmtInt(totalInverter / 1000)}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-paleGreen">Verified MWh</p>
            </div>
            <div>
              <p className="font-mono text-[22px] tabular-nums text-accentBrt">{fmtSigned(meanDev)}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-paleGreen">Mean Deviation</p>
            </div>
            <div>
              <p className="font-mono text-[22px] tabular-nums text-accentBrt">
                {verifiedCount}/{records.length}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-paleGreen">Months Verified</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-10">
          <dl>
            <SpecRow label="Capacity Factor" value={`${summary.capacity_factor_pct.toFixed(1)}%`} />
            <SpecRow label="Mean |Deviation|" value={`${meanAbsDev.toFixed(1)}%`} />
          </dl>
          <dl>
            <SpecRow label="Annual Production" value={`${summary.annual_production_mwh.toLocaleString("en-US")} MWh`} />
            <SpecRow label="Months Flagged" value={String(summary.months_flagged)} />
          </dl>
        </div>

        <Tag>Key Finding</Tag>
        <p className="mt-2 text-[12px] leading-relaxed text-textDark">
          Across the {records.length}-month report period, inverter-metered production tracked
          the physics-model expectation with a mean deviation of {fmtSigned(meanDev)} and a mean
          absolute deviation of {meanAbsDev.toFixed(1)}%, within the engine's ±15% verification
          band in {verifiedCount} of {records.length} months. Three-source reconciliation
          (inverter telemetry, utility meter, modeled expectation) produced a{" "}
          {verifiedCount === records.length ? "VERIFIED verdict for every month" : `VERIFIED verdict in ${verifiedCount} months`} of
          the period. All figures are methodology-documented estimates derived from the sources
          listed in the attribution section.
        </p>
      </Page>

      {/* ── Page 3: Monthly Production Detail ── */}
      <Page page={3} total={totalPages}>
        <Tag>Monthly Detail</Tag>
        <h2 className="mt-1 font-heading text-[26px] italic text-darkBg">Monthly Production Detail</h2>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="bg-cream">
              {["Month", "Expected kWh", "Inverter kWh", "Utility kWh", "INV→EXP", "Verdict"].map((h) => (
                <th
                  key={h}
                  className="border-b border-paleGreen px-2 py-2 text-left font-mono text-[9px] uppercase tracking-[0.04em] text-textMuted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.period_start} className="border-b border-paleGreen/40">
                <td className="px-2 py-1.5 font-mono text-[11px]">{formatMonthShort(r.period_start)}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{fmtInt(r.expected_kwh)}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{fmtInt(r.inverter_kwh)}</td>
                <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">
                  {r.utility_kwh !== null && r.utility_kwh !== undefined ? fmtInt(r.utility_kwh) : "—"}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{fmtSigned(r.inv_vs_expected_pct)}</td>
                <td
                  className={`px-2 py-1.5 font-mono text-[10px] font-semibold uppercase ${
                    r.status === "verified" ? "text-accentBrt" : "text-statusFlagged"
                  }`}
                >
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Tag>Expected vs Verified by Month</Tag>
        <div className="mt-3 flex h-48 items-end gap-2">
          {records.map((r) => (
            <div key={r.period_start} className="flex flex-1 flex-col justify-end">
              <div className="flex items-end justify-center gap-[3px]" style={{ height: 168 }}>
                <div
                  className="w-[10px] bg-paleGreen"
                  style={{ height: Math.max(3, (r.expected_kwh / maxKwh) * 168) }}
                />
                <div
                  className="w-[10px] bg-medGreen"
                  style={{ height: Math.max(3, (r.inverter_kwh / maxKwh) * 168) }}
                />
              </div>
              <p className="mt-1 text-center font-mono text-[8px] text-textMuted">
                {formatMonthShort(r.period_start).split(" ")[0]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-4 font-mono text-[9px] text-textMuted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-paleGreen" /> Expected (model)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-medGreen" /> Verified (inverter)
          </span>
        </div>
      </Page>

      {/* ── Page 4: Methodology ── */}
      <Page page={4} total={totalPages}>
        <Tag>Methodology</Tag>
        <h2 className="mt-1 font-heading text-[26px] italic text-darkBg">Verification Methodology</h2>

        <p className="mt-5 text-[12px] leading-relaxed">
          EcoXchange's proprietary verification engine reconciles three independent measurements
          of the same month of production. The inverter reports what the system generated; the
          utility meter reports what was delivered to the grid; and a physics model computes what
          the system should have produced given the weather that actually occurred. A month is
          VERIFIED only when all three sources agree within engineering tolerances — a
          disagreement flags the month for review instead of silently passing it through.
        </p>

        <Tag>Data Sources</Tag>
        <dl className="mt-2 max-w-md">
          <SpecRow label="Satellite Irradiance" value="NASA POWER" />
          <SpecRow label="Production" value="Inverter telemetry" />
          <SpecRow label="Delivery" value="Utility meter" />
        </dl>

        <Tag>Physics Model</Tag>
        <p className="mt-2 text-[12px] leading-relaxed">
          Expected generation is computed by pvlib ModelChain — the open-source photovoltaic
          modeling standard — using transposition of satellite-measured irradiance onto the
          array plane, temperature-dependent module performance, and the system's documented
          loss chain. Engine {ENGINE_VERSION}.
        </p>

        <Tag>Tolerance Bands</Tag>
        <dl className="mt-2 max-w-md">
          <SpecRow label="Inverter vs Expected" value="±15%" />
          <SpecRow label="Inverter vs Utility" value="±10%" />
          <SpecRow label="Utility vs Expected" value="±20%" />
        </dl>

        <Tag>Engine Configuration</Tag>
        <dl className="mt-2 max-w-md">
          <SpecRow label="Engine Version" value={`${ENGINE_VERSION} (pvlib ModelChain)`} />
          <SpecRow label="Verdict Basis" value="Three-source reconciliation" />
          <SpecRow label="Estimates" value="Methodology-documented" />
        </dl>

        {benchmarkData.validated ? (
          <>
            <Tag>Engine Validation</Tag>
            <p className="mt-2 text-[12px] leading-relaxed">
              The EcoXchange verification engine ({ENGINE_VERSION}) has been validated against
              the U.S. EIA-923 solar fleet dataset. Across{" "}
              {benchmarkData.plants_succeeded.toLocaleString("en-US")} utility-scale solar plants
              ({benchmarkData.benchmark_year} generation data), the engine achieves a mean
              absolute deviation of ±{benchmarkData.mean_absolute_deviation_pct.toFixed(1)}%
              between predicted and reported annual generation
              {targetSegmentMad !== null
                ? `; for plants in the 1–20 MW target segment, mean absolute deviation is ±${targetSegmentMad.toFixed(1)}%`
                : ""}
              . Irradiance source: {benchmarkData.irradiance_source}. Benchmarked{" "}
              {benchmarkData.benchmark_date}.
            </p>
          </>
        ) : null}
      </Page>

      {/* ── Page 5: Revenue Estimate (only when a PPA rate exists) ── */}
      {hasPpa ? (
        <Page page={5} total={totalPages}>
          <Tag>Revenue Estimate</Tag>
          <h2 className="mt-1 font-heading text-[26px] italic text-darkBg">Revenue Estimate</h2>
          <p className="mt-3 text-[12px] text-textMuted">
            Verified production × contracted PPA rate (${project.ppa_rate_per_kwh.toFixed(3)}/kWh).
            Forward years assume a 2.0% annual escalator. Estimates only — not a guarantee.
          </p>

          <table className="mt-5 w-full border-collapse">
            <thead>
              <tr className="bg-cream">
                {["Month", "Verified kWh", "Revenue", "Cumulative"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-paleGreen px-2 py-2 text-left font-mono text-[9px] uppercase tracking-[0.04em] text-textMuted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                cumulativeRevenue += r.estimated_revenue;
                return (
                  <tr key={r.period_start} className="border-b border-paleGreen/40">
                    <td className="px-2 py-1.5 font-mono text-[11px]">{formatMonthShort(r.period_start)}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{fmtInt(r.inverter_kwh)}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{formatUsd(r.estimated_revenue)}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px] tabular-nums">{formatUsd(cumulativeRevenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 bg-darkBg px-6 py-4">
            <p className="font-mono text-[22px] tabular-nums text-accentBrt">
              {formatUsd(summary.total_revenue_estimate)}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-paleGreen">
              Estimated annual revenue ({year})
            </p>
          </div>
        </Page>
      ) : null}

      {/* ── Final page: Disclaimers & Attribution ── */}
      <Page page={totalPages} total={totalPages}>
        <Tag>Disclaimers &amp; Data Attribution</Tag>
        <h2 className="mt-1 font-heading text-[26px] italic text-darkBg">Disclaimers</h2>

        <div className="mt-5 space-y-3">
          {disclaimers.blocks.map((block) => (
            <p key={block.slice(0, 32)} className="font-mono text-[9px] leading-[1.7] text-textMuted">
              {block}
            </p>
          ))}
          <p className="font-mono text-[9px] leading-[1.7] text-textMuted">
            All return and yield figures are {disclaimers.yieldBasis}. This report does not
            constitute investment advice, an offer to sell, or a solicitation of an offer to buy
            any security.
          </p>
        </div>

        <Tag>Data Attribution</Tag>
        <dl className="mt-2 max-w-md">
          <SpecRow label="NASA POWER" value={`Satellite irradiance · ${periodLabel}`} />
          <SpecRow label="Inverter Telemetry" value={`Production · ${periodLabel}`} />
          <SpecRow label="Utility Meter" value={`Delivery · ${periodLabel}`} />
        </dl>
        <p className="mt-3 font-mono text-[9px] text-medGreen">
          § Methodology-documented estimates · EcoXchange proprietary verification engine{" "}
          {ENGINE_VERSION} ·{" "}
          {dataSource === "live"
            ? `Expected generation computed by live engine ${ENGINE_VERSION} at report time`
            : "Expected generation from cached backtest data"}
        </p>

        <div className="mt-10 border-t border-paleGreen pt-3 font-mono text-[9px] text-textMuted">
          <p>Engine {ENGINE_VERSION} · Report generated {generatedAt.toISOString()}</p>
          <p className="mt-1">© {generatedAt.getFullYear()} EcoXchange, Inc. · ecoxchange.net</p>
        </div>
      </Page>
    </>
  );
}
