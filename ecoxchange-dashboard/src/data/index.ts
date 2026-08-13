import demoPortfolio from "./demo-portfolio.json";
import { DEMO_OFFERING } from "./demo-offering.js";
import demoSavannah from "./demo-savannah.json";
import demoSavannahFlagged from "./demo-savannah-flagged.json";
import { PVDAQ_9068_PROJECT_ID, toProjectBundle } from "./demo-pvdaq-9068.js";
import type {
  Portfolio,
  PortfolioProject,
  ProjectBundle,
  ProjectMeta,
  VerificationRecord,
} from "../utils/types.js";
import { supabase, liveMode } from "../lib/supabase.js";

const portfolio = demoPortfolio as Portfolio;
const verified = demoSavannah as ProjectBundle;
const flagged = demoSavannahFlagged as ProjectBundle;

export interface LoadOptions {
  variant?: "verified" | "flagged";
}

export { liveMode };

/**
 * The project any "show me a verification record" entry point lands on — the
 * demo entry card and the sidebar's Verification item both need a concrete
 * project and period, and neither can await a load before rendering a link.
 *
 * Derived from the portfolio fixture rather than hard-coded so the two links
 * cannot drift from the data. Both the verified and flagged Savannah bundles
 * cover the same period range, so this resolves under either scenario.
 */
export const PRIMARY_DEMO_PROJECT = {
  id: portfolio.projects[0]?.id ?? "demo-savannah-5mw",
  latestPeriod: portfolio.projects[0]?.latest_period ?? "2024-12-01",
} as const;

/** Route to the latest monthly determination for the primary demo project. */
export const LATEST_VERIFICATION_PATH = `/investor/project/${PRIMARY_DEMO_PROJECT.id}/verification/${PRIMARY_DEMO_PROJECT.latestPeriod}`;

// Investor placeholder constants — Phase 3 reads real production data from
// Supabase, but the investor-account side (capital deployed, share pct) is
// still mocked until that layer is built. Same values in demo mode for parity,
// both derived from the canonical offering so live and demo agree.
const INVESTOR_SHARE_PCT = DEMO_OFFERING.demo_investor.ownership_pct;
const INVESTOR_SHARE = INVESTOR_SHARE_PCT / 100;
const INVESTOR_TOTAL_INVESTED = DEMO_OFFERING.demo_investor.position_value_usd;

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

export async function loadPortfolio(): Promise<Portfolio> {
  if (supabase) return loadPortfolioLive();
  return portfolio;
}

export async function loadProject(
  id: string,
  opts: LoadOptions = {},
): Promise<ProjectBundle | null> {
  // The flagged demo toggle always reads from the static JSON, even when
  // Supabase is configured — it's a UX demo of the FLAGGED state.
  if (opts.variant === "flagged") {
    return id === "demo-savannah-5mw" || id === flagged.project.id
      ? flagged
      : null;
  }
  // PVDAQ 9068 is served from the static bundle in BOTH modes. Its production
  // leg is measured telemetry, so it is the same data either way, and it stays
  // reachable before anyone applies supabase/seed/004_pvdaq_9068_measured.sql.
  // See demo-pvdaq-9068.ts for what each leg is and is not.
  if (id === PVDAQ_9068_PROJECT_ID) return toProjectBundle();
  if (supabase) return loadProjectLive(id);
  if (id !== "demo-savannah-5mw") return null;
  return verified;
}

export async function loadVerification(
  id: string,
  period: string,
  opts: LoadOptions = {},
): Promise<{ project: ProjectMeta; record: VerificationRecord } | null> {
  const bundle = await loadProject(id, opts);
  if (!bundle) return null;
  const record = bundle.verification_records.find(
    (r) => r.period_start === period,
  );
  if (!record) return null;
  return { project: bundle.project, record };
}

// ─────────────────────────────────────────────────────────────────────────
// Supabase loaders
// ─────────────────────────────────────────────────────────────────────────

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
  status: "active" | "suspended" | "onboarding" | "decommissioned";
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
  // Spec 23 (migration 015). Optional: null on every row written before it,
  // and this app must render those without pretending they had bands.
  gate_band_pct?: number | null;
  detect_band_pct?: number | null;
  detect_exceeded?: boolean | null;
  persistence_triggered?: boolean | null;
}

