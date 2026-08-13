import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Link2, LineChart } from "lucide-react";
import { CHAIN_VIEW_ENABLED } from "../config/chain-view.js";
import { useData } from "../context/DataContext.js";
import { ProductionChartLazy as ProductionChart } from "../components/ProductionChartLazy.js";
import { StatCard } from "../components/StatCard.js";
import { AnimatedNumber } from "../components/shared/AnimatedNumber.js";
import { VerificationBadge } from "../components/VerificationBadge.js";
import { VerificationTimeline } from "../components/verification/VerificationTimeline.js";
import { FlagReasonCard } from "../components/verification/FlagReasonCard.js";
import { ReconciliationDiagram } from "../components/ReconciliationDiagram.js";
import { YieldTable } from "../components/YieldTable.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import {
  CardSkeleton,
  ChartSkeleton,
  Shimmer,
  StatCardSkeleton,
  TableSkeleton,
} from "../components/shared/LoadingState.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { ProjectionDisclosure } from "../compliance/components/ProjectionDisclosure.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { ProjectMap } from "../components/offering/ProjectMap.js";
import { LiveProductionMeter } from "../components/production/LiveProductionMeter.js";
import { nextDistributionDate } from "../utils/distributions-summary.js";
import { formatKwh, formatMonthLong, formatPct } from "../utils/formatters.js";
import { VerificationReportTemplate } from "../reports/VerificationReportTemplate.js";
import { useEngineData } from "../hooks/useEngineData.js";
import { engineParamsForProject, mergeEngineExpected } from "../utils/engine-params.js";
import type { ProjectBundle, VerificationRecord } from "../utils/types.js";

type ProjectTab = "overview" | "production" | "verification" | "documents";

