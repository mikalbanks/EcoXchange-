import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard.js";
import { ProjectCard } from "../components/ProjectCard.js";
import {
  ProjectCardSkeleton,
  Shimmer,
  StatCardSkeleton,
} from "../components/Skeleton.js";
import { loadPortfolio } from "../data/index.js";
import type { Portfolio as PortfolioData } from "../utils/types.js";
import { formatUsd } from "../utils/formatters.js";

export function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);

  useEffect(() => {
    loadPortfolio().then(setData);
  }, []);

  if (!data) {
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">Portfolio Overview</h1>
        <p className="text-textMuted mt-1">
          {data.portfolio.active_projects} active project
          {data.portfolio.active_projects === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Invested"
          value={formatUsd(data.portfolio.total_invested)}
        />
        <StatCard
          label="Monthly Yield"
          value={formatUsd(data.portfolio.monthly_yield_usd)}
          sublabel="USDC"
        />
        <StatCard
          label="Lifetime Yield"
          value={formatUsd(data.portfolio.lifetime_yield_usd)}
          sublabel="USDC"
        />
      </div>

      <div className="space-y-4">
        {data.projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
