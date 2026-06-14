import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ProjectCard } from "../components/ProjectCard.js";
import { MonoTag } from "../components/ui/MonoTag.js";
import { liveMode, loadProjectList } from "../data/index.js";
import type { PortfolioProject, VerificationStatus } from "../data/types.js";
import { useDemoMode } from "../state/demoMode.js";
import { formatRevenueType } from "../utils/formatters.js";

type SizeFilter = "all" | "small" | "mid" | "large";
type StatusFilter = "all" | VerificationStatus;

export function Projects() {
  const { mode } = useDemoMode();
  const [projects, setProjects] = useState<PortfolioProject[] | null>(null);
  const [stateFilter, setStateFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [revenueFilter, setRevenueFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setProjects(null);
    setError(null);
    loadProjectList({ variant: mode })
      .then((items) => {
        if (mounted) setProjects(items);
      })
      .catch((err) => {
        if (mounted) setError((err as Error).message);
      });
    return () => {
      mounted = false;
    };
  }, [mode]);

  const states = useMemo(() => {
    const values = new Map<string, string>();
    for (const project of projects ?? []) {
      if (project.state_code && project.state_name) {
        values.set(project.state_code, project.state_name);
      }
    }
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);

  const revenueTypes = useMemo(() => {
    return Array.from(
      new Set(
        (projects ?? [])
          .map((project) => project.revenue_type)
          .filter((value): value is string => Boolean(value)),
      ),
    );
  }, [projects]);

  const hasAvailabilityData = useMemo(
    () =>
      (projects ?? []).some(
        (project) => project.availability_status !== "not_connected",
      ),
    [projects],
  );

  const filtered = useMemo(() => {
    return (projects ?? []).filter((project) => {
      if (stateFilter !== "all" && project.state_code !== stateFilter) return false;
      if (statusFilter !== "all" && project.latest_verification !== statusFilter) {
        return false;
      }
      if (revenueFilter !== "all" && project.revenue_type !== revenueFilter) {
        return false;
      }
      const mw = project.capacity_kw / 1000;
      if (sizeFilter === "small" && mw >= 5) return false;
      if (sizeFilter === "mid" && (mw < 5 || mw > 10)) return false;
      if (sizeFilter === "large" && mw <= 10) return false;
      return true;
    });
  }, [projects, revenueFilter, sizeFilter, stateFilter, statusFilter]);

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-8 space-y-4">
        <MonoTag>Projects</MonoTag>
        <h1 className="font-display italic text-[36px] sm:text-[48px] leading-tight">
          Solar project marketplace.
        </h1>
        {!liveMode ? (
          <p className="max-w-prose border-l-4 border-eco-line bg-eco-pale/60 px-4 py-3 font-body text-[13px] leading-6 text-eco-text-body">
            Supabase is not configured in this build, so the Savannah
            backtested solar fallback is shown as demo data.
          </p>
        ) : null}
      </section>

      <section className="mx-auto max-w-site px-6 sm:px-8 pb-12 space-y-6">
        <div className="border border-eco-border bg-eco-pale/35 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Filter label="State">
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                className="w-full border border-eco-border bg-white px-3 py-2 font-body text-[13px]"
              >
                <option value="all">All states</option>
                {states.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </Filter>
            <Filter label="Project size">
              <select
                value={sizeFilter}
                onChange={(event) => setSizeFilter(event.target.value as SizeFilter)}
                className="w-full border border-eco-border bg-white px-3 py-2 font-body text-[13px]"
              >
                <option value="all">All sizes</option>
                <option value="small">Under 5 MW</option>
                <option value="mid">5-10 MW</option>
                <option value="large">Over 10 MW</option>
              </select>
            </Filter>
            <Filter label="Verification">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="w-full border border-eco-border bg-white px-3 py-2 font-body text-[13px]"
              >
                <option value="all">All statuses</option>
                <option value="verified">Verified</option>
                <option value="flagged">Flagged</option>
                <option value="pending">Not yet verified</option>
                <option value="data_required">Data required</option>
              </select>
            </Filter>
            <Filter label="Revenue type">
              <select
                value={revenueFilter}
                onChange={(event) => setRevenueFilter(event.target.value)}
                className="w-full border border-eco-border bg-white px-3 py-2 font-body text-[13px]"
              >
                <option value="all">All revenue types</option>
                {revenueTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatRevenueType(type)}
                  </option>
                ))}
              </select>
            </Filter>
            <Filter label="Availability">
              <select
                disabled={!hasAvailabilityData}
                className="w-full border border-eco-border bg-white px-3 py-2 font-body text-[13px] disabled:bg-eco-pale disabled:text-eco-text-muted"
              >
                <option>
                  {hasAvailabilityData
                    ? "All availability"
                    : "Availability data not yet connected"}
                </option>
              </select>
            </Filter>
          </div>
        </div>

        {error ? (
          <p className="border-l-4 border-eco-flagged bg-eco-flagged-bg px-4 py-3 font-body text-[14px] text-eco-text-body">
            {error}
          </p>
        ) : null}

        {!projects && !error ? (
          <p className="font-body text-eco-text-body">Loading solar projects.</p>
        ) : null}

        {projects && filtered.length === 0 ? (
          <div className="border border-eco-border bg-white p-8 text-center">
            <h2 className="font-display italic text-[28px]">No projects match.</h2>
            <p className="mx-auto mt-2 max-w-prose font-body text-[14px] leading-6 text-eco-text-body">
              Adjust filters or connect additional active solar project records
              in Supabase.
            </p>
          </div>
        ) : null}

        {filtered.length > 0 ? (
          <div className="space-y-5">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
