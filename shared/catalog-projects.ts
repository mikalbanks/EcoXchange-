/**
 * Curated operating / near-operating solar projects (≥ 1 MW) for the platform catalog.
 * Replace rows in `catalog-projects.data.ts` or run `npm run catalog:import` after adding a CSV under `data/catalog/`.
 */

import type { CatalogProjectRow } from "./catalog-projects.types.ts";
import { CATALOG_PROJECTS } from "./catalog-projects.data.ts";

export type { CatalogProjectRow, CatalogStage, CatalogTechnology } from "./catalog-projects.types.ts";
export { CATALOG_PROJECTS } from "./catalog-projects.data.ts";

export const CATALOG_MIN_CAPACITY_MW = 1;

export function catalogCapacityMw(row: CatalogProjectRow): number {
  return parseFloat(row.capacityMW || "0");
}

export function catalogProjectsAtLeast1Mw(): CatalogProjectRow[] {
  return CATALOG_PROJECTS.filter((p) => catalogCapacityMw(p) >= CATALOG_MIN_CAPACITY_MW);
}

/** Up to `limit` approved offerings for the investor browse experience (default 25). */
export function catalogOfferings(limit = 25): CatalogProjectRow[] {
  return catalogProjectsAtLeast1Mw()
    .sort((a, b) => {
      const d = catalogCapacityMw(b) - catalogCapacityMw(a);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
