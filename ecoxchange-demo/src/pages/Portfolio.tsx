import { useEffect, useState } from "react";
import { StatBand, type StatItem } from "../components/layout/StatBand.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { ProjectCard } from "../components/ProjectCard.js";
import { useDemoMode } from "../state/demoMode.js";
import { liveMode, loadPortfolio } from "../data/index.js";
import type { Portfolio as PortfolioData } from "../data/types.js";
import {
  formatMwh,
  formatNullableUsd,
  formatPercentPlain,
  formatUsd,
} from "../utils/formatters.js";

export function Portfolio() {
  const { mode } = useDemoMode();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setData(null);
    setError(null);
    loadPortfolio({ variant: mode })
      .then((portfolio) => {
        if (mounted) setData(portfolio);
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [mode]);

  if (error) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <MonoTag>Portfolio</MonoTag>
        <h1 className="font-display italic text-[36px]">Portfolio unavailable.</h1>
        <p className="font-body text-eco-text-body">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-site px-6 sm:px-8 py-16 space-y-4">
        <MonoTag>Portfolio</MonoTag>
        <h1 className="font-display italic text-[36px]">Loading portfolio.</h1>
      </main>
    );
  }

  const stats: StatItem[] = [
    {
      label: "Total Invested",
      value: formatUsd(data.portfolio.total_invested),
      sublabel: data.portfolio.allocation_note,
      metric: "investor_share",
    },
    {
      label: "Latest Monthly Distributions",
      value: formatNullableUsd(data.portfolio.latest_monthly_distributions),
      sublabel: "USD settlement shown; USDC is optional where eligible.",
      metric: "distribution",
    },
    {
      label: "YTD Distributions",
      value: formatNullableUsd(data.portfolio.ytd_distributions),
      sublabel: `${data.projects.length} solar holding${data.projects.length === 1 ? "" : "s"}`,
      metric: "distribution",
    },
    {
      label: "Verified Projects",
      value: `${data.portfolio.verified_projects}/${data.projects.length}`,
      sublabel: `${data.portfolio.months_reconciled} months reconciled`,
      metric: "verification_status",
    },
  ];

  const totalProduction = data.projects.reduce(
    (sum, project) => sum + project.ytd_production_mwh,
    0,
  );

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-16 pb-8 space-y-4">
        <MonoTag>
          Investor Portal - Reg D 506(c) - Accredited Investors Only
        </MonoTag>
        <h1 className="font-display italic text-[36px] sm:text-[48px] md:text-[56px] leading-[1.05]">
          Portfolio overview.
        </h1>
        <p className="font-body text-[15px] sm:text-[16px] text-eco-text-body max-w-prose leading-relaxed">
          A project-level view of fractional solar ownership. Monthly
          distributions are shown after production is reconciled against inverter
          telemetry, utility meter data, and expected solar production.
        </p>
        {!liveMode ? (
          <p className="max-w-prose border-l-4 border-eco-line bg-eco-pale/60 px-4 py-3 font-body text-[13px] leading-6 text-eco-text-body">
            Demo mode: showing the Savannah backtested solar fallback because
            Supabase environment variables are not configured in this build.
          </p>
        ) : null}
      </section>

      <StatBand stats={stats} />

      <section className="mx-auto max-w-site px-6 sm:px-8 py-12 sm:py-16 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <MonoTag>Section I - Solar Holdings</MonoTag>
            <h2 className="mt-2 font-display italic text-[26px] sm:text-[30px]">
              {data.projects.length === 1
                ? "Single-project dashboard."
                : "Aggregated project dashboard."}
            </h2>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-tag text-eco-text-muted">
            {formatMwh(totalProduction)} YTD production - Target IRR{" "}
            {data.portfolio.weighted_average_target_irr_pct === null
              ? "not connected"
              : formatPercentPlain(data.portfolio.weighted_average_target_irr_pct)}
          </p>
        </div>
        <div className="rule-thin" />

        {data.projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {data.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="border border-eco-border bg-white p-8 text-center">
      <h2 className="font-display italic text-[28px]">No solar projects found.</h2>
      <p className="mx-auto mt-2 max-w-prose font-body text-[14px] leading-6 text-eco-text-body">
        Connect Supabase records in `projects` and `verification_records` to
        populate the portfolio. Projects without usable reconciliation data will
        appear as Data Required.
      </p>
    </div>
  );
}
