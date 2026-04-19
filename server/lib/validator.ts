import { db } from "../db";
import { projects, type Project } from "@shared/schema";
import { eq } from "drizzle-orm";
import { fetchNsrdbTimeSeries4km, aggregateMonthlyGhiKwhPerM2, computeSgtScoreFromNsrdbTruth } from "./nrel-engine";
import { fetchFacilityFuelMonthlyGeneration } from "./eia-client";
import { storage } from "../storage";

export interface EiaMonthlyMwhRow {
  period: string;
  mwh: number;
  source: "EIA" | "NREL_MODEL";
}

export interface ValidationResult {
  projectId: string;
  modeledMonthlyMwh: EiaMonthlyMwhRow[];
  actualMonthlyMwh: EiaMonthlyMwhRow[];
  mapePct: number | null;
  validationConfidencePct: number;
  eiaReferencePlantName: string | null;
  sgtScoreNrel: number | null;
  notes: string[];
}

const DEFAULT_PR = 0.2;

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function meanAbsolutePercentageError(model: number[], actual: number[]): number | null {
  if (model.length !== actual.length || model.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < model.length; i++) {
    const a = actual[i];
    const m = model[i];
    if (!isFinite(a) || !isFinite(m)) continue;
    if (a === 0) continue;
    sum += Math.abs((a - m) / a);
    count++;
  }
  if (count === 0) return null;
  return (sum / count) * 100;
}

function monthRangeUtc(monthsBack: number): { start: string; end: string; nsrdbYear: number } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack + 1, 1));
  const startStr = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  const endStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
  const nsrdbYear = end.getUTCFullYear();
  return { start: startStr, end: endStr, nsrdbYear };
}

function resolveCapacityMw(project: Project): number {
  const mw = Number(project.capacityMW ?? 0);
  if (Number.isFinite(mw) && mw > 0) return mw;
  const kw = Number(project.capacityKw ?? 0);
  if (Number.isFinite(kw) && kw > 0) return kw / 1000;
  return NaN;
}

async function loadProject(projectId: string): Promise<Project | undefined> {
  if (process.env.DATABASE_URL) {
    const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
    return row;
  }
  return storage.getProject(projectId);
}

async function persistValidationFields(
  projectId: string,
  updates: {
    sgtScoreNrel?: string | null;
    eiaActualMwh?: string | null;
    validationConfidence?: string | null;
  },
): Promise<void> {
  if (process.env.DATABASE_URL) {
    await db.update(projects).set(updates).where(eq(projects.id, projectId));
  } else {
    await storage.updateProject(projectId, updates as Partial<Project>);
  }
}

async function getNrelModeledMonthlyMwh(
  latitude: number,
  longitude: number,
  capacityMw: number,
  monthsBack: number,
  performanceRatio: number,
): Promise<Map<string, number>> {
  const { start, end, nsrdbYear } = monthRangeUtc(monthsBack);
  const ts = await fetchNsrdbTimeSeries4km(latitude, longitude, { year: nsrdbYear });
  const monthlyGhi = aggregateMonthlyGhiKwhPerM2(ts.rows, ts.intervalMinutes);
  const out = new Map<string, number>();
  for (const [period, ghiKwhM2] of monthlyGhi) {
    if (period < start || period > end) continue;
    const mwh = ghiKwhM2 * capacityMw * 1000 * performanceRatio;
    out.set(period, Number(mwh.toFixed(3)));
  }
  return out;
}

export async function queryEiaFacilityFuelMonthlyMwh(
  plantCode: string,
  startPeriod: string,
  endPeriod: string,
): Promise<EiaMonthlyMwhRow[]> {
  const rows = await fetchFacilityFuelMonthlyGeneration(plantCode, startPeriod, endPeriod);
  return rows.map((r) => ({ period: r.period, mwh: r.generationMwh, source: "EIA" as const }));
}

