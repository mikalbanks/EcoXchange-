import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useData } from "../context/DataContext.js";
import { ReconciliationDiagram } from "../components/ReconciliationDiagram.js";
import { FlagReasonCard } from "../components/verification/FlagReasonCard.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { VerificationBadge } from "../components/VerificationBadge.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { CardSkeleton, Shimmer } from "../components/shared/LoadingState.js";
import { formatMonthLong } from "../utils/formatters.js";
import { ENGINE_VERSION } from "../config/engine.js";
import {
  describeDeterminationConsequence,
  describeTransactionPolicy,
  describeVerificationEvidence,
} from "../data/index.js";
import type { ProjectMeta, VerificationRecord } from "../utils/types.js";

export function VerificationDetail() {
  const { id = "", period = "" } = useParams();
  const { getVerification, scenario, mode } = useData();

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
  const evidence = describeVerificationEvidence(id, mode, record);
  const transactionPolicy = describeTransactionPolicy(mode, scenario, id);
  const transactionConsequence = describeDeterminationConsequence(
    record.status,
    transactionPolicy,
  );

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
          <span className="text-sm text-textMuted">Engine determination:</span>
          <span
            key={`${scenario}-${record.status}`}
            className="inline-block animate-badge-pulse"
          >
            <VerificationBadge status={record.status} />
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-flagAmber/40 bg-amber-50 p-5" data-testid="verification-evidence-disclosure">
        <p className="text-xs font-semibold tracking-[0.14em] text-flagAmber">{evidence.badge}</p>
        <h2 className="mt-1 font-heading text-lg text-darkBg">{evidence.title}</h2>
        <p className="mt-1 max-w-3xl text-base leading-relaxed text-textMuted">{evidence.description}</p>
        <p className="mt-3 border-t border-flagAmber/20 pt-3 font-mono text-xs text-darkBg" data-testid="verification-transaction-consequence">
          Transaction consequence: {transactionConsequence}. {transactionPolicy.title}.
        </p>
      </div>

      <div>
        <ReconciliationDiagram
          record={record}
          animate
          showFlagReasons={record.status !== "flagged"}
          title={evidence.diagramTitle}
          sourceLabels={{
            inverter: evidence.sourceNames.inverter,
            utility: evidence.sourceNames.utility,
            expected: evidence.sourceNames.satellite,
          }}
        />
        <DataSourceAttribution
          sources={[
            { name: evidence.sourceNames.inverter, type: "inverter" },
            { name: evidence.sourceNames.utility, type: "utility" },
            { name: evidence.sourceNames.satellite, type: "satellite" },
          ]}
          engineVersion={ENGINE_VERSION}
        />
      </div>

      {record.status === "flagged" ? <FlagReasonCard record={record} /> : null}

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
            <dd className="text-textDark mt-1">{evidence.sourceNames.satellite}</dd>
          </div>
          <div>
            <dt className="text-textMuted">Engine Version</dt>
            <dd className="text-textDark mt-1 font-mono">{ENGINE_VERSION}</dd>
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
