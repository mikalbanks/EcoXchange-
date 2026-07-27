// Sortable project card grid (Spec 5): one card per demo project with
// verification badge, capacity, yield, and investor count. The flagged
// project gets an amber border; the onboarding project renders muted.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VerificationBadge } from "../VerificationBadge.js";
import type { DemoProject } from "../../data/demo-projects.js";

type SortKey = "capacity" | "yield" | "state" | "status";

const SORTERS: Record<SortKey, (a: DemoProject, b: DemoProject) => number> = {
  capacity: (a, b) => b.capacity_kw - a.capacity_kw,
  yield: (a, b) => b.current_yield_pct - a.current_yield_pct,
  state: (a, b) => a.state.localeCompare(b.state),
  status: (a, b) =>
    a.verification_status.localeCompare(b.verification_status) ||
    b.capacity_kw - a.capacity_kw,
};

function cardBorder(p: DemoProject): string {
  if (p.verification_status === "flagged") return "border-flagAmber/60";
  if (p.status === "onboarding") return "border-dashed border-gray-300";
  return "border-paleGreen/60";
}

export function ProjectCards({ projects }: { projects: DemoProject[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("capacity");
  const sorted = useMemo(
    () => [...projects].sort(SORTERS[sortKey]),
    [projects, sortKey],
  );

  return (
    <div data-testid="project-cards">
      <div className="mb-3 flex items-center justify-end gap-2">
        <label
          htmlFor="project-sort"
          className="font-mono text-[11px] uppercase tracking-wide text-textMuted"
        >
          Sort by
        </label>
        <select
          id="project-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-sm border border-paleGreen bg-white px-2 py-1.5 font-mono text-xs text-darkBg focus:border-medGreen focus:outline-none"
        >
          <option value="capacity">Capacity</option>
          <option value="yield">Yield</option>
          <option value="state">State</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col border bg-white p-4 ${cardBorder(p)} ${
              p.status === "onboarding" ? "opacity-80" : ""
            }`}
            data-testid={`project-card-${p.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-heading text-base leading-snug text-darkBg">
                {p.name}
              </p>
              <VerificationBadge status={p.verification_status} size="sm" />
            </div>
            <p className="mt-1 text-xs text-textMuted">
              {p.city}, {p.state}
              {p.program ? ` · ${p.program}` : ""}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs tabular-nums">
              <div>
                <dt className="text-textMuted">Capacity</dt>
                <dd className="text-darkBg">
                  {(p.capacity_kw / 1000).toLocaleString()} MW
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">Annual</dt>
                <dd className="text-darkBg">
                  {p.annual_generation_mwh.toLocaleString()} MWh
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">Yield</dt>
                <dd className="text-darkBg">
                  {p.current_yield_pct > 0
                    ? `${p.current_yield_pct.toFixed(1)}%`
                    : p.status === "onboarding"
                      ? "Onboarding"
                      : "Pending"}
                </dd>
              </div>
              <div>
                <dt className="text-textMuted">Investors</dt>
                <dd className="text-darkBg">
                  {p.investor_count > 0 ? p.investor_count : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex-1" />
            {p.detailPath ? (
              <Link
                to={p.detailPath}
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-medGreen transition-colors duration-150 hover:text-darkBg sm:min-h-0"
              >
                View project →
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
