import { supabase } from "../lib/supabase.js";
import { computeImpact } from "../utils/impact-calculator.js";
import { STATE_TO_EGRID, EPA_CONSTANTS } from "../config/epa-constants.js";
import demoImpactJson from "./demo-impact.json";
import type {
  ImpactMetrics,
  ImpactView,
  MonthlyImpactPoint,
} from "../types/impact.js";

const demoImpact = demoImpactJson as ImpactView;

interface DbProject {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}
interface DbRecord {
  status: "verified" | "flagged" | "pending";
  period_start: string;
  inverter_kwh: number | null;
}

// Simplified state derivation for MVP (real impl would reverse-geocode).
export function deriveStateFromCoords(lat: number, lon: number): string {
  if (lat > 30.5 && lat < 35 && lon > -85.6 && lon < -80.8) return "GA";
  if (lat > 41 && lat < 42.9 && lon > -73.5 && lon < -69.9) return "MA";
  if (lat > 31.3 && lat < 37 && lon > -114.8 && lon < -109) return "AZ";
  if (lat > 32.5 && lat < 42 && lon > -124.5 && lon < -114.1) return "CA";
  if (lat > 25.5 && lat < 31 && lon > -87.6 && lon < -80) return "FL";
  if (lat > 25.8 && lat < 36.5 && lon > -106.6 && lon < -93.5) return "TX";
  if (lat > 33.3 && lat < 36.6 && lon > -84.3 && lon < -75.5) return "NC";
  if (lat > 40 && lat < 45.1 && lon > -79.8 && lon < -71.9) return "NY";
  if (lat > 38.8 && lat < 42.5 && lon > -75.6 && lon < -73.9) return "NJ";
  return "GA"; // default for demo
}

async function loadRecords(projectId: string): Promise<DbRecord[]> {
  const { data } = await supabase!
    .from("verification_records")
    .select("status, period_start, inverter_kwh")
    .eq("project_id", projectId)
    .order("period_start", { ascending: true });
  return (data ?? []) as DbRecord[];
}

function impactInputFromRecords(records: DbRecord[], state_code: string) {
  const verified = records.filter((r) => r.status === "verified");
  const flagged = records.filter((r) => r.status === "flagged");
  return {
    verified_kwh: verified.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0),
    unverified_kwh: flagged.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0),
    state_code,
    months_verified: verified.length,
    months_flagged: flagged.length,
    period_start: records[0]?.period_start ?? "",
    period_end: records[records.length - 1]?.period_start ?? "",
  };
}

// Per-project impact (Spec 08 getProjectImpact, adapted to the app's client).
export async function getProjectImpact(
  projectId: string,
): Promise<ImpactMetrics | null> {
  if (!supabase) return demoImpact;
  const { data: project } = await supabase
    .from("projects")
    .select("latitude, longitude, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const records = await loadRecords(projectId);
  if (records.length === 0) return null;
  const state = deriveStateFromCoords(
    (project as DbProject).latitude,
    (project as DbProject).longitude,
  );
  return computeImpact(impactInputFromRecords(records, state));
}

// Portfolio-level view consumed by the Impact page: aggregate every active
// project's verified production + a combined monthly timeline.
export async function getImpactView(): Promise<ImpactView | null> {
  if (!supabase) return demoImpact;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, latitude, longitude")
    .eq("status", "active");
  const list = (projects ?? []) as DbProject[];
  if (list.length === 0) return null;

  const monthly = new Map<string, MonthlyImpactPoint>();
  let dominant: { region: string; factor: number; kwh: number } = {
    region: "NATIONAL",
    factor: EPA_CONSTANTS.CO2_KG_PER_KWH,
    kwh: -1,
  };
  const agg: ImpactMetrics = {
    verified_kwh: 0,
    unverified_kwh: 0,
    period_start: "",
    period_end: "",
    months_verified: 0,
    months_flagged: 0,
    co2_avoided_kg: 0,
    co2_avoided_metric_tons: 0,
    homes_powered_years: 0,
    trees_equivalent: 0,
    smartphone_charges: 0,
    gallons_gas_avoided: 0,
    miles_driving_avoided: 0,
    acres_forest_equivalent: 0,
    data_source: "production_verified",
    egrid_region: "NATIONAL",
    egrid_factor_used: EPA_CONSTANTS.CO2_KG_PER_KWH,
  };

  for (const project of list) {
    const records = await loadRecords(project.id);
    if (records.length === 0) continue;
    const state = deriveStateFromCoords(project.latitude, project.longitude);
    const m = computeImpact(impactInputFromRecords(records, state));

    agg.verified_kwh += m.verified_kwh;
    agg.unverified_kwh += m.unverified_kwh;
    agg.months_verified += m.months_verified;
    agg.months_flagged += m.months_flagged;
    agg.co2_avoided_kg += m.co2_avoided_kg;
    agg.co2_avoided_metric_tons += m.co2_avoided_metric_tons;
    agg.homes_powered_years += m.homes_powered_years;
    agg.trees_equivalent += m.trees_equivalent;
    agg.smartphone_charges += m.smartphone_charges;
    agg.gallons_gas_avoided += m.gallons_gas_avoided;
    agg.miles_driving_avoided += m.miles_driving_avoided;
    agg.acres_forest_equivalent += m.acres_forest_equivalent;

    if (m.verified_kwh > dominant.kwh) {
      dominant = {
        region: m.egrid_region,
        factor: m.egrid_factor_used,
        kwh: m.verified_kwh,
      };
    }

    for (const r of records) {
      if (r.status !== "verified") continue; // only verified months count
      const period = r.period_start.slice(0, 7); // YYYY-MM
      const kwh = r.inverter_kwh ?? 0;
      const point = monthly.get(period) ?? {
        period,
        verified_kwh: 0,
        co2_kg: 0,
      };
      point.verified_kwh += kwh;
      point.co2_kg += kwh * m.egrid_factor_used;
      monthly.set(period, point);
    }
  }

  const periods = [...monthly.keys()].sort();
  agg.egrid_region = dominant.region;
  agg.egrid_factor_used = dominant.factor;
  agg.period_start = periods[0] ? `${periods[0]}-01` : "";
  agg.period_end = periods[periods.length - 1]
    ? `${periods[periods.length - 1]}-01`
    : "";

  return {
    ...agg,
    monthly_breakdown: periods.map((p) => monthly.get(p)!),
  };
}

// State-derivation lookup is exported for callers that already know the state.
export { STATE_TO_EGRID };
