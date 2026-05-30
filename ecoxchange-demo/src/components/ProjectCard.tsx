import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { PortfolioProject } from "../data/types.js";
import {
  formatMwh,
  formatNullableUsd,
  formatRevenueType,
} from "../utils/formatters.js";
import { MetricLabel } from "./ui/MetricExplainer.js";
import { VerificationBadge } from "./ui/VerificationBadge.js";

export function ProjectCard({ project }: { project: PortfolioProject }) {
  const statusPeriod = project.latest_period || "";

  return (
    <article className="border border-eco-border bg-white p-6 sm:p-8 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="font-display italic text-[26px] sm:text-[30px]">
            {project.name}
          </h2>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-tag text-eco-text-muted">
            {project.location} - {(project.capacity_kw / 1000).toFixed(1)} MW DC
            - {formatRevenueType(project.revenue_type)}
          </p>
        </div>
        <VerificationBadge
          status={project.latest_verification}
          obsCount={project.months_reconciled}
          periodStart={statusPeriod}
        />
      </header>

      {project.verification_mismatch ? (
        <p className="border-l-4 border-eco-flagged bg-eco-flagged-bg px-4 py-3 font-body text-[13px] text-eco-text-body">
          Demo integrity note: stored verification status differs from the
          recalculated engine status for at least one record.
        </p>
      ) : null}

      {!project.has_required_data ? (
        <p className="border-l-4 border-eco-line bg-eco-pale/60 px-4 py-3 font-body text-[13px] text-eco-text-body">
          Data Required: this project needs usable expected production and
          inverter production records before verification metrics can be shown.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <CardMetric
          label={<MetricLabel metric="annual_production">YTD Production</MetricLabel>}
          value={formatMwh(project.ytd_production_mwh)}
        />
        <CardMetric
          label={<MetricLabel metric="distribution">Latest Distribution</MetricLabel>}
          value={formatNullableUsd(project.latest_distribution_usd)}
        />
        <CardMetric
          label={<MetricLabel metric="investor_share">Investor Share</MetricLabel>}
          value={`${project.investor_share_pct.toFixed(1)}%`}
        />
        <CardMetric
          label="Target IRR"
          value={
            project.target_irr_pct === null
              ? "Not connected"
              : `${project.target_irr_pct.toFixed(1)}%`
          }
        />
      </div>

      <div className="rule-thin" />

      <Link
        to={`/project/${project.id}`}
        className="inline-flex items-center justify-center px-6 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-white text-eco-dark border border-eco-dark hover:bg-eco-pale transition-colors duration-150"
      >
        View Project <span aria-hidden className="ml-2">-&gt;</span>
      </Link>
    </article>
  );
}

function CardMetric({
  label,
  value,
}: {
  label: ReactNode;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {label}
      </p>
      <p className="font-display text-[22px] sm:text-[24px] font-bold text-eco-text-primary leading-none">
        {value}
      </p>
    </div>
  );
}
