import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { PortfolioProject } from "../utils/types.js";
import { VerificationBadge } from "./VerificationBadge.js";
import { YieldDisclosure } from "../compliance/components/YieldDisclosure.js";
import { formatMonthLong, formatMwh, formatUsd } from "../utils/formatters.js";

export function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-paleGreen/60 p-4 sm:p-6 flex flex-col gap-4 transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-darkBg">{project.name}</h2>
          <p className="text-sm text-textMuted mt-1">
            {project.location} · {project.capacity_kw.toLocaleString()} kW ·{" "}
            <span className="capitalize">{project.status}</span>
          </p>
        </div>
        <VerificationBadge status={project.latest_verification} />
      </div>

      <div className="font-mono text-xs uppercase tracking-wide text-textMuted">
        {project.latest_verification} ·{" "}
        {formatMonthLong(project.latest_period)}
      </div>

      {/* Say what the status means, not just what it is. */}
      <p className="text-sm text-textDark">
        {project.latest_verification === "verified"
          ? "The available source legs are within tolerance. Open the record to review provenance before relying on the status."
          : project.latest_verification === "flagged"
            ? "The available source legs did not reconcile within tolerance. Distribution processing is on hold pending review."
            : "Awaiting one or more production inputs for this period."}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-textMuted">
            Demo-Period Production
          </div>
          <div className="font-heading text-xl text-darkBg mt-1">
            {formatMwh(project.ytd_production_mwh)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-textMuted">
            Latest Distribution
          </div>
          <div className="font-heading text-xl text-darkBg mt-1">
            <YieldDisclosure
              value={formatUsd(project.monthly_yield_usd)}
              type="cash_distribution"
              basis="modeled"
            />
          </div>
        </div>
      </div>

      {/* Mobile: full-width outlined CTA (>=44px target). Desktop: text link. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={`/investor/project/${project.id}/verification/${project.latest_period}`}
          className="inline-flex items-center gap-1 font-medium text-medGreen hover:text-darkBg w-full min-h-[44px] justify-center rounded-lg border border-medGreen sm:w-auto sm:min-h-0 sm:justify-start sm:rounded-none sm:border-0"
        >
          View Verification Record <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          to={`/investor/project/${project.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-textMuted hover:text-darkBg w-full min-h-[44px] justify-center sm:w-auto sm:min-h-0 sm:justify-start"
        >
          View Project Details <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
