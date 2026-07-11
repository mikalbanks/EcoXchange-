import { Search } from "lucide-react";
import type { CatalogFilterState, CatalogSortKey } from "../../data/catalog.js";

const CAPACITY_RANGES: { label: string; min: number; max: number }[] = [
  { label: "Any size", min: 0, max: Infinity },
  { label: "< 1 MW", min: 0, max: 1 },
  { label: "1–5 MW", min: 1, max: 5 },
  { label: "5–20 MW", min: 5, max: 20 },
  { label: "20–100 MW", min: 20, max: 100 },
  { label: "100+ MW", min: 100, max: Infinity },
];

const SORT_OPTIONS: { value: CatalogSortKey; label: string }[] = [
  { value: "capacity_desc", label: "Largest first" },
  { value: "capacity_asc", label: "Smallest first" },
  { value: "deviation_asc", label: "Best engine accuracy" },
  { value: "revenue_desc", label: "Highest est. revenue" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "state_asc", label: "State A–Z" },
];

const selectCls =
  "rounded-md border border-paleGreen bg-white px-2 py-2 text-sm text-darkBg focus:outline-none focus:ring-2 focus:ring-accentBrt/50";

export function CatalogFilters({
  filters,
  onChange,
  sort,
  onSortChange,
  states,
}: {
  filters: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  sort: CatalogSortKey;
  onSortChange: (next: CatalogSortKey) => void;
  states: string[];
}) {
  const rangeIdx = CAPACITY_RANGES.findIndex(
    (r) => r.min === filters.minCapacityMw && r.max === filters.maxCapacityMw,
  );

  return (
    <div
      data-testid="catalog-filters"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-paleGreen/60 bg-white p-3"
    >
      <label className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by plant name or EIA ID…"
          className="w-full rounded-md border border-paleGreen bg-white py-2 pl-8 pr-3 text-sm text-darkBg placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-accentBrt/50"
        />
      </label>

      <select
        aria-label="Filter by state"
        className={selectCls}
        value={filters.state}
        onChange={(e) => onChange({ ...filters, state: e.target.value })}
      >
        <option value="">All states</option>
        {states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by capacity"
        className={selectCls}
        value={rangeIdx === -1 ? 0 : rangeIdx}
        onChange={(e) => {
          const r = CAPACITY_RANGES[Number(e.target.value)];
          onChange({ ...filters, minCapacityMw: r.min, maxCapacityMw: r.max });
        }}
      >
        {CAPACITY_RANGES.map((r, i) => (
          <option key={r.label} value={i}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by mount type"
        className={selectCls}
        value={filters.axisType}
        onChange={(e) =>
          onChange({
            ...filters,
            axisType: e.target.value as CatalogFilterState["axisType"],
          })
        }
      >
        <option value="all">All mounts</option>
        <option value="fixed">Fixed tilt</option>
        <option value="tracking">Tracking</option>
      </select>

      <select
        aria-label="Filter by engine accuracy"
        className={selectCls}
        value={filters.verification}
        onChange={(e) =>
          onChange({
            ...filters,
            verification: e.target.value as CatalogFilterState["verification"],
          })
        }
      >
        <option value="all">Any accuracy</option>
        <option value="within10">Within ±10%</option>
        <option value="within5">Within ±5%</option>
      </select>

      <select
        aria-label="Sort catalog"
        className={selectCls}
        value={sort}
        onChange={(e) => onSortChange(e.target.value as CatalogSortKey)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
