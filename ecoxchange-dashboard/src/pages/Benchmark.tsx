// EIA fleet benchmark presentation (Spec 4): the committed 5,065-plant
// EIA-923 validation as a visual proof point — hero stats, accuracy
// distribution, the 1–20 MW target-segment callout, state and capacity
// breakdowns, and a one-page PDF export for pitch meetings.
//
// Framing rules follow EngineBenchmark: headline cites the publication
// (healthy-fleet) cohort in absolute terms, full-fleet figures are always
// disclosed alongside, exclusions documented verbatim.

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import benchmark, { targetSegment } from "../data/benchmark.js";
import { StatCard } from "../components/StatCard.js";
import { AnimatedNumber } from "../components/shared/AnimatedNumber.js";
import { EngineBenchmark } from "../components/verification/EngineBenchmark.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { BenchmarkReportDoc } from "../reports/BenchmarkReportDoc.js";
import { ENGINE_VERSION } from "../config/engine.js";

const pub = benchmark.publication;

const DISTRIBUTION = [
  { band: "±5%", publication: pub.within_5_pct_rate, fleet: benchmark.within_5_pct_rate },
  { band: "±10%", publication: pub.within_10_pct_rate, fleet: benchmark.within_10_pct_rate },
  { band: "±15%", publication: pub.within_15_pct_rate, fleet: benchmark.within_15_pct_rate },
  { band: "±20%", publication: pub.within_20_pct_rate, fleet: benchmark.within_20_pct_rate },
];

const TARGET_SEGMENT = targetSegment();
const TARGET_BUCKETS = new Set(TARGET_SEGMENT.map((b) => b.bucket));

