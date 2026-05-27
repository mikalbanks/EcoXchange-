import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import type { EIA860Record } from "../utils/types.js";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function pickHeaderRow(rows: unknown[][]): number {
  // EIA workbooks have 1-2 header banner rows before the actual column names.
  // The real header row is the first one that contains "Plant Code".
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i] ?? [];
    if (row.some((c) => String(c ?? "").trim() === "Plant Code")) return i;
  }
  return 0;
}

/**
 * Parse EIA Form 860 solar generators ("3_1_Solar_Y{year}.xlsx", "Operable" sheet).
 * Aggregates generator rows to plant level via summed nameplate capacity.
 */
export function parseEia860(xlsxPath: string): EIA860Record[] {
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  // Common sheet names: "Operable", "Operable Solar"
  const sheetName =
    wb.SheetNames.find((n) => /operable/i.test(n)) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];
  const headerRow = pickHeaderRow(grid);
  const headers = (grid[headerRow] ?? []).map((c) =>
    String(c ?? "").trim(),
  );
  const rows = grid.slice(headerRow + 1);

  const idx = (name: string) =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const iPlantCode = idx("Plant Code");
  const iPlantName = idx("Plant Name");
  const iCap = idx("Nameplate Capacity (MW)");
  const iTech = idx("Technology");
  const iPrime = idx("Prime Mover");
  const iLat = idx("Latitude");
  const iLon = idx("Longitude");
  const iOpYear = idx("Operating Year");
  const iAz = idx("Azimuth Angle");
  const iTilt = idx("Tilt Angle");

  if (iPlantCode < 0 || iCap < 0) {
    throw new Error("EIA 860: required columns missing");
  }

  const byPlant = new Map<string, EIA860Record>();
  for (const row of rows) {
    const plantCode = row[iPlantCode];
    if (plantCode === null || plantCode === undefined || plantCode === "")
      continue;
    const tech = String(row[iTech] ?? "");
    const prime = String(row[iPrime] ?? "");
    if (!/photovoltaic/i.test(tech) && prime !== "PV") continue;

    const id = String(plantCode);
    const existing = byPlant.get(id);
    const cap = num(row[iCap]) ?? 0;
    if (existing) {
      existing.capacity_mw_860 += cap;
      // tilt/azimuth: prefer first non-null value
      if (existing.tilt_deg === null) existing.tilt_deg = num(row[iTilt]);
      if (existing.azimuth_deg === null)
        existing.azimuth_deg = num(row[iAz]);
    } else {
      byPlant.set(id, {
        eia_plant_id: id,
        name_eia: String(row[iPlantName] ?? ""),
        capacity_mw_860: cap,
        technology: tech,
        prime_mover: prime,
        latitude_eia: num(row[iLat]),
        longitude_eia: num(row[iLon]),
        operating_year: num(row[iOpYear]),
        azimuth_deg: iAz >= 0 ? num(row[iAz]) : null,
        tilt_deg: iTilt >= 0 ? num(row[iTilt]) : null,
      });
    }
  }
  return Array.from(byPlant.values());
}
