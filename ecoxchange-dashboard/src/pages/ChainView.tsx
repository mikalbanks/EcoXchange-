import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SectionTag } from "../components/ui/SectionTag.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { LazyMount } from "../components/shared/LazyMount.js";
import {
  CardSkeleton,
  ChartSkeleton,
  Shimmer,
} from "../components/shared/LoadingState.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { AssetSummaryCard } from "../components/chain/AssetSummaryCard.js";
import { DistributionHistoryTable } from "../components/chain/DistributionHistoryTable.js";
import { VerificationLinkBadge } from "../components/chain/VerificationLinkBadge.js";
import { loadChainView } from "../data/chain.js";
import { ENGINE_VERSION } from "../config/engine.js";
import type { ChainView as ChainViewData } from "../types/chain.js";

// Recharts is a large chunk and this chart sits below the fold — same lazy
// treatment as ProductionChartLazy.
const HolderDistributionChart = lazy(() =>
  import("../components/chain/HolderDistributionChart.js").then((m) => ({
    default: m.HolderDistributionChart,
  })),
);

/**
 * Spec 18 § 2.8 — the on-chain view for one project. Supersedes Spec 08's
 * Base-Sepolia Smart Contract Explorer for anything Polymesh.
 *
 * Everything here is read from the public Polymesh ledger via the SubQuery
 * middleware and cached in Supabase. No wallet connection is requested, and
 * nothing on this page depends on a Polymath relationship — that is the point
 * of Layer A.
 *
 * Route is `/investor/project/:id/chain`, alongside the sibling
 * `verification/:period`, `yields` and `documents` routes. The spec names
 * `/project/:id/chain`; the existing `LegacyProjectRedirect` in App.tsx already
 * rewrites that to this path, so both work without a second route.
 */
export function ChainView() {
  const { id = "" } = useParams();
  const [data, setData] = useState<ChainViewData | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "notfound"
  >("loading");

  const load = useCallback(() => {
    setStatus("loading");
    setData(null);
    loadChainView(id)
      .then((res) => {
        if (!res) return setStatus("notfound");
        setData(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(load, [load]);

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
      <div className="space-y-4">
        <BackLink id={id} />
        <div>
          <SectionTag>On-Chain Record</SectionTag>
          <h1 className="font-heading text-3xl text-darkBg">No asset on chain</h1>
        </div>
        <p className="max-w-prose text-textMuted">
          This project has no Polymesh asset mapped to it yet. Once a security
          token is issued and the daily chain sync runs, its supply, holders and
          distribution history appear here — each payment linked to the month of
          verified production it settles.
        </p>
      </div>
    );
  }

  if (status === "loading" || !data) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-5 w-36" />
        <div className="space-y-2">
          <Shimmer className="h-9 w-96 max-w-full" />
          <Shimmer className="h-4 w-64" />
        </div>
        <CardSkeleton lines={5} />
        <ChartSkeleton />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  const { asset, holders, distributions, snapshotAt } = data;
  const unreconciled = distributions.filter(
    (d) => d.reconciliation_status !== "matched",
  );

  return (
    <div className="animate-fade-in space-y-8">
      <BackLink id={id} />

      <div>
        <SectionTag>On-Chain Record</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">
          {asset.ticker ?? asset.asset_id} on Polymesh
        </h1>
        <p className="mt-1 max-w-prose text-textMuted">
          Read directly from the public Polymesh ledger. Every distribution below
          is linked to the month of independently verified production it settles
          — both halves checkable without trusting EcoXchange.
        </p>
      </div>

      <AssetSummaryCard asset={asset} holderCount={holders.length} />

      <div>
        <SectionTag>Holder Concentration</SectionTag>
        <LazyMount placeholder={<ChartSkeleton />}>
          <Suspense fallback={<ChartSkeleton />}>
            <HolderDistributionChart holders={holders} snapshotAt={snapshotAt} />
          </Suspense>
        </LazyMount>
      </div>

      <div>
        <SectionTag>Distribution History</SectionTag>
        <DistributionHistoryTable
          distributions={distributions}
          network={asset.network}
          projectId={id}
        />
        <DataSourceAttribution
          sources={[
            { name: "Polymesh chain (SubQuery middleware)", type: "public_data" },
            { name: "EcoXchange verification engine", type: "model" },
          ]}
          engineVersion={ENGINE_VERSION}
        />
      </div>

      {unreconciled.length > 0 ? (
        <div>
          <SectionTag>Requires Attention</SectionTag>
          <p className="mb-3 max-w-prose text-sm text-textMuted">
            {unreconciled.length}{" "}
            {unreconciled.length === 1 ? "payment does" : "payments do"} not trace
            cleanly to a verified month. Shown in full rather than hidden — an
            unreconciled payment is the case this page exists to surface.
          </p>
          <div className="space-y-3">
            {unreconciled.map((d) => (
              <VerificationLinkBadge
                key={d.distribution_id}
                status={d.reconciliation_status}
                verification={d.verification}
                notes={d.reconciliation_notes}
                projectId={id}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <Link
      to={`/investor/project/${id}`}
      className="inline-flex items-center gap-1 text-medGreen transition-colors duration-150 hover:text-darkBg"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Project
    </Link>
  );
}