const TABS: Array<{ id: ProjectTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "production", label: "Production" },
  { id: "verification", label: "Verification" },
  { id: "documents", label: "Documents" },
];

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { getProject, scenario } = useData();
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [tab, setTab] = useState<ProjectTab>("overview");
  // Month picked on the verification timeline; expands the reconciliation
  // diagram (and flag card when flagged) inline below the timeline.
  const [selectedVerification, setSelectedVerification] =
    useState<VerificationRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );
  const [generatingReport, setGeneratingReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Live pvlib engine: when VITE_ENGINE_URL is configured and the service
  // answers, overlay its expected-generation series onto the seed records.
  // Unconfigured or unreachable → displayRecords === seed records unchanged.
  const engineParams = useMemo(
    () =>
      bundle
        ? engineParamsForProject(bundle.project, bundle.verification_records)
        : null,
    [bundle],
  );
  const { data: engineData, isFromEngine } = useEngineData(engineParams);
  const displayRecords = useMemo(
    () =>
      bundle && engineData
        ? mergeEngineExpected(bundle.verification_records, engineData)
        : bundle?.verification_records ?? [],
    [bundle, engineData],
  );

  const downloadReport = async () => {
    if (!bundle || generatingReport) return;
    setGeneratingReport(true);
    try {
      // Let the offscreen template mount and lay out before capture.
      await new Promise((r) => setTimeout(r, 80));
      const pages = Array.from(
        reportRef.current?.querySelectorAll<HTMLElement>(".pdf-page") ?? [],
      );
      const { downloadPdfFromPages, slugForFilename } = await import("../reports/pdf.js");
      const year = bundle.verification_records[0]?.period_start.slice(0, 4) ?? "";
      await downloadPdfFromPages(
        pages,
        `EcoXchange_Verification_Report_${slugForFilename(bundle.project.name)}_${year}.pdf`,
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  const load = useCallback(() => {
    setStatus("loading");
    setBundle(null);
    getProject(id)
      .then((res) => {
        if (!res) return setStatus("empty");
        setBundle(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [getProject, id]);

  useEffect(load, [load, scenario]);

  if (status === "error") {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          title="Project not found"
          message="We couldn’t find this project in your portfolio."
          cta={{ label: "Back to Portfolio", to: "/investor" }}
        />
      </div>
    );
  }

  if (status === "loading" || !bundle) {
    return (
      <div className="space-y-8">
        <Shimmer className="h-5 w-36" />
        <div className="space-y-2">
          <Shimmer className="h-9 w-80" />
          <Shimmer className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <CardSkeleton lines={5} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <StatCardSkeleton />
          </div>
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  const { project, verification_records: records, summary } = bundle;
  const latest = records[records.length - 1];
  const estIrr = ((summary.total_revenue_estimate * 0.6) / 50_000_000) * 100; // rough placeholder

  const nextDist = new Date(`${nextDistributionDate()}T00:00:00`);
  const daysToDist = Math.max(
    0,
    Math.ceil((nextDist.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <BackLink />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <SectionTag>Project Detail</SectionTag>
          <h1 className="font-heading text-3xl text-darkBg">{project.name}</h1>
          <p className="text-textMuted mt-1">
            {project.location} · {project.capacity_kw.toLocaleString()} kW DC ·{" "}
            {project.tilt_deg}° tilt ·{" "}
            <span className="capitalize">
              {project.offtake_type.replace("_", " ")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <Link
            to={`/investor/project/${project.id}/yields`}
            className="inline-flex items-center gap-1.5 rounded-md border border-paleGreen/60 bg-white px-3 py-2 text-sm font-medium text-medGreen hover:bg-cream transition-colors duration-150"
          >
            <LineChart className="h-4 w-4" /> Yield History
          </Link>
          <Link
            to={`/investor/project/${project.id}/documents`}
            className="inline-flex items-center gap-1.5 rounded-md border border-paleGreen/60 bg-white px-3 py-2 text-sm font-medium text-medGreen hover:bg-cream transition-colors duration-150"
          >
            <FileText className="h-4 w-4" /> Documents
          </Link>
          {/* Spec 18 § 2.8 — on-chain record, linked from the verification
              surface. Hidden when the route is not registered; a visible link to
              an unregistered route is just a 404. */}
          {CHAIN_VIEW_ENABLED ? (
          <Link
            to={`/investor/project/${project.id}/chain`}
            className="inline-flex items-center gap-1.5 rounded-md border border-paleGreen/60 bg-white px-3 py-2 text-sm font-medium text-medGreen hover:bg-cream transition-colors duration-150"
          >
            <Link2 className="h-4 w-4" /> On-Chain
          </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void downloadReport()}
            disabled={generatingReport}
            data-testid="download-report"
            className="inline-flex items-center gap-1.5 rounded-md border border-paleGreen/60 bg-white px-3 py-2 text-sm font-medium text-medGreen hover:bg-cream transition-colors duration-150 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {generatingReport ? "Generating…" : "Download Report"}
          </button>
        </div>
      </div>

      {/* Offscreen A4 pages for the PDF pipeline — mounted only while generating. */}
      {generatingReport ? (
        <div ref={reportRef} className="fixed top-0 left-[-2000px] z-[-1]" aria-hidden>
          <VerificationReportTemplate
            project={project}
            records={displayRecords}
            summary={summary}
            generatedAt={new Date()}
            dataSource={isFromEngine ? "live" : "cached"}
          />
        </div>
      ) : null}

      {/* Tabbed sections (Spec 03 §5.2) — client-side, no route change. */}
      <div
        role="tablist"
        aria-label="Project sections"
        className="flex gap-1 overflow-x-auto border-b border-darkBg/10"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] whitespace-nowrap px-4 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
              tab === t.id
                ? "border-b-2 border-accentBrt text-darkBg"
                : "text-textMuted hover:text-darkBg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          {/* Next-distribution countdown */}
          <div className="inline-flex items-center gap-2 border border-paleGreen bg-paleGreen/30 px-4 py-2 font-mono text-xs text-darkBg">
            <span aria-hidden className="h-2 w-2 rounded-full bg-accentBrt animate-pulse" />
            Next distribution in {daysToDist} day{daysToDist === 1 ? "" : "s"} ·{" "}
            {nextDist.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>

          {/* Live production gauge (simulated; differentiation spec §2) */}
          <LiveProductionMeter
            projectName={project.name}
            latitude={project.latitude}
            longitude={project.longitude}
            capacityKw={project.capacity_kw}
            monthlyKwh={latest?.inverter_kwh ?? 0}
          />

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="col-span-2 sm:col-span-1">
              <StatCard
                label="Annual Output"
                value={
                  <AnimatedNumber
                    value={summary.annual_production_mwh}
                    format={(n) => `${Math.round(n).toLocaleString()} MWh`}
                    startOnView
                  />
                }
              />
            </div>
            <StatCard
              label="Capacity Factor"
              value={
                <AnimatedNumber
                  value={summary.capacity_factor_pct}
                  format={(n) => `${n.toFixed(1)}%`}
                  startOnView
                />
              }
            />
            <StatCard
              label="Est. IRR"
              value={
                <ProjectionDisclosure context="Modeled from backtest production and placeholder capital assumptions">
                  <AnimatedNumber value={estIrr} format={(n) => `~${n.toFixed(1)}%`} startOnView />
                </ProjectionDisclosure>
              }
              sublabel="modeled, illustrative"
            />
          </div>

          {/* System specifications (mono) + location mini-map */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-paleGreen/60 bg-white p-5">
              <SectionTag>System Specifications</SectionTag>
              <dl className="mt-2 space-y-2 font-mono text-xs">
                <SpecRow label="DC Capacity" value={`${project.capacity_kw.toLocaleString()} kW`} />
                <SpecRow label="Tilt / Azimuth" value={`${project.tilt_deg}° / ${project.azimuth_deg}°`} />
                <SpecRow label="Module Efficiency" value={`${(project.module_efficiency * 100).toFixed(0)}%`} />
                <SpecRow label="System Losses" value={`${(project.system_losses * 100).toFixed(0)}%`} />
                <SpecRow label="Commissioned" value={project.commissioning_date} />
                <SpecRow label="PPA Rate" value={`$${project.ppa_rate_per_kwh.toFixed(3)}/kWh`} />
                <SpecRow
                  label="Coordinates"
                  value={`${project.latitude.toFixed(3)}, ${project.longitude.toFixed(3)}`}
                />
              </dl>
            </div>
            <div>
              <ProjectMap
                latitude={project.latitude}
                longitude={project.longitude}
                label={project.name}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="rounded-xl border border-paleGreen/60 bg-white p-5">
          <SectionTag>Documents</SectionTag>
          <p className="mt-1 text-sm text-textMuted">
            Offering documents, verification reports, and statements for this
            project live in the document vault.
          </p>
          <Link
            to={`/investor/project/${project.id}/documents`}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 font-medium text-medGreen hover:text-darkBg"
          >
            <FileText className="h-4 w-4" /> Open document vault →
          </Link>
        </div>
      )}

      {tab === "production" && (
        <div className="bg-white rounded-xl border border-paleGreen/60 p-5">
          <SectionTag>Production</SectionTag>
          <h2 className="font-heading text-xl text-darkBg mb-3">
            Monthly Production
          </h2>
          <div key={scenario} className="animate-fade-in">
            <ProductionChart records={displayRecords} />
            <DataSourceAttribution
              sources={[
                { name: "NASA POWER", type: "satellite", dateRange: "Jan–Dec 2024" },
                { name: "EcoXchange Verification Engine", type: "model" },
              ]}
              isEstimate
              sourceMode={isFromEngine ? "live" : "cached"}
            />
          </div>
        </div>
      )}

      {tab === "verification" && (
        <div className="space-y-6">
          {/* 12-month verification timeline (Spec 3) with click-to-expand */}
          <div className="bg-white rounded-xl border border-paleGreen/60 p-5">
            <SectionTag>Verification History</SectionTag>
            <p className="mb-4 text-sm text-textMuted">
              Click a month to open its three-source reconciliation.
            </p>
            <VerificationTimeline
              records={displayRecords}
              selectedPeriod={selectedVerification?.period_start ?? null}
              onSelect={(r) =>
                setSelectedVerification((prev) =>
                  prev?.period_start === r.period_start ? null : r,
                )
              }
            />
          </div>

          {selectedVerification ? (
            <div key={selectedVerification.period_start} className="space-y-4">
              <ReconciliationDiagram
                record={selectedVerification}
                animate
                showFlagReasons={selectedVerification.status !== "flagged"}
              />
              {selectedVerification.status === "flagged" ? (
                <FlagReasonCard record={selectedVerification} />
              ) : null}
            </div>
          ) : null}

          <VerificationLatestCard />
        </div>
      )}

      {tab === "production" && (
        <div>
          <h2 className="font-heading text-xl text-darkBg mb-3">Monthly Distributions</h2>
          <YieldTable projectId={project.id} records={records} />
        </div>
      )}
    </div>
  );

  function VerificationLatestCard() {
    return (
        <div className="bg-white rounded-xl border border-paleGreen/60 p-5 flex flex-col lg:max-w-md">
          <div className="text-xs uppercase tracking-wide text-textMuted">
            Most recent verification
          </div>
          <div className="mt-1 text-textDark">
            {formatMonthLong(latest.period_start)}
          </div>
          <div className="mt-2">
            <span key={`${scenario}-${latest.status}`} className="inline-block animate-badge-pulse">
              <VerificationBadge
                status={latest.status}
                deviations={{
                  inv_vs_expected_pct: latest.inv_vs_expected_pct,
                  inv_vs_utility_pct: latest.inv_vs_utility_pct,
                  util_vs_expected_pct: latest.util_vs_expected_pct,
                }}
              />
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Inverter" value={formatKwh(latest.inverter_kwh)} />
            <Row
              label="Utility"
              value={
                latest.utility_kwh !== null
                  ? formatKwh(latest.utility_kwh)
                  : "—"
              }
            />
            <Row label="Expected" value={formatKwh(latest.expected_kwh)} />
            <Row
              label="Deviation"
              value={formatPct(latest.inv_vs_expected_pct)}
            />
            <Row label="Tolerance" value="±15%" />
          </dl>
          <Link
            to={`/investor/project/${project.id}/verification/${latest.period_start}`}
            className="mt-4 text-medGreen hover:text-darkBg font-medium text-sm transition-colors duration-150"
          >
            Open verification detail →
          </Link>
        </div>
    );
  }
}

function BackLink() {
  return (
    <Link
      to="/investor"
      className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg transition-colors duration-150"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Portfolio
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-textDark">
      <dt className="text-textMuted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-darkBg/5 pb-2 last:border-0 last:pb-0">
      <dt className="uppercase tracking-wide text-textMuted">{label}</dt>
      <dd className="tabular-nums text-textDark">{value}</dd>
    </div>
  );
}
