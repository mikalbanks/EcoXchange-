import { supabase } from "../lib/supabase.js";
import type {
  Portfolio,
  PortfolioProject,
  ProjectBundle,
  VerificationRecord,
} from "../utils/types.js";

const HOURS_PER_YEAR = 8760;

export interface ReferenceSummary {
  total_plants: number;
  mean_deviation_pct: number;
  pct_within_10: number;
  total_capacity_mw: number;
}

export interface ReferenceLibrary {
  summary: ReferenceSummary;
  projects: PortfolioProject[];
}

interface DbProject {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_efficiency: number;
  system_losses: number;
  commissioning_date: string;
  offtake_type: string | null;
  ppa_rate_per_kwh: number | null;
  status: PortfolioProject["status"];
}

interface DbVerificationRecord {
  project_id: string;
  period_start: string;
  period_end: string;
  inverter_kwh: number | null;
  utility_kwh: number | null;
  expected_kwh: number;
  inv_vs_expected_pct: number | null;
  inv_vs_utility_pct: number | null;
  util_vs_expected_pct: number | null;
  status: "verified" | "flagged" | "pending";
  flag_reasons: string[] | null;
  estimated_revenue: number | null;
}

function locationFromCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

function meanDeviation(records: DbVerificationRecord[]): number {
  const devs = records
    .map((r) => r.inv_vs_expected_pct)
    .filter((v): v is number => v !== null);
  if (devs.length === 0) return 0;
  return devs.reduce((s, v) => s + v, 0) / devs.length;
}

export async function loadReferenceLibrary(): Promise<ReferenceLibrary | null> {
  if (!supabase) return null;
  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "id, name, latitude, longitude, capacity_kw_dc, tilt_deg, azimuth_deg, module_efficiency, system_losses, commissioning_date, offtake_type, ppa_rate_per_kwh, status",
    )
    .eq("status", "reference")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`loadReferenceLibrary: ${error.message}`);
  const list = (projects ?? []) as DbProject[];
  const ids = list.map((p) => p.id);
  let recordsByProject = new Map<string, DbVerificationRecord[]>();
  if (ids.length > 0) {
    const { data: recs, error: rerr } = await supabase
      .from("verification_records")
      .select(
        "project_id, period_start, period_end, inverter_kwh, utility_kwh, expected_kwh, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct, status, flag_reasons, estimated_revenue",
      )
      .in("project_id", ids)
      .order("period_start", { ascending: true });
    if (rerr) throw new Error(`loadReferenceLibrary: ${rerr.message}`);
    for (const r of (recs ?? []) as DbVerificationRecord[]) {
      const bucket = recordsByProject.get(r.project_id);
      if (bucket) bucket.push(r);
      else recordsByProject.set(r.project_id, [r]);
    }
  }

  let totalDev = 0;
  let count = 0;
  let within10 = 0;
  let totalCapacityKw = 0;

  const cards: PortfolioProject[] = list.map((p) => {
    const recs = recordsByProject.get(p.id) ?? [];
    const totalKwh = recs.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0);
    const annualMwh = (totalKwh * 12) / Math.max(1, recs.length) / 1000;
    const latest = recs[recs.length - 1];
    const dev = meanDeviation(recs);
    totalDev += dev;
    count += 1;
    if (Math.abs(dev) <= 10) within10 += 1;
    totalCapacityKw += p.capacity_kw_dc;
    return {
      id: p.id,
      name: p.name,
      location: locationFromCoords(p.latitude, p.longitude),
      capacity_kw: p.capacity_kw_dc,
      status: p.status,
      latest_verification: latest?.status ?? "pending",
      latest_period: latest?.period_start ?? "",
      ytd_production_mwh: Math.round(totalKwh / 1000),
      monthly_yield_usd: Math.round(
        ((latest?.estimated_revenue ?? 0) * 0.02) / 1,
      ),
      investor_share_pct: 2,
      // Stash mean deviation on the type for the card to render
      // (reusing PortfolioProject shape — investor_share_pct is irrelevant for references)
      // We expose it through `_deviation` via type cast below.
      ...({ _deviation_pct: dev, _annual_mwh: annualMwh } as unknown as Record<string, never>),
    };
  });

  return {
    summary: {
      total_plants: count,
      mean_deviation_pct: count > 0 ? totalDev / count : 0,
      pct_within_10: count > 0 ? (within10 / count) * 100 : 0,
      total_capacity_mw: totalCapacityKw / 1000,
    },
    projects: cards,
  };
}

