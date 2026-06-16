import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StatCard } from "../components/StatCard.js";
import { ProjectCard } from "../components/ProjectCard.js";
import { AnimatedNumber } from "../components/shared/AnimatedNumber.js";
import { ErrorState } from "../components/shared/ErrorState.js";
import { EmptyState } from "../components/shared/EmptyState.js";
import {
  ProjectCardSkeleton,
  Shimmer,
  StatCardSkeleton,
} from "../components/shared/LoadingState.js";
import { useData } from "../context/DataContext.js";
import { useAuth } from "../context/AuthContext.js";
import type { Portfolio as PortfolioData } from "../utils/types.js";
import { formatUsd } from "../utils/formatters.js";

export function Portfolio() {
  const { getPortfolio, scenario } = useData();
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setStatus("loading");
    setData(null);
    getPortfolio()
      .then((res) => {
        setData(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [getPortfolio]);

  useEffect(load, [load, scenario]);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ProjectCardSkeleton />
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">
          Good to see you, {firstName}.
        </h1>
        <p className="text-textMuted mt-1">
          {data.portfolio.active_projects} active project
          {data.portfolio.active_projects === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Invested"
          value={
            <AnimatedNumber
              value={data.portfolio.total_invested}
              format={(n) => formatUsd(n)}
            />
          }
        />
        <StatCard
          label="Monthly Yield"
          value={
            <AnimatedNumber
              value={data.portfolio.monthly_yield_usd}
              format={(n) => formatUsd(n)}
            />
          }
          sublabel="USDC"
        />
        <StatCard
          label="Lifetime Yield"
          value={
            <AnimatedNumber
              value={data.portfolio.lifetime_yield_usd}
              format={(n) => formatUsd(n)}
            />
          }
          sublabel="USDC"
        />
      </div>

      {data.projects.length === 0 ? (
        <EmptyState
          title="No investments yet"
          message="When you subscribe to an offering, your projects will appear here."
          cta={{ label: "Browse Available Projects", to: "/investor/marketplace" }}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="font-heading text-xl text-darkBg">Your Projects</h2>
          {data.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

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
