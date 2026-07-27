// Multi-project portfolio simulation (Spec 5): the platform at scale —
// 8 projects across 8 states on a map, aggregate stats, sortable cards,
// and a stacked production chart. The "As investor" toggle narrows the
// whole page to the demo investor's 3-project, $45K subset.

import { useMemo, useState } from "react";
import {
  DEMO_PROJECTS,
  INVESTOR_SUBSET,
  PORTFOLIO_AGGREGATE,
  aggregateFor,
} from "../data/demo-projects.js";
import { AggregateStatsHeader } from "../components/portfolio/AggregateStatsHeader.js";
import { PortfolioMap } from "../components/portfolio/PortfolioMap.js";
import { ProjectCards } from "../components/portfolio/ProjectCards.js";
import { StackedProductionChart } from "../components/portfolio/StackedProductionChart.js";
import { SectionTag } from "../components/ui/SectionTag.js";
import { Card } from "../components/ui/Card.js";
import { formatUsd } from "../utils/formatters.js";

type ViewMode = "platform" | "investor";

export function ProjectsOverview() {
  const [view, setView] = useState<ViewMode>("platform");

  const projects = useMemo(
    () =>
      view === "platform"
        ? DEMO_PROJECTS
        : DEMO_PROJECTS.filter((p) =>
            INVESTOR_SUBSET.projectIds.includes(p.id),
          ),
    [view],
  );
  const aggregate = useMemo(
    () =>
      view === "platform"
        ? PORTFOLIO_AGGREGATE
        : aggregateFor(INVESTOR_SUBSET.projectIds),
    [view],
  );

  const flagged = projects.find((p) => p.verification_status === "flagged");

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionTag>PORTFOLIO</SectionTag>
          <h1 className="font-heading text-3xl text-darkBg">
            Projects Across the Platform
          </h1>
          <p className="mt-1 max-w-2xl text-textMuted">
            Every project is production-verified monthly across inverter,
            utility, and satellite data before distributions release.
          </p>
        </div>

        {/* Platform / investor toggle */}
        <div
          className="inline-flex border border-paleGreen/80 p-0.5"
          role="tablist"
          aria-label="Portfolio view"
        >
          {(
            [
              ["platform", "Platform view"],
              ["investor", `As investor: ${formatUsd(INVESTOR_SUBSET.invested_usd)}`],
            ] as Array<[ViewMode, string]>
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              onClick={() => setView(mode)}
              className={`min-h-[40px] px-4 font-mono text-xs uppercase tracking-wide transition-colors duration-150 ${
                view === mode
                  ? "bg-darkBg text-cream"
                  : "text-textMuted hover:text-darkBg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "investor" ? (
        <Card variant="flat" padding="standard">
          <p className="text-sm text-textDark">
            Holding {formatUsd(INVESTOR_SUBSET.invested_usd)} across{" "}
            {INVESTOR_SUBSET.projectIds.length} projects · ~
            {formatUsd(INVESTOR_SUBSET.monthly_distribution_usd)}/month in
            aggregate distributions ·{" "}
            {flagged
              ? "1 holding flagged — review"
              : "All holdings verified"}
          </p>
        </Card>
      ) : null}

      <AggregateStatsHeader aggregate={aggregate} />

      <section>
        <SectionTag>MAP</SectionTag>
        <PortfolioMap projects={projects} />
        <p className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-textMuted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accentBrt" /> verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-flagAmber" /> flagged
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> pending /
            onboarding
          </span>
        </p>
      </section>

      <section>
        <SectionTag>PROJECTS</SectionTag>
        <ProjectCards projects={projects} />
      </section>

      <section>
        <SectionTag>AGGREGATE PRODUCTION</SectionTag>
        <Card variant="bordered" padding="standard">
          <h2 className="mb-3 font-heading text-lg text-darkBg">
            Monthly Production by Project
          </h2>
          <StackedProductionChart projects={projects} />
          <p className="mt-2 text-xs text-textMuted">
            Modeled monthly generation, stacked by project. Diversification
            across 8 states smooths the seasonal profile.
          </p>
        </Card>
      </section>
    </div>
  );
}
