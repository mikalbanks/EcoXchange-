import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import type { EIA923PlantTotals } from "../utils/types.js";

const MONTH_COLS = [
  "Netgen\nJanuary",
  "Netgen\nFebruary",
  "Netgen\nMarch",
  "Netgen\nApril",
  "Netgen\nMay",
  "Netgen\nJune",
  "Netgen\nJuly",
  "Netgen\nAugust",
  "Netgen\nSeptember",
  "Netgen\nOctober",
  "Netgen\nNovember",
  "Netgen\nDecember",
];

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  // EIA 923 uses "." for null, sometimes commas
  const s = String(v).replace(/,/g, "").trim();
  if (s === "." || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function pickHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const row = rows[i] ?? [];
    if (row.some((c) => String(c ?? "").trim() === "Plant Id")) return i;
  }
  return 0;
}

function normHeader(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Parse EIA Form 923 "Page 1 Generation and Fuel Data" sheet.
 * Filters to PV solar (fuel_code = SUN, prime_mover = PV) and aggregates
 * generator-level rows to plant totals.
 */
export function parseEia923(xlsxPath: string): EIA923PlantTotals[] {
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName =
    wb.SheetNames.find((n) => /page 1/i.test(n)) ??
    wb.SheetNames.find((n) => /generation/i.test(n)) ??
    wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  const headerRow = pickHeaderRow(grid);
  const headers = (grid[headerRow] ?? []).map(normHeader);
  const rows = grid.slice(headerRow + 1);

  const headerNorm = (target: string) =>
    target.replace(/\s+/g, " ").trim().toLowerCase();
  const idx = (name: string) => {
    const target = headerNorm(name);
    return headers.findIndex((h) => h.toLowerCase() === target);
  };

  const iPlantId = idx("Plant Id");
  const iPlantName = idx("Plant Name");
  const iFuel = idx("Reported Fuel Type Code");
  const iPrime = idx("Reported Prime Mover");
  const iYear = idx("YEAR");
  const iAnnual = idx("Net Generation (Megawatthours)");

  if (iPlantId < 0 || iFuel < 0 || iPrime < 0 || iAnnual < 0) {
    throw new Error(
      `EIA 923: required column(s) missing. Found headers: ${headers.slice(0, 30).join(" | ")}`,
    );
  }

  const monthIdx = MONTH_COLS.map((m) => idx(m));

  const byPlant = new Map<string, EIA923PlantTotals>();
  let yearSeen = 0;
  for (const row of rows) {
    const fuel = String(row[iFuel] ?? "").trim();
    const prime = String(row[iPrime] ?? "").trim();
    if (fuel !== "SUN" || prime !== "PV") continue;
    const id = String(row[iPlantId] ?? "").trim();
    if (!id) continue;
    if (iYear >= 0) {
      const y = num(row[iYear]);
      if (y > 0) yearSeen = y;
    }
    const monthly = monthIdx.map((i) => (i >= 0 ? num(row[i]) : 0));
    const annual = num(row[iAnnual]);

    const existing = byPlant.get(id);
    if (existing) {
      existing.annual_mwh += annual;
      for (let m = 0; m < 12; m++) existing.monthly_mwh[m] += monthly[m] ?? 0;
    } else {
      byPlant.set(id, {
        eia_plant_id: id,
        name_923: String(row[iPlantName] ?? ""),
        annual_mwh: annual,
        monthly_mwh: monthly,
        year: yearSeen,
      });
    }
  }
  return Array.from(byPlant.values());
}
