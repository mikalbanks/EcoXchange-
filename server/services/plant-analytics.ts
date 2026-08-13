import { readFile } from "fs/promises";
import path from "path";
import {
  plantAnalyticsArtifactSchema,
  type PlantAnalyticsArtifact,
  type PlantAnalyticsProject,
  type PlantAnalyticsResponse,
  type PlantAnalyticsRow,
} from "@shared/plant-analytics";

/**
 * Spec 22 — reading the analytics artifact the Python engine writes.
 *
 * There is no TS↔Python bridge in this repo. `server/services/verification-
 * engine.ts` is an independent TypeScript implementation, and the Python
 * engine's output reaches the app the way spec 21's already does: as a
 * committed artifact. `verification-engine/reports/plant_analytics.json` is
 * produced by `scripts/run_analytics.py`, which is a scheduled job measured in
 * minutes per system — nothing here is allowed to trigger it.
 *
 * The artifact is validated on load rather than trusted. Its most important
 * field is a degradation rate that will be quoted at third parties, and the
 * schema refuses a rate that arrived without its confidence interval. A parse
 * failure surfacing as "no analytics available" is a better outcome than a
 * report rendering a number that looks more certain than it is.
 */

const ARTIFACT_PATH = path.resolve(
  process.cwd(),
  "verification-engine",
  "reports",
  "plant_analytics.json",
);

export class AnalyticsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsUnavailableError";
  }
}

let cached: PlantAnalyticsResponse | null = null;
let cachedMtimeMs: number | null = null;

/**
 * Clear-sky before sensor.
 *
 * Not cosmetic. Clear-sky is the default method precisely because it does not
 * depend on site hardware — §2.2 documents the failure mode where a poorly
 * maintained pyranometer reads low and the plant appears to be degrading. When
 * both methods ran and disagree, the reader should meet the hardware-independent
 * number first.
 */
function orderRows(rows: PlantAnalyticsRow[]): PlantAnalyticsRow[] {
  return [...rows].sort((a, b) => {
    if (a.degradation_method === b.degradation_method) {
      return a.as_of_date < b.as_of_date ? 1 : -1;
    }
    return a.degradation_method === "clearsky" ? -1 : 1;
  });
}

function toResponse(artifact: PlantAnalyticsArtifact): PlantAnalyticsResponse {
  const rowsByProject = new Map<string, PlantAnalyticsRow[]>();
  for (const row of artifact.rows) {
    const existing = rowsByProject.get(row.project_id) ?? [];
    existing.push(row);
    rowsByProject.set(row.project_id, existing);
  }

  const projects: PlantAnalyticsProject[] = artifact.systems.map((system) => ({
    projectId: system.project_id,
    systemId: system.system_id,
    name: system.name,
    window: system.window,
    caveats: system.caveats,
    rows: orderRows(rowsByProject.get(system.project_id) ?? []),
    error: system.error,
  }));

  return {
    generatedAt: artifact.generated_at,
    engineVersion: artifact.engine_version,
    rdtoolsVersion: artifact.rdtools_version,
    asOfDate: artifact.as_of_date,
    projects,
    skipped: artifact.skipped,
    acceptance: artifact.acceptance,
  };
}

/**
 * Load and validate the artifact, cached until the file changes on disk.
 *
 * Keyed on mtime rather than held forever: a scheduled run rewrites the file
 * under a long-lived server process, and a report showing last month's
 * degradation rate with this month's date on it would be worse than no report.
 */
export async function getPlantAnalytics(): Promise<PlantAnalyticsResponse> {
  let stat: { mtimeMs: number };
  try {
    const { stat: fsStat } = await import("fs/promises");
    stat = await fsStat(ARTIFACT_PATH);
  } catch {
    throw new AnalyticsUnavailableError(
      `No analytics artifact at ${ARTIFACT_PATH}. Generate it with ` +
        `\`python3 verification-engine/scripts/run_analytics.py\` — it is a ` +
        `scheduled job measured in minutes per system, never a request-path call.`,
    );
  }

  if (cached && cachedMtimeMs === stat.mtimeMs) {
    return cached;
  }

  let raw: string;
  try {
    raw = await readFile(ARTIFACT_PATH, "utf-8");
  } catch (error: any) {
    throw new AnalyticsUnavailableError(
      `Could not read the analytics artifact: ${error.message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error: any) {
    throw new AnalyticsUnavailableError(
      `The analytics artifact is not valid JSON (${error.message}). The Python ` +
        `writer sets allow_nan=False for exactly this reason; a bare NaN here ` +
        `means something else wrote the file.`,
    );
  }

  const result = plantAnalyticsArtifactSchema.safeParse(parsed);
  if (!result.success) {
    throw new AnalyticsUnavailableError(
      `The analytics artifact failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  cached = toResponse(result.data);
  cachedMtimeMs = stat.mtimeMs;
  return cached;
}

export async function getPlantAnalyticsProject(
  projectId: string,
): Promise<PlantAnalyticsProject | undefined> {
  const analytics = await getPlantAnalytics();
  return analytics.projects.find((p) => p.projectId === projectId);
}

/** Test seam — drops the mtime cache. */
export function clearPlantAnalyticsCache(): void {
  cached = null;
  cachedMtimeMs = null;
}
