import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  filterCatalog,
  loadCatalog,
  sortCatalog,
  catalogStates,
  type CatalogFilterState,
  type CatalogSortKey,
} from "../../data/catalog.js";
import type { CatalogData } from "../../types/catalog.js";
import { EiaCatalogCard } from "../../components/catalog/EiaCatalogCard.js";
import { CatalogFilters } from "../../components/catalog/CatalogFilters.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { CardSkeleton } from "../../components/shared/LoadingState.js";

const PAGE_SIZES = [24, 48, 96];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-bold text-accentBrt tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-paleGreen">
        {label}
      </div>
    </div>
  );
}

export function EiaCatalog() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CatalogSortKey>("capacity_desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  useEffect(() => {
    loadCatalog()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const states = useMemo(
    () => (data ? catalogStates(data.plants) : []),
    [data],
  );

  const visible = useMemo(() => {
    if (!data) return [];
    return sortCatalog(filterCatalog(data.plants, filters), sort);
  }, [data, filters, sort]);

  // Clamp page when the filter shrinks the result set.
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleFilters = (next: CatalogFilterState) => {
    setFilters(next);
    setPage(0);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Header total={null} />
        <ErrorState onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header total={data?.stats.total_plants ?? null} />

      {data ? (
        <>
          {/* Engine accuracy banner for the prime cohort */}
          <div
            data-testid="catalog-stats"
            className="grid grid-cols-2 gap-4 rounded-xl bg-darkBg px-5 py-4 sm:grid-cols-4"
          >
            <Stat
              label="Mean |deviation|"
              value={`±${data.stats.mean_absolute_deviation_pct.toFixed(1)}%`}
            />
            <Stat
              label="Median |deviation|"
              value={`±${data.stats.median_absolute_deviation_pct.toFixed(1)}%`}
            />
            <Stat
              label="Mode |deviation|"
              value={
                data.stats.mode_absolute_deviation_pct != null
                  ? `±${data.stats.mode_absolute_deviation_pct.toFixed(1)}%`
                  : "—"
              }
            />
            <Stat
              label="Std deviation"
              value={`${data.stats.std_deviation_pct.toFixed(1)}%`}
            />
          </div>

          <CatalogFilters
            filters={filters}
            onChange={handleFilters}
            sort={sort}
            onSortChange={setSort}
            states={states}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-textMuted">
            <span data-testid="catalog-count">
              {visible.length.toLocaleString("en-US")} plants
              {visible.length !== data.plants.length
                ? ` (of ${data.plants.length.toLocaleString("en-US")})`
                : ""}
            </span>
            <label className="flex items-center gap-2">
              Per page
              <select
                className="rounded-md border border-paleGreen bg-white px-2 py-1 text-sm text-darkBg"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {pageItems.length === 0 ? (
            <p className="rounded-xl border border-paleGreen/60 bg-white p-8 text-center text-textMuted">
              No plants match these filters.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((plant) => (
                <EiaCatalogCard key={plant.eia_plant_id} plant={plant} />
              ))}
            </div>
          )}

          {pageCount > 1 ? (
            <nav
              className="flex items-center justify-center gap-3 pt-2"
              aria-label="Catalog pages"
            >
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="rounded-md border border-paleGreen bg-white px-3 py-1.5 text-sm text-darkBg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-sm text-textMuted tabular-nums">
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                className="rounded-md border border-paleGreen bg-white px-3 py-1.5 text-sm text-darkBg disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          ) : null}

          <p className="border-t border-paleGreen/50 pt-4 text-xs text-textMuted">
            Catalog data: U.S. EIA-923 reported generation ({data.benchmark_year}),
            EIA-860 plant characteristics, and USPVDB geometry. Production expectations
            verified by the EcoXchange engine {data.engine_version} (pvlib ModelChain,
            NASA POWER irradiance). Indicative values are derived from published NREL
            installed-cost benchmarks and state-average PPA rates — they are estimates
            for demonstration, not appraisals, offers to sell, or solicitations. These
            plants are real EIA-registered facilities; they are not EcoXchange offerings.
          </p>
        </>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
    </div>
  );
}

function Header({ total }: { total: number | null }) {
  return (
    <header>
      <h1 className="font-heading text-3xl text-darkBg">Solar Asset Catalog</h1>
      <p className="mt-1 text-textMuted">
        {total != null
          ? `${total.toLocaleString("en-US")} real U.S. solar plants from federal EIA data — every one production-verified by the EcoXchange engine.`
          : "Real U.S. solar plants from federal EIA data, production-verified by the EcoXchange engine."}
      </p>
    </header>
  );
}