export async function loadReferenceDetail(
  id: string,
): Promise<ProjectBundle | null> {
  if (!supabase) return null;
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, latitude, longitude, capacity_kw_dc, tilt_deg, azimuth_deg, module_efficiency, system_losses, commissioning_date, offtake_type, ppa_rate_per_kwh, status",
    )
    .eq("id", id)
    .eq("status", "reference")
    .maybeSingle();
  if (error) throw new Error(`loadReferenceDetail: ${error.message}`);
  if (!project) return null;
  const p = project as DbProject;

  const { data: recs, error: rerr } = await supabase
    .from("verification_records")
    .select(
      "project_id, period_start, period_end, inverter_kwh, utility_kwh, expected_kwh, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct, status, flag_reasons, estimated_revenue",
    )
    .eq("project_id", id)
    .order("period_start", { ascending: true });
  if (rerr) throw new Error(`loadReferenceDetail: ${rerr.message}`);
  const records: VerificationRecord[] = ((recs ?? []) as DbVerificationRecord[]).map(
    (r) => ({
      period_start: r.period_start,
      inverter_kwh: r.inverter_kwh ?? 0,
      expected_kwh: r.expected_kwh,
      utility_kwh: r.utility_kwh,
      inv_vs_expected_pct: r.inv_vs_expected_pct ?? 0,
      inv_vs_utility_pct: r.inv_vs_utility_pct,
      util_vs_expected_pct: r.util_vs_expected_pct,
      status: r.status,
      flag_reasons: r.flag_reasons ?? [],
      estimated_revenue: r.estimated_revenue ?? 0,
    }),
  );

  const totalKwh = records.reduce((s, r) => s + r.inverter_kwh, 0);
  const totalExpected = records.reduce((s, r) => s + r.expected_kwh, 0);
  const months = records.length;
  const annualKwh = months > 0 ? (totalKwh * 12) / months : 0;
  const cf =
    p.capacity_kw_dc > 0
      ? (annualKwh / (p.capacity_kw_dc * HOURS_PER_YEAR)) * 100
      : 0;
  const deviation =
    totalExpected > 0
      ? ((totalKwh - totalExpected) / totalExpected) * 100
      : 0;
  void deviation; // used by detail page via direct compute

  return {
    project: {
      id: p.id,
      name: p.name,
      location: locationFromCoords(p.latitude, p.longitude),
      latitude: p.latitude,
      longitude: p.longitude,
      capacity_kw: p.capacity_kw_dc,
      tilt_deg: p.tilt_deg,
      azimuth_deg: p.azimuth_deg,
      module_efficiency: p.module_efficiency,
      system_losses: p.system_losses,
      commissioning_date: p.commissioning_date,
      offtake_type: p.offtake_type ?? "ppa",
      ppa_rate_per_kwh: p.ppa_rate_per_kwh ?? 0,
      status: p.status,
    },
    verification_records: records,
    summary: {
      annual_production_mwh: Math.round((annualKwh / 1000) * 10) / 10,
      capacity_factor_pct: Math.round(cf * 10) / 10,
      months_verified: records.filter((r) => r.status === "verified").length,
      months_flagged: records.filter((r) => r.status === "flagged").length,
      total_revenue_estimate: Math.round(
        records.reduce((s, r) => s + r.estimated_revenue, 0),
      ),
      ppa_rate: p.ppa_rate_per_kwh ?? 0,
    },
  };
}

/** Public shape for the library page: extends PortfolioProject with reference-specific fields. */
export interface ReferenceProjectCard extends PortfolioProject {
  _deviation_pct?: number;
  _annual_mwh?: number;
}

export type { Portfolio };
