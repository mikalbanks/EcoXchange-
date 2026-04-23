/**
 * Map each project (parcel lat/lng) to the nearest utility-scale solar PV facility
 * using EIA operating-generator-capacity (Forms EIA-860 / EIA-860M inventory).
 *
 * Usage:
 *   npx tsx scripts/map-eia-plants.ts
 *   npx tsx scripts/map-eia-plants.ts --project-id proj1
 *   npx tsx scripts/map-eia-plants.ts --dry-run
 *
 * Requires: EIA_API_KEY in .env.local
 */
import "dotenv/config";
import { db } from "../server/db";
import { projects } from "../shared/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { storage } from "../server/storage";
import { fetchSolarPvGeneratorsPage, type EiaGeneratorInventoryRow } from "../server/lib/eia-client";

const US_STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function stateToFacet(state: string): string | null {
  const t = state.trim();
  if (t.length === 2) return t.toUpperCase();
  return US_STATE_ABBR[t] ?? null;
}

async function loadProjects(singleId?: string): Promise<Array<{ id: string; name: string; state: string; latitude: string | null; longitude: string | null }>> {
  if (process.env.DATABASE_URL) {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        state: projects.state,
        latitude: projects.latitude,
        longitude: projects.longitude,
      })
      .from(projects)
      .where(and(isNotNull(projects.latitude), isNotNull(projects.longitude)));
    let filtered = rows.filter((r) => r.latitude && r.longitude);
    if (singleId) filtered = filtered.filter((r) => r.id === singleId);
    return filtered as typeof filtered;
  }
  const all = await storage.getAllProjects();
  let list = all.filter((p) => p.latitude && p.longitude).map((p) => ({
    id: p.id,
    name: p.name,
    state: p.state,
    latitude: p.latitude,
    longitude: p.longitude,
  }));
  if (singleId) list = list.filter((p) => p.id === singleId);
  return list;
}

/**
 * Collect unique solar PV generators by paging operating-generator-capacity, optionally filtered by state.
 */
async function buildGeneratorCatalog(
  stateFacet: string | null,
  minMw: number,
  maxPages: number,
): Promise<Map<string, EiaGeneratorInventoryRow>> {
  const byKey = new Map<string, EiaGeneratorInventoryRow>();
  const pageSize = 5000;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    const rows = await fetchSolarPvGeneratorsPage(offset, pageSize, stateFacet);
    if (!rows.length) break;

    for (const row of rows) {
      if (row.nameplateMw < minMw) continue;
      const key = `${row.plantid}|${row.generatorid}`;
      if (!byKey.has(key)) {
        byKey.set(key, row);
      }
    }

    if (rows.length < pageSize) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return byKey;
}

function findNearest(
  lat: number,
  lon: number,
  catalog: Map<string, EiaGeneratorInventoryRow>,
): { row: EiaGeneratorInventoryRow; distanceKm: number } | null {
  let best: { row: EiaGeneratorInventoryRow; distanceKm: number } | null = null;
  for (const row of catalog.values()) {
    const d = haversineKm(lat, lon, row.latitude, row.longitude);
    if (!best || d < best.distanceKm) {
      best = { row, distanceKm: d };
    }
  }
  return best;
}

async function updateProjectMapping(
  projectId: string,
  plantCode: string,
  generatorId: string,
  plantName: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  if (process.env.DATABASE_URL) {
    await db
      .update(projects)
      .set({
        eiaPlantCode: plantCode,
        eiaGeneratorId: generatorId,
        eiaReferencePlantName: plantName,
        updatedAt: sql`now()`,
      })
      .where(eq(projects.id, projectId));
  } else {
    await storage.updateProject(projectId, {
      eiaPlantCode: plantCode,
      eiaGeneratorId: generatorId,
      eiaReferencePlantName: plantName,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const projectArg = args.find((a) => a.startsWith("--project-id="));
  const singleId = projectArg ? projectArg.split("=")[1] : undefined;
  const minMw = Number(args.find((a) => a.startsWith("--min-mw="))?.split("=")[1] ?? "1");
  const maxCatalogPages = Number(args.find((a) => a.startsWith("--max-pages="))?.split("=")[1] ?? "80");

  if (!process.env.EIA_API_KEY) {
    console.error("Set EIA_API_KEY in .env.local");
    process.exit(1);
  }

  const projectList = await loadProjects(singleId);
  if (projectList.length === 0) {
    console.log("No projects with coordinates.");
    process.exit(0);
  }

  console.log(`Mapping ${projectList.length} project(s), min utility scale ${minMw} MW, dryRun=${dryRun}`);

  for (const p of projectList) {
    const lat = Number(p.latitude);
    const lon = Number(p.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn(`Skip ${p.id}: bad coords`);
      continue;
    }

    const stateFacet = stateToFacet(p.state);
    let catalog = await buildGeneratorCatalog(stateFacet, minMw, maxCatalogPages);

    if (catalog.size === 0 && stateFacet) {
      console.warn(`No generators in state ${stateFacet}, retrying national (slower)...`);
      catalog = await buildGeneratorCatalog(null, minMw, Math.min(maxCatalogPages, 40));
    }

    const nearest = findNearest(lat, lon, catalog);
    if (!nearest) {
      console.warn(`No solar PV generator catalog entry for ${p.id} (${p.name})`);
      continue;
    }

    const { row, distanceKm } = nearest;
    console.log(
      `${p.name} (${p.id}) -> plant ${row.plantid} gen ${row.generatorid} "${row.plantName}" (${distanceKm.toFixed(2)} km)`,
    );

    if (!dryRun) {
      await updateProjectMapping(p.id, row.plantid, row.generatorid, row.plantName || `Plant ${row.plantid}`, dryRun);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
