import type { CatalogData, EiaCatalogEntry } from "../types/catalog.js";

// The catalog JSON is ~2 MB, so it is loaded lazily (dynamic import) only when
// the catalog page is visited — it never lands in the main bundle.
let cached: CatalogData | null = null;

export async function loadCatalog(): Promise<CatalogData> {
  if (cached) return cached;
  const mod = await import("./eia-catalog.json");
  cached = mod.default as unknown as CatalogData;
  return cached;
}

export interface CatalogFilterState {
  search: string;
  state: string; // "" = all
  axisType: "all" | "fixed" | "tracking";
  minCapacityMw: number;
  maxCapacityMw: number; // Infinity = no cap
  verification: "all" | "within10" | "within5";
}

export const DEFAULT_FILTERS: CatalogFilterState = {
  search: "",
  state: "",
  axisType: "all",
  minCapacityMw: 0,
  maxCapacityMw: Infinity,
  verification: "all",
};

export type CatalogSortKey =
  | "capacity_desc"
  | "capacity_asc"
  | "deviation_asc"
  | "revenue_desc"
  | "name_asc"
  | "state_asc";

export function filterCatalog(
  plants: EiaCatalogEntry[],
  f: CatalogFilterState,
): EiaCatalogEntry[] {
  const q = f.search.trim().toLowerCase();
  return plants.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q) && p.eia_plant_id !== q) return false;
    if (f.state && p.state !== f.state) return false;
    if (f.axisType === "fixed" && p.axis_type.toLowerCase().includes("tracking")) return false;
    if (f.axisType === "tracking" && !p.axis_type.toLowerCase().includes("tracking")) return false;
    if (p.capacity_mw < f.minCapacityMw) return false;
    if (p.capacity_mw > f.maxCapacityMw) return false;
    if (f.verification === "within10" && !p.within_10pct) return false;
    if (f.verification === "within5" && !p.within_5pct) return false;
    return true;
  });
}

export function sortCatalog(
  plants: EiaCatalogEntry[],
  key: CatalogSortKey,
): EiaCatalogEntry[] {
  const sorted = [...plants];
  switch (key) {
    case "capacity_desc":
      return sorted.sort((a, b) => b.capacity_mw - a.capacity_mw);
    case "capacity_asc":
      return sorted.sort((a, b) => a.capacity_mw - b.capacity_mw);
    case "deviation_asc":
      return sorted.sort((a, b) => a.absolute_deviation_pct - b.absolute_deviation_pct);
    case "revenue_desc":
      return sorted.sort((a, b) => b.implied_annual_revenue_usd - a.implied_annual_revenue_usd);
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "state_asc":
      return sorted.sort((a, b) => a.state.localeCompare(b.state) || b.capacity_mw - a.capacity_mw);
    default:
      return sorted;
  }
}

export function catalogStates(plants: EiaCatalogEntry[]): string[] {
  return [...new Set(plants.map((p) => p.state))].sort();
}
