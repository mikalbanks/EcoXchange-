import { getSupabase } from "./client.js";
import type {
  DbProject,
  DbSatelliteReading,
  DbVerificationRecord,
  ProjectStatus,
} from "./types.js";

const PROJECT_COLUMNS =
  "id, name, latitude, longitude, timezone, capacity_kw_dc, tilt_deg, azimuth_deg, module_efficiency, system_losses, degradation_rate, commissioning_date, inverter_brand, offtake_type, ppa_rate_per_kwh, ppa_escalator, status, created_at";

const VERIFICATION_COLUMNS =
  "project_id, period_start, period_end, inverter_kwh, utility_kwh, expected_kwh, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct, status, flag_reasons, tolerance_config, estimated_revenue, engine_version";

export interface ListProjectsFilter {
  status?: ProjectStatus | "all";
  minCapacityKw?: number;
  maxCapacityKw?: number;
  offtakeType?: string;
}

export async function listProjects(
  filter: ListProjectsFilter = {},
): Promise<DbProject[]> {
  const supabase = getSupabase();
  let q = supabase.from("projects").select(PROJECT_COLUMNS);
  if (!filter.status || filter.status !== "all") {
    q = q.eq("status", filter.status ?? "active");
  }
  if (filter.minCapacityKw !== undefined) {
    q = q.gte("capacity_kw_dc", filter.minCapacityKw);
  }
  if (filter.maxCapacityKw !== undefined) {
    q = q.lte("capacity_kw_dc", filter.maxCapacityKw);
  }
  if (filter.offtakeType && filter.offtakeType !== "all") {
    q = q.eq("offtake_type", filter.offtakeType);
  }
  q = q.order("created_at", { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(`listProjects: ${error.message}`);
  return (data ?? []) as DbProject[];
}

export async function getProjectById(id: string): Promise<DbProject | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProjectById: ${error.message}`);
  return (data as DbProject | null) ?? null;
}

export async function getVerificationHistory(
  projectId: string,
): Promise<DbVerificationRecord[]> {
  const { data, error } = await getSupabase()
    .from("verification_records")
    .select(VERIFICATION_COLUMNS)
    .eq("project_id", projectId)
    .order("period_start", { ascending: true });
  if (error) throw new Error(`getVerificationHistory: ${error.message}`);
  return (data ?? []) as DbVerificationRecord[];
}

export async function getVerificationHistoryForMany(
  projectIds: string[],
): Promise<DbVerificationRecord[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("verification_records")
    .select(VERIFICATION_COLUMNS)
    .in("project_id", projectIds)
    .order("period_start", { ascending: true });
  if (error) throw new Error(`getVerificationHistoryForMany: ${error.message}`);
  return (data ?? []) as DbVerificationRecord[];
}

export async function getSatelliteReadings(
  projectId: string,
): Promise<DbSatelliteReading[]> {
  const { data, error } = await getSupabase()
    .from("raw_readings")
    .select("project_id, period_start, ghi_kwh_m2")
    .eq("project_id", projectId)
    .eq("source", "satellite")
    .order("period_start", { ascending: true });
  if (error) throw new Error(`getSatelliteReadings: ${error.message}`);
  return (data ?? []) as DbSatelliteReading[];
}
