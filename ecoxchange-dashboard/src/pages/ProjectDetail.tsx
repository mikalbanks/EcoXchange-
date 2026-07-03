import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, LineChart } from "lucide-react";
import { useData } from "../context/DataContext.js";
import { ProductionChart } from "../components/ProductionChart.js";
import { StatCard } from "../components/StatCard.js";
import { AnimatedNumber } from "../components/shared/AnimatedNumber.js";
import { VerificationBadge } from "../components/VerificationBadge.js";
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
import { formatKwh, formatMonthLong, formatPct } from "../utils/formatters.js";
import type { ProjectBundle } from "../utils/types.js";

export function ProjectDetail() {
  const { id = "" } = useParams();
  const { getProject, scenario } = useData();
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );

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

  return (
    <div className="space-y-8 animate-fade-in">
      <BackLink />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-paleGreen/60 p-5">
          <h2 className="font-heading text-xl text-darkBg mb-3">
            Monthly Production
          </h2>
          <div key={scenario} className="animate-fade-in">
            <ProductionChart records={records} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-paleGreen/60 p-5 flex flex-col">
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
      </div>

      {/* Mobile: 2-col grid with the lead metric spanning the full first row. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="Annual Output"
            value={
              <AnimatedNumber
                value={summary.annual_production_mwh}
                format={(n) => `${Math.round(n).toLocaleString()} MWh`}
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
            />
          }
        />
        <StatCard
          label="Est. IRR"
          value={
            <AnimatedNumber value={estIrr} format={(n) => `~${n.toFixed(1)}%`} />
          }
          sublabel="modeled, illustrative"
        />
      </div>

      <div>
        <h2 className="font-heading text-xl text-darkBg mb-3">Monthly Yield</h2>
        <YieldTable projectId={project.id} records={records} />
      </div>
    </div>
  );
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
