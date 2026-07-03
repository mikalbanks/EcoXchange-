import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useData } from "../context/DataContext.js";
import { ReconciliationDiagram } from "../components/ReconciliationDiagram.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { VerificationBadge } from "../components/VerificationBadge.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { CardSkeleton, Shimmer } from "../components/shared/LoadingState.js";
import { formatMonthLong } from "../utils/formatters.js";
import type { ProjectMeta, VerificationRecord } from "../utils/types.js";

export function VerificationDetail() {
  const { id = "", period = "" } = useParams();
  const { getVerification, scenario } = useData();

  const [state, setState] = useState<{
    project: ProjectMeta;
    record: VerificationRecord;
  } | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "notfound"
  >("loading");

  const load = useCallback(() => {
    setStatus("loading");
    setState(null);
    getVerification(id, period)
      .then((res) => {
        if (!res) return setStatus("notfound");
        setState(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [getVerification, id, period]);

  useEffect(load, [load, scenario]);

  if (status === "error") {
    return (
      <div className="space-y-6">
        <BackLink id={id} />
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div>
        <BackLink id={id} />
        <p className="mt-4 text-textMuted">
          No verification record for {period}.
        </p>
      </div>
    );
  }

  if (status === "loading" || !state) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-5 w-36" />
        <div className="space-y-2">
          <Shimmer className="h-9 w-96 max-w-full" />
          <Shimmer className="h-4 w-64" />
        </div>
        <CardSkeleton lines={6} />
        <CardSkeleton lines={2} />
      </div>
    );
  }

  const { project, record } = state;

  return (
    <div className="space-y-6 animate-fade-in">
      <BackLink id={id} />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-darkBg">
            Verification Detail: {formatMonthLong(record.period_start)}
          </h1>
          <p className="text-textMuted mt-1">{project.name}</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <span className="text-sm text-textMuted">Verdict:</span>
          <span
            key={`${scenario}-${record.status}`}
            className="inline-block animate-badge-pulse"
          >
            <VerificationBadge status={record.status} />
          </span>
        </div>
      </div>

      <div>
        <ReconciliationDiagram record={record} />
        <DataSourceAttribution
          sources={[
            { name: "Inverter Telemetry", type: "inverter" },
            { name: "Utility Meter", type: "utility" },
            { name: "NASA POWER", type: "satellite" },
          ]}
          engineVersion="v2.0.0"
        />
      </div>

      <div className="bg-white rounded-xl border border-paleGreen/60 p-5">
        <h2 className="font-heading text-lg text-darkBg mb-3">Irradiance Data</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-textMuted">Monthly GHI</dt>
            <dd className="text-textDark mt-1 font-mono">
              {record.ghi_kwh_m2 !== undefined
                ? `${record.ghi_kwh_m2.toFixed(1)} kWh/m²`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-textMuted">Source</dt>
            <dd className="text-textDark mt-1">NASA POWER</dd>
          </div>
          <div>
            <dt className="text-textMuted">Engine Version</dt>
            <dd className="text-textDark mt-1 font-mono">0.1.0</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      to={`/investor/project/${id}`}
      className="inline-flex items-center gap-1 text-medGreen hover:text-darkBg transition-colors duration-150"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Project
    </Link>
  );
}
