import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";
import { StatCard } from "../components/StatCard.js";
import { ProjectCard } from "../components/ProjectCard.js";
import { PortfolioDistributions } from "../components/distributions/PortfolioDistributions.js";
import { AnimatedNumber } from "../components/shared/AnimatedNumber.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import {
  ProjectCardSkeleton,
  Shimmer,
  StatCardSkeleton,
} from "../components/shared/LoadingState.js";
import { SwipeActionRow } from "../components/shared/SwipeActionRow.js";
import { SolarParticles } from "../components/ambient/SolarParticles.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { LazyMount } from "../components/shared/LazyMount.js";
import { PipelineMap } from "../components/map/PipelineMap.js";
import { MapSkeleton } from "../components/shared/LoadingState.js";
import { DataSourceAttribution } from "../compliance/components/DataSourceAttribution.js";
import { useData } from "../context/DataContext.js";
import { useAuth } from "../context/AuthContext.js";
import { useIsMobile, useIsTablet } from "../hooks/useMediaQuery.js";
import { usePullToRefresh } from "../hooks/usePullToRefresh.js";
import { DeterminationCard } from "../components/verification/DeterminationCard.js";
import { ChainHeartbeat } from "../components/web3/ChainHeartbeat.js";
import type {
  Portfolio as PortfolioData,
  VerificationRecord,
} from "../utils/types.js";
import { formatMonthLong, formatUsd } from "../utils/formatters.js";

// Recharts stays out of the initial Portfolio render path: the donut only
// loads (and its chunk only downloads) once the section scrolls into view.
const OwnershipVisualization = lazy(() =>
  import("../components/token/OwnershipVisualization.js").then((m) => ({
    default: m.OwnershipVisualization,
  })),
);

