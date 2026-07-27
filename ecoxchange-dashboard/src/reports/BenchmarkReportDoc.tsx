// One-page benchmark summary PDF (Spec 4.4) — the artifact taken into
// pitch meetings. Fixed A4 .pdf-page div for the shared html2canvas →
// jsPDF pipeline (src/reports/pdf.ts). Bars are plain styled divs, not
// Recharts SVG: html2canvas rasterizes divs far more reliably.

import benchmark from "../data/benchmark-results.json";
import { ENGINE_VERSION } from "../config/engine.js";

const pub = benchmark.publication;

const DISTRIBUTION = [
  { band: "±5%", rate: pub.within_5_pct_rate },
  { band: "±10%", rate: pub.within_10_pct_rate },
  { band: "±15%", rate: pub.within_15_pct_rate },
  { band: "±20%", rate: pub.within_20_pct_rate },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 border border-lightGreen/30 p-3 text-center">
      <div className="font-mono text-[22px] font-bold text-accentBrt">
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-paleGreen">
        {label}
      </div>
    </div>
  );
}

export function BenchmarkReportDoc() {
  return (
    <div
      className="pdf-page relative flex w-[794px] h-[1123px] flex-col bg-white px-14 py-12 text-textDark"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header band */}
      <div className="bg-darkBg px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-accentBrt" aria-hidden />
          <span className="font-heading text-lg italic text-cream">
            EcoXchange
          </span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
          § Engine Validation
        </p>
        <h1 className="font-heading text-[24px] italic text-cream">
          Verification Engine {ENGINE_VERSION} — EIA Fleet Benchmark
        </h1>
        <p className="mt-1 text-[11px] text-lightGreen">
          {benchmark.plants_succeeded.toLocaleString()} U.S. solar plants ·
          EIA-923 {benchmark.benchmark_year} reported generation · NASA POWER
          irradiance · Benchmarked {benchmark.benchmark_date}
        </p>
        <div className="mt-4 flex gap-3">
          <Stat
            value={`±${pub.mean_absolute_deviation_pct.toFixed(1)}%`}
            label="Mean deviation"
          />
          <Stat
            value={`${pub.within_10_pct_rate.toFixed(1)}%`}
            label="Within ±10%"
          />
          <Stat
            value={benchmark.plants_succeeded.toLocaleString()}
            label="Plants tested"
          />
          <Stat value="pvlib" label="ModelChain + NASA POWER" />
        </div>
      </div>

      {/* Distribution */}
      <h2 className="mt-6 font-heading text-[15px] italic text-darkBg">
        Accuracy Distribution (publication cohort, n=
        {pub.n.toLocaleString()})
      </h2>
      <div className="mt-2 space-y-2">
        {DISTRIBUTION.map((row) => (
          <div key={row.band} className="flex items-center gap-3">
            <span className="w-16 font-mono text-[10px] text-textMuted">
              Within {row.band}
            </span>
            <div className="h-4 flex-1 bg-paleGreen/40">
              <div
                className="h-full bg-medGreen"
                style={{ width: `${row.rate}%` }}
              />
            </div>
            <span className="w-12 text-right font-mono text-[10px] font-bold text-darkBg">
              {row.rate.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Target segment */}
      <div className="mt-6 border-l-4 border-accentBrt bg-paleGreen/20 p-4">
        <h2 className="font-heading text-[15px] italic text-darkBg">
          Target Segment: 1–20 MW
        </h2>
        <div className="mt-2 flex gap-8 font-mono text-[11px] text-textDark">
          {pub.by_capacity
            .filter((b) => b.bucket === "1–5 MW" || b.bucket === "5–20 MW")
            .map((b) => (
              <span key={b.bucket}>
                {b.bucket}: ±{b.mean_abs_deviation_pct?.toFixed(1)}% ·{" "}
                {b.count.toLocaleString()} plants
              </span>
            ))}
        </div>
        <p className="mt-2 text-[10.5px] text-textDark">
          In EcoXchange's origination range, the engine holds mean absolute
          deviation under ±10%.
        </p>
      </div>

      {/* State table */}
      <h2 className="mt-6 font-heading text-[15px] italic text-darkBg">
        Top States (publication cohort)
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1">
        {pub.by_state.map((s) => (
          <div
            key={s.state}
            className="flex items-baseline justify-between border-b border-paleGreen/60 py-1 font-mono text-[10px]"
          >
            <span
              className={
                ["NY", "IL", "MA", "GA"].includes(s.state)
                  ? "font-bold text-darkBg"
                  : "text-textMuted"
              }
            >
              {s.state}
              {["NY", "IL", "MA", "GA"].includes(s.state) ? " ★" : ""}
            </span>
            <span className="text-textDark">
              ±{s.mean_abs_deviation_pct.toFixed(1)}% · n={s.count}
            </span>
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div className="mt-6 bg-cream px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-olive">
          § Methodology
        </p>
        <p className="mt-1 font-mono text-[8.5px] leading-[1.7] text-darkBg">
          Engine: pvlib ModelChain {ENGINE_VERSION}, Perez transposition ·
          Irradiance: NASA POWER · Comparison: EIA-923 annual net generation
          (AC metered) · Assumptions: fixed-tilt 20°, azimuth 180°, 20% module
          efficiency, 14% system losses, 0.75%/yr degradation. Tracking plants
          show higher deviation under fixed-tilt assumptions (known
          limitation). Full fleet: ±
          {benchmark.mean_absolute_deviation_pct.toFixed(1)}% mean absolute
          deviation, {benchmark.within_10_pct_rate.toFixed(1)}% within ±10%.
        </p>
        <p className="mt-1 font-mono text-[8.5px] leading-[1.7] text-textMuted">
          {pub.rule}
        </p>
      </div>

      <div className="flex-1" />
      <div className="flex items-center justify-between border-t border-paleGreen pt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-textMuted">
        <span>EcoXchange · Engine Validation Summary</span>
        <span>Powered by EcoXchange Verification Engine {ENGINE_VERSION}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
