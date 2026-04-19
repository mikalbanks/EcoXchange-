/**
 * Re-run institutional validation for all projects with coordinates (live NREL vs EIA).
 *
 *   npx tsx scripts/revalidate-all-projects.ts
 *
 * Requires: NREL_API_KEY, EIA_API_KEY; projects should have eia_plant_code from map-eia-plants.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { projects } from "../shared/schema";
import { isNotNull, and } from "drizzle-orm";
import { storage } from "../server/storage";
import { validateProjectAgainstEia923 } from "../server/lib/validator";

async function getProjectIds(): Promise<string[]> {
  if (process.env.DATABASE_URL) {
    const rows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(isNotNull(projects.latitude), isNotNull(projects.longitude)));
    return rows.map((r) => r.id);
  }
  const all = await storage.getAllProjects();
  return all.filter((p) => p.latitude && p.longitude).map((p) => p.id);
}

async function main() {
  const ids = await getProjectIds();
  console.log(`Revalidating ${ids.length} project(s)...`);
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    try {
      const r = await validateProjectAgainstEia923(id);
      console.log(`${id}: confidence=${r.validationConfidencePct}% mape=${r.mapePct ?? "n/a"}`);
      ok++;
    } catch (e) {
      console.error(`${id}:`, e);
      fail++;
    }
    await new Promise((res) => setTimeout(res, 400));
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
