import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useData } from "../../context/DataContext.js";
import { StatCard } from "../../components/StatCard.js";
import { AnimatedNumber } from "../../components/shared/AnimatedNumber.js";
import { YieldChart } from "../../components/investor/YieldChart.js";
import { YieldTable } from "../../components/YieldTable.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { EmptyState } from "../../components/shared/EmptyState.js";
import {
  CardSkeleton,
  ChartSkeleton,
  Shimmer,
  StatCardSkeleton,
  TableSkeleton,
} from "../../components/shared/LoadingState.js";
import { formatPct, formatUsd } from "../../utils/formatters.js";
import type { ProjectBundle } from "../../utils/types.js";

const INVESTOR_SHARE_PCT = 2.0;
const INVESTOR_TOTAL_INVESTED = 50_000;

export function YieldHistory() {
  const { id = "" } = useParams();
  const { getProject, scenario } = useData();
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );
  const [showDist, setShowDist] = useState(false);

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
        <BackLink id={id} />
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="space-y-6">
        <BackLink id={id} />
        <EmptyState
          title="No yield history yet"
          message="This project has no verified production periods to report yet."
        />
      </div>
    );
  }

  if (status === "loading" || !bundle) {
    return (
      <div className="space-y-8">
        <Shimmer className="h-5 w-36" />
        <Shimmer className="h-9 w-80 max-w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <TableSkeleton />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  const { project, verification_records: records } = bundle;
  const share = INVESTOR_SHARE_PCT / 100;
  const totalEarned = records.reduce((s, r) => s + r.estimated_revenue, 0) * share;
  const months = records.length || 1;
  const avgMonthly = totalEarned / months;
  const annualYieldPct = ((avgMonthly * 12) / INVESTOR_TOTAL_INVESTED) * 100;

  return (
    <div className="space-y-8 animate-fade-in">
      <BackLink id={id} />

      <div>
        <h1 className="font-heading text-3xl text-darkBg">Yield History</h1>
        <p className="text-textMuted mt-1">{project.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Earned"
          value={<AnimatedNumber value={totalEarned} format={(n) => formatUsd(n)} />}
          sublabel="USDC"
        />
        <StatCard
          label="Avg Monthly"
          value={<AnimatedNumber value={avgMonthly} format={(n) => formatUsd(n)} />}
          sublabel="USDC"
        />
        <StatCard
          label="Annual Yield"
          value={
            <AnimatedNumber
              value={annualYieldPct}
              format={(n) => `${n.toFixed(1)}%`}
            />
          }
          sublabel="illustrative"
        />
      </div>

      <div className="bg-white rounded-xl border border-paleGreen/60 p-5">
        <h2 className="font-heading text-xl text-darkBg mb-3">Cumulative Yield</h2>
        <YieldChart records={records} investorSharePct={INVESTOR_SHARE_PCT} />
      </div>

      <div>
        <h2 className="font-heading text-xl text-darkBg mb-3">Monthly Yield</h2>
        <YieldTable
          projectId={project.id}
          records={records}
          investorSharePct={INVESTOR_SHARE_PCT}
        />
      </div>

      <div className="bg-white rounded-xl border border-paleGreen/60 p-5">
        <button
          type="button"
          onClick={() => setShowDist((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-heading text-lg text-darkBg">
            Distribution Details
          </span>
          <ChevronDown
            className={`h-5 w-5 text-textMuted transition-transform duration-150 ${
              showDist ? "rotate-180" : ""
            }`}
          />
        </button>
        {showDist ? (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm animate-fade-in">
            <Detail label="Distribution method" value="USDC on Base L2" />
            <Detail label="Wallet" value="0x1234…5678" mono />
            <Detail
              label="Transaction hash"
              value="Pending blockchain setup"
            />
            <Detail
              label="Investor share"
              value={formatPct(INVESTOR_SHARE_PCT).replace("+", "")}
              mono
            />
          </dl>
        ) : null}
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

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-paleGreen/40 pb-2">
      <dt className="text-textMuted">{label}</dt>
      <dd className={`text-textDark ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