export async function validateProjectAgainstEia923(projectId: string): Promise<ValidationResult> {
  const project = await loadProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const notes: string[] = [];
  const lat = project.latitude ? Number(project.latitude) : NaN;
  const lon = project.longitude ? Number(project.longitude) : NaN;
  const capacityMwResolved = resolveCapacityMw(project);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    notes.push("Missing latitude/longitude; cannot run NREL model.");
  }
  if (!Number.isFinite(capacityMwResolved) || capacityMwResolved <= 0) {
    notes.push("Missing capacity MW; cannot scale NREL irradiance to MWh.");
  }

  const plantCode = project.eiaPlantCode?.trim();
  if (!plantCode) {
    notes.push("No eia_plant_code mapped; run scripts/map-eia-plants.ts or set fields manually.");
  }

  const monthsBack = 12;
  const { start, end } = monthRangeUtc(monthsBack);

  let modeledByMonth = new Map<string, number>();
  if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(capacityMwResolved) && capacityMwResolved > 0) {
    try {
      if (!process.env.NREL_API_KEY) {
        notes.push("NREL_API_KEY not set; NREL modeled series unavailable.");
      } else {
        modeledByMonth = await getNrelModeledMonthlyMwh(lat, lon, capacityMwResolved, monthsBack, DEFAULT_PR);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`NREL NSRDB fetch failed: ${msg}`);
    }
  }

  let actualRows: EiaMonthlyMwhRow[] = [];
  if (plantCode) {
    try {
      if (!process.env.EIA_API_KEY) {
        notes.push("EIA_API_KEY not set; EIA actuals unavailable.");
      } else {
        actualRows = await queryEiaFacilityFuelMonthlyMwh(plantCode, start, end);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      notes.push(`EIA facility-fuel fetch failed: ${msg}`);
    }
  }

  const modeledMonthlyMwh: EiaMonthlyMwhRow[] = Array.from(modeledByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, mwh]) => ({ period, mwh, source: "NREL_MODEL" as const }));

  const actualBy = new Map(actualRows.map((r) => [r.period, r.mwh]));
  const shared = Array.from(modeledByMonth.keys())
    .filter((p) => actualBy.has(p))
    .sort();

  const modelVals = shared.map((p) => modeledByMonth.get(p)!);
  const actualVals = shared.map((p) => actualBy.get(p)!);

  const mape = meanAbsolutePercentageError(modelVals, actualVals);

  let confidence = 0;
  if (mape != null) {
    confidence = clamp(100 - mape, 0, 100);
  } else {
    confidence = 0;
    if (shared.length === 0) notes.push("No overlapping NREL/EIA months to compute MAPE.");
  }

  let sgtScoreNrel: number | null = null;
  if (Number.isFinite(lat) && Number.isFinite(lon) && process.env.NREL_API_KEY) {
    try {
      const sgt = await computeSgtScoreFromNsrdbTruth(lat, lon, { year: new Date().getUTCFullYear() });
      sgtScoreNrel = sgt.sgtScoreNrel;
    } catch {
      // optional
    }
  }

  const lastActual = actualRows.length > 0 ? actualRows[actualRows.length - 1].mwh : null;

  await persistValidationFields(project.id, {
    sgtScoreNrel: sgtScoreNrel != null ? String(sgtScoreNrel) : project.sgtScoreNrel,
    eiaActualMwh: lastActual != null ? lastActual.toFixed(3) : project.eiaActualMwh,
    validationConfidence: confidence.toFixed(2),
  });

  return {
    projectId: project.id,
    modeledMonthlyMwh,
    actualMonthlyMwh: actualRows,
    mapePct: mape != null ? Number(mape.toFixed(2)) : null,
    validationConfidencePct: Number(confidence.toFixed(2)),
    eiaReferencePlantName: project.eiaReferencePlantName ?? null,
    sgtScoreNrel,
    notes,
  };
}