export function Portfolio() {
  const { getPortfolio, getVerification, scenario, mode } = useData();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [latest, setLatest] = useState<VerificationRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setStatus("loading");
        setData(null);
      }
      return getPortfolio()
        .then(async (res) => {
          setData(res);
          setStatus("ready");
          // The determination card needs the record itself, not just the
          // status chip the portfolio summary carries. Failing to load it
          // degrades to the summary — it must never blank the dashboard.
          const primary = res.projects[0];
          if (!primary?.latest_period) return setLatest(null);
          const found = await getVerification(
            primary.id,
            primary.latest_period,
          ).catch(() => null);
          setLatest(found?.record ?? null);
        })
        .catch(() => setStatus("error"));
    },
    [getPortfolio, getVerification],
  );

  useEffect(() => {
    void load();
  }, [load, scenario]);

  const refresh = useCallback(() => load({ silent: true }), [load]);
  // Pull-to-refresh only where a re-fetch means anything: live Supabase mode
  // on a mobile viewport (demo JSON is static).
  const { containerRef, pullPx, refreshing } = usePullToRefresh({
    enabled: mode === "supabase" && isMobile,
    onRefresh: refresh,
  });

  if (status === "error") {
    return <ErrorState onRetry={load} />;
  }

  if (status === "loading" || !data) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Shimmer className="h-9 w-72" />
          <Shimmer className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ProjectCardSkeleton />
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];
  const verifiedMonthMwh =
    latest && latest.status === "verified" ? latest.inverter_kwh / 1000 : null;
  const ytdMwh = data.projects.reduce((s, p) => s + p.ytd_production_mwh, 0);
  const distributionStatus =
    latest?.status === "verified"
      ? "Eligible"
      : latest?.status === "flagged"
        ? "On hold"
        : "Pending";

  return (
    <div ref={containerRef} className="relative space-y-8 animate-fade-in">
      {/* Pull-to-refresh indicator (live mode, mobile only) */}
      {(pullPx > 0 || refreshing) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-2 z-10 flex justify-center"
          style={{ transform: `translateY(${pullPx}px)` }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-paleGreen bg-white shadow-md">
            <Leaf
              className={`h-5 w-5 text-medGreen ${refreshing ? "animate-spin" : ""}`}
              style={refreshing ? undefined : { transform: `rotate(${pullPx * 2}deg)` }}
            />
          </span>
        </div>
      )}
      {/* Hero band: organic gradient mesh + ambient solar particles (Spec 03).
          Particle density scales with viewport: 30 desktop / 12 tablet / 0 mobile. */}
      <section className="hero-gradient relative overflow-hidden border border-darkBg/5 p-5 sm:p-8">
        <SolarParticles
          count={isMobile ? 0 : isTablet ? 12 : 30}
          color="#76C945"
          minSize={1}
          maxSize={3}
          speed={0.3}
          direction="up"
          opacity={0.2}
          connectDistance={100}
        />
        <div className="relative">
          <SectionTag>Your Verified Solar Portfolio</SectionTag>
          <h1 className="font-heading text-3xl text-darkBg">
            Good to see you, {firstName}.
          </h1>
          <p className="text-textMuted mt-1">
            Independent monthly production verification for your U.S.
            solar-project interests · {data.portfolio.active_projects} active
            project{data.portfolio.active_projects === 1 ? "" : "s"}
          </p>

          {/* Production and the determination lead. Money follows, because the
              determination is what releases it — see the Distributions section
              below for the amounts. */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Verified Production"
              value={
                verifiedMonthMwh != null ? (
                  <AnimatedNumber
                    value={verifiedMonthMwh}
                    format={(n) => `${n.toFixed(1)} MWh`}
                    startOnView
                  />
                ) : (
                  "—"
                )
              }
              sublabel={latest ? formatMonthLong(latest.period_start) : undefined}
            />
            <StatCard
              label="YTD Verified Production"
              value={
                <AnimatedNumber
                  value={ytdMwh}
                  format={(n) => `${n.toFixed(1)} MWh`}
                  startOnView
                />
              }
            />
            <StatCard
              label="Distribution Status"
              value={distributionStatus}
              sublabel={latest ? formatMonthLong(latest.period_start) : undefined}
            />
            <StatCard
              label="Project Interest"
              value={
                <AnimatedNumber
                  value={data.portfolio.total_invested}
                  format={(n) => formatUsd(n)}
                  startOnView
                />
              }
              sublabel="invested"
            />
          </div>
        </div>
      </section>

      {latest ? (
        <DeterminationCard
          projectId={data.projects[0]!.id}
          record={latest}
        />
      ) : null}

      <Link
        to="/investor/impact"
        className="flex items-center justify-between rounded-xl border border-paleGreen/60 bg-paleGreen/30 px-6 py-4 transition-colors duration-150 hover:bg-paleGreen/50"
      >
        <span className="flex items-center gap-3">
          <Leaf className="h-5 w-5 text-medGreen" />
          <span>
            <span className="block font-medium text-darkBg">
              Environmental impact calculated from verified production
            </span>
            <span className="text-sm text-textMuted">
              CO₂ avoided and equivalent-impact estimates are calculated only from
              production periods that have completed verification.
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 text-medGreen" />
      </Link>

      {data.projects.length === 0 ? (
        <EmptyState
          title="No investments yet"
          message="When you subscribe to an offering, your projects will appear here."
          cta={{ label: "Browse Available Projects", to: "/investor/marketplace" }}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <SectionTag>Active Projects</SectionTag>
            <h2 className="font-heading text-xl text-darkBg">Your Projects</h2>
          </div>
          {data.projects.map((p) => (
            <SwipeActionRow
              key={p.id}
              action={
                <Link
                  to={`/investor/project/${p.id}/verification/${p.latest_period}`}
                  className="flex w-full items-center justify-center bg-medGreen px-2 text-center text-xs font-medium uppercase tracking-wide text-white"
                >
                  View Verification
                </Link>
              }
            >
              <ProjectCard project={p} />
            </SwipeActionRow>
          ))}
        </div>
      )}

      <PortfolioDistributions />

      {/* Ownership administration (differentiation spec §4). Collapsed, because
          the digital record is plumbing for the interest described in the
          offering documents — not the investment, and not the headline.
          Recharts stays below-fold either way. */}
      <section className="space-y-3">
        <details className="rounded-xl border border-paleGreen/60 bg-white px-5 py-4">
          <summary className="cursor-pointer font-heading text-xl text-darkBg">
            Ownership record details
          </summary>
          <p className="mt-3 max-w-3xl text-sm text-textMuted">
            Your investment is the project-entity interest described in your
            subscription and operating documents. The permissioned digital record
            shown below supports ownership administration.
          </p>
          <div className="mt-4">
            <LazyMount placeholder={<Shimmer className="h-72 w-full" />}>
              <Suspense fallback={<Shimmer className="h-72 w-full" />}>
                <OwnershipVisualization />
              </Suspense>
            </LazyMount>
          </div>
          <div className="mt-4 border-t border-paleGreen/60 pt-3">
            <ChainHeartbeat />
          </div>
        </details>
      </section>

      {/* Pipeline & target markets map (differentiation spec §1). */}
      <section className="space-y-3">
        <div>
          <SectionTag>Pipeline &amp; Target Markets</SectionTag>
          <h2 className="font-heading text-xl text-darkBg">Where We Deploy</h2>
          <p className="mt-1 text-sm text-textMuted">
            EcoXchange focuses on high-yield state programs with long-term contracted
            revenue
          </p>
        </div>
        <LazyMount placeholder={<MapSkeleton />}>
          <PipelineMap />
        </LazyMount>
        <DataSourceAttribution
          sources={[
            { name: "Target state programs", type: "model" },
            { name: "DSIRE database", type: "public_data" },
            { name: "EcoXchange analysis", type: "model" },
          ]}
          isEstimate
        />
      </section>

      <Link
        to="/onboarding"
        className="flex items-center justify-between rounded-xl border border-paleGreen/60 bg-paleGreen/30 px-6 py-4 transition-colors duration-150 hover:bg-paleGreen/50"
      >
        <span className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-medGreen" />
          <span>
            <span className="block font-medium text-darkBg">
              Get personalized offering recommendations
            </span>
            <span className="text-sm text-textMuted">
              Answer 8 quick questions to find your best-fit offerings
            </span>
          </span>
        </span>
        <ArrowRight className="h-5 w-5 text-medGreen" />
      </Link>

      <Link
        to="/investor/marketplace"
        className="flex items-center justify-between rounded-xl border border-dashed border-paleGreen bg-white/60 px-6 py-5 text-textMuted hover:border-medGreen hover:text-darkBg transition-colors duration-150"
      >
        <span>
          <span className="block font-medium text-darkBg">
            Browse Available Projects
          </span>
          <span className="text-sm">
            Explore production-verified solar offerings
          </span>
        </span>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
