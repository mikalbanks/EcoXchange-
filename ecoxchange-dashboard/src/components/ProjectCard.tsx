import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { PortfolioProject } from "../utils/types.js";
import { VerificationBadge } from "./VerificationBadge.js";
import { formatMonthLong, formatMwh, formatUsd } from "../utils/formatters.js";

export function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-paleGreen/60 p-6 flex flex-col gap-4 transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md">
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

      <div className="text-sm text-textMuted">
        Latest period:{" "}
        <span className="text-textDark">{formatMonthLong(project.latest_period)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-textMuted">
            YTD Production
          </div>
          <div className="font-heading text-xl text-darkBg mt-1">
            {formatMwh(project.ytd_production_mwh)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-textMuted">
            Monthly Yield
          </div>
          <div className="font-heading text-xl text-darkBg mt-1">
            {formatUsd(project.monthly_yield_usd)}{" "}
            <span className="text-sm text-textMuted">USDC</span>
          </div>
        </div>
      </div>

      <Link
        to={`/investor/project/${project.id}`}
        className="self-start inline-flex items-center gap-1 text-medGreen hover:text-darkBg font-medium"
      >
        View Project <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
