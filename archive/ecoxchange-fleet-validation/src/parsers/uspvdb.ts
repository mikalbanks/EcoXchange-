import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type {
  AxisType,
  PanelTechnology,
  USPVDBRecord,
} from "../utils/types.js";

function normalizeTech(raw: string): PanelTechnology {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("thin")) return "Thin Film";
  if (v.includes("crystal") || v.includes("c-si") || v.includes("silicon"))
    return "Crystalline Silicon";
  return "Unknown";
}

function normalizeAxis(raw: string): AxisType {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("dual")) return "Dual Axis Tracking";
  if (v.includes("single") || v.includes("tracking")) return "Single Axis Tracking";
  return "Fixed";
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the USPVDB CSV. Spec §1.1.
 */
export function parseUspvdb(csvPath: string): USPVDBRecord[] {
  const text = readFileSync(csvPath, "utf8");
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const out: USPVDBRecord[] = [];
  for (const r of rows) {
    const lat = num(r.ylat);
    const lon = num(r.xlong);
    const capDc = num(r.p_cap_dc);
    if (lat === null || lon === null || capDc === null) continue;
    const eiaId = (r.eia_id ?? "").trim();
    out.push({
      uspvdb_id: r.case_id ?? r.uniqueid ?? r.objectid ?? "",
      name: r.p_name ?? "Unnamed",
      state: r.p_state ?? "",
      county: r.p_county || null,
      latitude: lat,
      longitude: lon,
      capacity_ac_mw: num(r.p_cap_ac),
      capacity_dc_mw: capDc,
      panel_technology: normalizeTech(r.p_tech_primary ?? ""),
      axis_type: normalizeAxis(r.p_axis ?? ""),
      commissioning_year: num(r.p_year) ?? 0,
      eia_plant_id: eiaId.length > 0 && eiaId !== "0" ? eiaId : null,
    });
  }
  return out;
}
