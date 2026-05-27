import { useEffect, useMemo, useState } from "react";
import { StatCard } from "../components/StatCard.js";
import { ReferenceCard } from "../components/reference/ReferenceCard.js";
import {
  loadReferenceLibrary,
  type ReferenceLibrary as Lib,
  type ReferenceProjectCard,
} from "../data/reference.js";
import {
  ProjectCardSkeleton,
  Shimmer,
  StatCardSkeleton,
} from "../components/Skeleton.js";
import { liveMode } from "../data/index.js";

export function ReferenceLibrary() {
  const [data, setData] = useState<Lib | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capacityFilter, setCapacityFilter] = useState<string>("all");

  useEffect(() => {
    if (!liveMode) {
      setError(
        "Reference Library requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set so the dashboard can read from Supabase.",
      );
      return;
    }
    loadReferenceLibrary()
      .then((r) => setData(r))
      .catch((e) => setError((e as Error).message));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [] as ReferenceProjectCard[];
    return data.projects.filter((p) => {
      const cap = p.capacity_kw / 1000;
      if (capacityFilter === "small" && (cap < 1 || cap >= 5)) return false;
      if (capacityFilter === "medium" && (cap < 5 || cap >= 10)) return false;
      if (capacityFilter === "large" && cap < 10) return false;
      return true;
    });
  }, [data, capacityFilter]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-3xl text-darkBg">Reference Library</h1>
        <div className="rounded-md bg-amber-50 border border-flagAmber/40 px-4 py-3 text-flagAmber text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Shimmer className="h-9 w-72" />
          <Shimmer className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">Reference Library</h1>
        <p className="text-textMuted mt-1">
          EcoXchange engine validated against operating solar plants from the
          USGS/LBNL Large-Scale Solar Photovoltaic Database (USPVDB) and EIA
          Form 923 metered net generation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Plants Validated"
          value={String(data.summary.total_plants)}
        />
        <StatCard
          label="Mean Deviation"
          value={`${data.summary.mean_deviation_pct >= 0 ? "+" : ""}${data.summary.mean_deviation_pct.toFixed(1)}%`}
          sublabel="engine vs EIA"
        />
        <StatCard
          label="Within ±10%"
          value={`${data.summary.pct_within_10.toFixed(0)}%`}
          sublabel={`${data.summary.total_capacity_mw.toFixed(1)} MW total`}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-textMuted">Capacity:</label>
        <select
          value={capacityFilter}
          onChange={(e) => setCapacityFilter(e.target.value)}
          className="rounded-md border border-paleGreen px-3 py-1.5 text-sm bg-white outline-none focus:border-medGreen transition-colors duration-150"
        >
          <option value="all">All</option>
          <option value="small">Small (1–5 MW)</option>
          <option value="medium">Medium (5–10 MW)</option>
          <option value="large">Large (10+ MW)</option>
        </select>
        <span className="text-sm text-textMuted">
          {filtered.length} shown
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <ReferenceCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