function DistributionBars() {
  return (
    <div className="space-y-4" data-testid="benchmark-distribution">
      {DISTRIBUTION.map((row) => (
        <div key={row.band}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-wide text-textMuted">
              Within {row.band}
            </span>
            <span className="font-mono text-sm font-bold text-darkBg tabular-nums">
              {row.publication.toFixed(1)}%
              <span className="ml-2 font-normal text-textMuted">
                (full fleet {row.fleet.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="relative h-6 w-full bg-paleGreen/30">
            <div
              className="absolute inset-y-0 left-0 bg-lightGreen/60"
              style={{ width: `${row.fleet}%` }}
              title={`Full fleet: ${row.fleet.toFixed(1)}%`}
            />
            <div
              className="absolute inset-y-0 left-0 bg-medGreen"
              style={{ width: `${row.publication}%` }}
              title={`Publication cohort: ${row.publication.toFixed(1)}%`}
            />
          </div>
        </div>
      ))}
      <p className="flex flex-wrap gap-4 font-mono text-[11px] text-textMuted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-medGreen" /> publication cohort (n=
          {pub.n.toLocaleString()})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-lightGreen/60" /> full fleet (n=
          {benchmark.plants_succeeded.toLocaleString()})
        </span>
      </p>
    </div>
  );
}

export function Benchmark() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const downloadPdf = async () => {
    if (generating) return;
    setGenerating(true);
    setProgress(null);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const pages = Array.from(
        docRef.current?.querySelectorAll<HTMLElement>(".pdf-page") ?? [],
      );
      const { downloadPdfFromPages } = await import("../reports/pdf.js");
      await downloadPdfFromPages(
        pages,
        `EcoXchange_Engine_Benchmark_${benchmark.benchmark_date}.pdf`,
        "a4",
        (done, total) => setProgress([done, total]),
      );
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  // Graceful state for a regenerated artifact that hasn't passed the gate.
  if (!benchmark.validated) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SectionTag>ENGINE VALIDATION</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">Fleet Benchmark</h1>
        <Card variant="flat" padding="spacious">
          <p className="font-mono text-sm text-darkBg">Benchmark pending.</p>
          <p className="mt-2 text-sm text-textMuted">
            The EIA-923 fleet validation for Engine {ENGINE_VERSION} has not
            completed its validation gate yet. Results appear here once the
            run passes.
          </p>
        </Card>
        <EngineBenchmark />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in" data-testid="benchmark-page">
      {/* ── Hero: dark stat band ─────────────────────────────────────── */}
      <section className="bg-darkBg px-5 py-8 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-olive">
          § INDEPENDENT ENGINE VALIDATION
        </p>
        <h1 className="mt-1 font-heading text-3xl text-cream">
          Verification Engine {ENGINE_VERSION} benchmark results
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-lightGreen">
          Modeled generation was compared with {benchmark.benchmark_year} EIA-923
          reported output for {benchmark.plants_succeeded.toLocaleString()} U.S.
          solar plants using NASA POWER irradiance inputs. Publication-cohort and
          full-fleet results are shown separately so exclusions remain visible.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              value: (
                <AnimatedNumber
                  value={benchmark.plants_succeeded}
                  format={(n) => Math.round(n).toLocaleString()}
                  startOnView
                />
              ),
              label: "Plants tested",
              sub: `${benchmark.success_rate_pct.toFixed(0)}% run success`,
            },
            {
              value: (
                <AnimatedNumber
                  value={pub.mean_absolute_deviation_pct}
                  format={(n) => `±${n.toFixed(1)}%`}
                  startOnView
                />
              ),
              label: "Publication-cohort mean absolute deviation",
              sub: `n=${pub.n.toLocaleString()}`,
            },
            {
              value: (
                <AnimatedNumber
                  value={benchmark.mean_absolute_deviation_pct}
                  format={(n) => `±${n.toFixed(1)}%`}
                  startOnView
                />
              ),
              label: "Full-fleet mean absolute deviation",
              sub: `n=${benchmark.plants_succeeded.toLocaleString()}`,
            },
            {
              value: (
                <AnimatedNumber
                  value={pub.within_10_pct_rate}
                  format={(n) => `${n.toFixed(1)}%`}
                  startOnView
                />
              ),
              label: "Publication cohort within ±10%",
              sub: `${pub.within_10_pct.toLocaleString()} plants`,
            },
          ].map((stat, i) => (
            <div key={i} className="border border-lightGreen/20 p-4">
              <div className="font-mono text-2xl font-bold text-accentBrt tabular-nums">
                {stat.value}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-paleGreen">
                {stat.label}
              </div>
              <div className="mt-0.5 text-[11px] text-lightGreen/80">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Target segment callout ───────────────────────────────────── */}
      <section>
        <SectionTag>TARGET SEGMENT</SectionTag>
        <Card
          variant="bordered"
          padding="spacious"
          className="border-l-4 !border-l-accentBrt"
        >
          <h2 className="font-heading text-2xl text-darkBg">
            Performance in EcoXchange's 1–20 MW target segment
          </h2>
          {/* Deliberately not animated. These two figures are the ones the
              acceptance criteria pin and the ones the exported PDF must match;
              a count-up renders them as ±0.0% until it completes. */}
          <div
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            data-testid="benchmark-target-segment"
          >
            {TARGET_SEGMENT.map((b) => (
              <StatCard
                key={b.bucket}
                label={b.bucket}
                value={`±${b.meanAbsDeviationPct.toFixed(1)}%`}
                sublabel={`mean absolute deviation · ${b.count.toLocaleString()} plants`}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-textDark">
            The publication-cohort benchmark produced mean absolute deviation of{" "}
            {TARGET_SEGMENT.map(
              (b) => `±${b.meanAbsDeviationPct.toFixed(1)}% for ${b.bucket}`,
            ).join(" plants and ")}{" "}
            plants. These results describe model-to-reported-generation
            agreement across the benchmark cohort; they are not a guarantee of
            accuracy for an individual project or month.
          </p>
        </Card>
      </section>

      {/* ── Accuracy distribution ────────────────────────────────────── */}
      <section>
        <SectionTag>ACCURACY DISTRIBUTION</SectionTag>
        <h2 className="font-heading text-2xl text-darkBg">
          Share of Plants Within Each Tolerance
        </h2>
        <Card variant="bordered" padding="spacious" className="mt-4">
          <DistributionBars />
        </Card>
      </section>

      {/* ── Capacity bucket table ────────────────────────────────────── */}
      <section>
        <SectionTag>BY PROJECT SIZE</SectionTag>
        <div className="mt-2 overflow-x-auto border border-paleGreen/60 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-paleGreen/40 text-xs uppercase text-textMuted">
              <tr>
                <th className="px-4 py-3 text-left">Bucket</th>
                <th className="px-4 py-3 text-right">Plants</th>
                <th className="px-4 py-3 text-right">Mean Abs Dev (publication)</th>
                <th className="px-4 py-3 text-right">Mean Abs Dev (full fleet)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paleGreen/40">
              {pub.by_capacity.map((b, i) => {
                const fleetRow = benchmark.by_capacity[i];
                const isTarget = TARGET_BUCKETS.has(b.bucket);
                return (
                  <tr
                    key={b.bucket}
                    className={isTarget ? "bg-accentBrt/10 font-medium" : ""}
                  >
                    <td className="px-4 py-3 text-textDark">
                      {b.bucket}
                      {isTarget ? (
                        <span className="ml-2 bg-accentBrt/30 px-1.5 py-0.5 font-mono text-[10px] uppercase text-darkBg">
                          target
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-textDark">
                      {b.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-textDark">
                      {b.mean_abs_deviation_pct != null
                        ? `±${b.mean_abs_deviation_pct.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-textMuted">
                      {fleetRow?.mean_abs_deviation_pct != null
                        ? `±${fleetRow.mean_abs_deviation_pct.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── State breakdown ──────────────────────────────────────────── */}
      <section>
        <SectionTag>BY STATE</SectionTag>
        <h2 className="font-heading text-2xl text-darkBg">
          Top 10 States (Publication Cohort)
        </h2>
        <Card variant="bordered" padding="standard" className="mt-4">
          <div className="space-y-2.5">
            {pub.by_state.map((s) => {
              const isTarget = ["NY", "IL", "MA", "GA"].includes(s.state);
              const width = Math.min(
                100,
                (s.mean_abs_deviation_pct / 15) * 100,
              );
              return (
                <div key={s.state} className="flex items-center gap-3">
                  <span
                    className={`w-9 font-mono text-xs ${
                      isTarget
                        ? "font-bold text-darkBg"
                        : "text-textMuted"
                    }`}
                  >
                    {s.state}
                    {isTarget ? "★" : ""}
                  </span>
                  <div className="h-4 flex-1 bg-paleGreen/30">
                    <div
                      className={`h-full ${isTarget ? "bg-accentBrt" : "bg-medGreen/70"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-darkBg tabular-nums">
                    ±{s.mean_abs_deviation_pct.toFixed(1)}% · n=
                    {s.count}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[11px] text-textMuted">
            ★ EcoXchange target states (NY, IL, MA, GA) · shorter bar = lower
            deviation
          </p>
        </Card>
      </section>

      {/* ── Assumptions and known limitations ────────────────────────── */}
      <section>
        <div className="bg-cream px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-olive">
            § METHODOLOGY, ASSUMPTIONS, AND LIMITATIONS
          </p>
          <div className="mt-2 space-y-1.5 font-mono text-xs leading-relaxed text-darkBg">
            <p>
              Engine: pvlib ModelChain {ENGINE_VERSION} with Perez
              transposition · Irradiance: NASA POWER satellite data ·
              Comparison: EIA-923 annual net generation (AC metered),{" "}
              {benchmark.benchmark_year}.
            </p>
            <p>
              Assumptions: fixed-tilt default (20°), 180° azimuth, 20% module
              efficiency, 14% system losses, 0.75%/yr degradation. Plants with
              single-axis tracking show higher deviation under fixed-tilt
              assumptions — a known limitation of the fleet-wide approach.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cohort exclusions ────────────────────────────────────────── */}
      <section>
        <SectionTag>COHORT EXCLUSIONS</SectionTag>
        <Card variant="bordered" padding="spacious" className="mt-4">
          <p className="text-sm text-textDark">
            Publication-cohort results exclude documented high-curtailment and
            severe-underperformance cases under the stated rules. Full-fleet
            results remain displayed alongside the publication cohort. Users
            should consider both views.
          </p>
          <p className="mt-3 font-mono text-xs leading-relaxed text-darkBg">
            {pub.rule}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-4">
            {[
              ["Excluded, total", pub.excluded_total],
              ["Curtailment state", pub.excluded_curtailment_state],
              ["Severe underperformer", pub.excluded_underperformer],
              ["Both reasons", pub.excluded_both],
            ].map(([label, count]) => (
              <div key={label as string}>
                <dt className="uppercase tracking-wide text-textMuted">
                  {label}
                </dt>
                <dd className="mt-0.5 tabular-nums text-darkBg">
                  {(count as number).toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      {/* ── Export + version ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="md"
            loading={generating}
            onClick={() => void downloadPdf()}
            data-testid="benchmark-pdf-download"
          >
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Download benchmark report
            </span>
          </Button>
          <a
            href="/benchmark-results.json"
            download={`EcoXchange_Benchmark_${benchmark.benchmark_date}.json`}
            className="font-mono text-xs font-medium uppercase tracking-wide text-medGreen underline-offset-2 hover:underline"
          >
            Download result data and exclusions →
          </a>
          <a
            href="https://www.ecoxchange.net/verification"
            className="font-mono text-xs font-medium uppercase tracking-wide text-medGreen underline-offset-2 hover:underline"
          >
            Review engine methodology →
          </a>
          {generating ? (
            <p
              className="font-mono text-[11px] text-textMuted"
              aria-live="polite"
              data-testid="benchmark-pdf-progress"
            >
              {progress
                ? `Rendering page ${progress[0]} of ${progress[1]}…`
                : "Preparing report…"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">
            Engine {ENGINE_VERSION} · benchmarked {benchmark.benchmark_date} ·{" "}
            {benchmark.data_source}
          </p>
          <div className="flex-1 min-w-[280px]">
            <EngineBenchmark />
          </div>
        </div>
      </section>

      {/* Offscreen PDF pages — mounted only while generating. */}
      {generating ? (
        <div
          ref={docRef}
          className="fixed top-0 left-[-2000px] z-[-1]"
          aria-hidden
        >
          <BenchmarkReportDoc />
        </div>
      ) : null}
    </div>
  );
}