async function loadPortfolioLive(): Promise<Portfolio> {
  const { data: projects, error } = await supabase!
    .from("projects")
    .select("id, name, latitude, longitude, capacity_kw_dc, status")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`loadPortfolio: ${error.message}`);

  const list = (projects ?? []) as Pick<
    DbProject,
    "id" | "name" | "latitude" | "longitude" | "capacity_kw_dc" | "status"
  >[];

  const ids = list.map((p) => p.id);
  let recordsByProject = new Map<string, DbVerificationRecord[]>();
  if (ids.length > 0) {
    const { data: recs, error: rerr } = await supabase!
      .from("verification_records")
      .select(
        "project_id, period_start, period_end, inverter_kwh, utility_kwh, expected_kwh, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct, status, flag_reasons, estimated_revenue, gate_band_pct, detect_band_pct, detect_exceeded, persistence_triggered",
      )
      .in("project_id", ids)
      .order("period_start", { ascending: true });
    if (rerr) throw new Error(`loadPortfolio: ${rerr.message}`);
    recordsByProject = groupBy(
      (recs ?? []) as DbVerificationRecord[],
      "project_id",
    );
  }

  let monthlyYield = 0;
  let lifetimeYield = 0;
  const projectCards: PortfolioProject[] = list.map((p) => {
    const recs = recordsByProject.get(p.id) ?? [];
    const totalMwh =
      recs.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0) / 1000;
    const latest = recs[recs.length - 1];
    const projectMonthly =
      (latest?.estimated_revenue ?? 0) * INVESTOR_SHARE;
    const projectLifetime =
      recs.reduce((s, r) => s + (r.estimated_revenue ?? 0), 0) * INVESTOR_SHARE;
    monthlyYield += projectMonthly;
    lifetimeYield += projectLifetime;
    return {
      id: p.id,
      name: p.name,
      location: locationFromCoords(p.latitude, p.longitude),
      capacity_kw: p.capacity_kw_dc,
      status: p.status,
      latest_verification: latest?.status ?? "pending",
      latest_period: latest?.period_start ?? "",
      ytd_production_mwh: round1(totalMwh),
      monthly_yield_usd: round2(projectMonthly),
      investor_share_pct: INVESTOR_SHARE_PCT,
    };
  });

  return {
    portfolio: {
      total_invested: INVESTOR_TOTAL_INVESTED,
      monthly_yield_usd: round2(monthlyYield),
      lifetime_yield_usd: round2(lifetimeYield),
      active_projects: projectCards.length,
    },
    projects: projectCards,
  };
}

async function loadProjectLive(id: string): Promise<ProjectBundle | null> {
  const { data: project, error } = await supabase!
    .from("projects")
    .select(
      "id, name, latitude, longitude, capacity_kw_dc, tilt_deg, azimuth_deg, module_efficiency, system_losses, commissioning_date, offtake_type, ppa_rate_per_kwh, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`loadProject: ${error.message}`);
  if (!project) return null;
  const p = project as DbProject;

  const { data: recs, error: rerr } = await supabase!
    .from("verification_records")
    .select(
      "project_id, period_start, period_end, inverter_kwh, utility_kwh, expected_kwh, inv_vs_expected_pct, inv_vs_utility_pct, util_vs_expected_pct, status, flag_reasons, estimated_revenue, gate_band_pct, detect_band_pct, detect_exceeded, persistence_triggered",
    )
    .eq("project_id", id)
    .order("period_start", { ascending: true });
  if (rerr) throw new Error(`loadProject: ${rerr.message}`);

  const records: VerificationRecord[] = (recs ?? []).map((r) => {
    const rec = r as DbVerificationRecord;
    return {
      period_start: rec.period_start,
      inverter_kwh: rec.inverter_kwh ?? 0,
      expected_kwh: rec.expected_kwh,
      utility_kwh: rec.utility_kwh,
      inv_vs_expected_pct: rec.inv_vs_expected_pct ?? 0,
      inv_vs_utility_pct: rec.inv_vs_utility_pct,
      util_vs_expected_pct: rec.util_vs_expected_pct,
      status: rec.status,
      flag_reasons: rec.flag_reasons ?? [],
      estimated_revenue: rec.estimated_revenue ?? 0,
    };
  });

  const totalKwh = records.reduce((s, r) => s + r.inverter_kwh, 0);
  const totalRevenue = records.reduce((s, r) => s + r.estimated_revenue, 0);
  const months = records.length;
  const annualKwh = months > 0 ? (totalKwh * 12) / months : 0;
  const cf =
    p.capacity_kw_dc > 0
      ? (annualKwh / (p.capacity_kw_dc * 8760)) * 100
      : 0;

  const meta: ProjectMeta = {
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
    offtake_type: p.offtake_type ?? "community_solar",
    ppa_rate_per_kwh: p.ppa_rate_per_kwh ?? 0,
    status: p.status,
  };

  return {
    project: meta,
    verification_records: records,
    summary: {
      annual_production_mwh: round1(annualKwh / 1000),
      capacity_factor_pct: round1(cf),
      months_verified: records.filter((r) => r.status === "verified").length,
      months_flagged: records.filter((r) => r.status === "flagged").length,
      total_revenue_estimate: Math.round(totalRevenue),
      ppa_rate: p.ppa_rate_per_kwh ?? 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

function groupBy<T, K extends keyof T>(arr: T[], key: K): Map<T[K], T[]> {
  const m = new Map<T[K], T[]>();
  for (const item of arr) {
    const k = item[key];
    const bucket = m.get(k);
    if (bucket) bucket.push(item);
    else m.set(k, [item]);
  }
  return m;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function locationFromCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}
