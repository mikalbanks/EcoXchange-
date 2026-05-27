import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { VerificationBadge } from "../VerificationBadge.js";
import { formatMonthLong, formatMwh, formatPct } from "../../utils/formatters.js";
import type { ReferenceProjectCard } from "../../data/reference.js";

export function ReferenceCard({ project }: { project: ReferenceProjectCard }) {
  const dev = project._deviation_pct ?? 0;
  const annual = project._annual_mwh ?? project.ytd_production_mwh;
  const within10 = Math.abs(dev) <= 10;
  return (
    <div className="bg-white rounded-lg border border-paleGreen/60 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading text-lg text-darkBg truncate">
            {project.name}
          </h3>
          <p className="text-xs text-textMuted mt-1">
            {project.location} · {project.capacity_kw.toLocaleString()} kW
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-paleGreen/60 text-darkBg text-xs px-2 py-0.5 font-medium">
          Reference
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-textMuted">
            Annual Output
          </div>
          <div className="text-sm text-textDark mt-0.5">{formatMwh(annual)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-textMuted">
            Engine vs EIA
          </div>
          <div
            className={`text-sm mt-0.5 font-medium ${
              within10 ? "text-medGreen" : "text-flagAmber"
            }`}
          >
            {formatPct(dev)} {within10 ? "✓" : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-textMuted">
        <span>
          Latest: {project.latest_period ? formatMonthLong(project.latest_period) : "—"}
        </span>
        <VerificationBadge status={project.latest_verification} size="sm" />
      </div>

      <Link
        to={`/reference/${project.id}`}
        className="self-start inline-flex items-center gap-1 text-medGreen hover:text-darkBg text-sm font-medium transition-colors duration-150"
      >
        View detail <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
