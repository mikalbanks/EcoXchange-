import demoPortfolio from "./demo-portfolio.json";
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

const simulatedAccountPortfolio = demoPortfolio as Portfolio;
const verified = demoSavannah as ProjectBundle;
const flagged = demoSavannahFlagged as ProjectBundle;
export const SIMULATED_STRESS_PROJECT_ID = "demo-savannah-5mw";

export interface LoadOptions {
  variant?: "verified" | "flagged";
}

export interface VerificationEvidence {
  badge: string;
  title: string;
  description: string;
  diagramTitle: string;
  sourceNames: {
    inverter: string;
    utility: string;
    satellite: string;
  };
  sourceBasis: {
    inverter: "measured" | "simulated" | "unconfirmed";
    utility: "measured" | "derived" | "simulated" | "unconfirmed";
    satellite: "modeled" | "simulated" | "unconfirmed";
  };
}

export interface TransactionPolicy {
  state: "disabled" | "simulated";
  badge: string;
  title: string;
  description: string;
}

export { liveMode };

export function describeVerificationEvidence(
  id: string,
  mode: "supabase" | "demo",
): VerificationEvidence {
  if (id === PVDAQ_9068_PROJECT_ID) {
    return {
      badge: "PARTIAL REAL DATA",
      title: "Two independent inputs, one derived leg",
      description:
        "Inverter production is measured PVDAQ telemetry and expected production is modeled from NASA POWER. The utility leg is derived from the inverter series, not a utility measurement.",
      diagramTitle: "Measured and Modeled Source Comparison",
      sourceNames: {
        inverter: "Measured Inverter Telemetry",
        utility: "Utility Proxy (Derived)",
        satellite: "NASA POWER Model Input",
      },
      sourceBasis: {
        inverter: "measured",
        utility: "derived",
        satellite: "modeled",
      },
    };
  }

  if (mode === "demo") {
    return {
      badge: "SIMULATED COMPARISON",
      title: "Illustrative engine determination",
      description:
        "All three legs on this Savannah scenario are static demo data. The status demonstrates the workflow and thresholds; it is not independent operating verification.",
      diagramTitle: "Simulated Source Comparison",
      sourceNames: {
        inverter: "Simulated Inverter",
        utility: "Simulated Utility Meter",
        satellite: "Simulated NASA Model Input",
      },
      sourceBasis: {
        inverter: "simulated",
        utility: "simulated",
        satellite: "simulated",
      },
    };
  }

  return {
    badge: "DATABASE RECORD",
    title: "Per-leg provenance is not encoded",
    description:
      "This determination is loaded from Supabase, but the current record does not identify whether each leg is measured, uploaded, or derived. Confirm source independence outside this screen before relying on the status.",
    diagramTitle: "Stored Source Comparison",
    sourceNames: {
      inverter: "Inverter Telemetry (Basis Unstated)",
      utility: "Utility Meter (Basis Unstated)",
      satellite: "NASA POWER (Model Input)",
    },
    sourceBasis: {
      inverter: "unconfirmed",
      utility: "unconfirmed",
      satellite: "unconfirmed",
    },
  };
}

/**
 * Transaction data is only exposed in the explicitly selected Savannah stress
 * scenario. The primary PVDAQ path is a research dataset with no offering,
 * ownership, or distribution attached. Supabase verification records also
 * fail closed until a real offering/account data source is connected.
 */
export function describeTransactionPolicy(
  mode: "supabase" | "demo",
  scenario: "verified" | "flagged",
  projectId?: string,
): TransactionPolicy {
  if (
    mode === "demo" &&
    scenario === "flagged" &&
    (projectId === undefined || projectId === SIMULATED_STRESS_PROJECT_ID)
  ) {
    return {
      state: "simulated",
      badge: "SIMULATED TRANSACTION WORKFLOW",
      title: "Savannah financial activity is illustrative",
      description:
        "Offering, ownership, distribution, wallet, and legal-document figures in this stress scenario are static fixtures. No investment, payment, or legal agreement is created.",
    };
  }

  return {
    state: "disabled",
    badge: "VERIFICATION-ONLY PILOT",
    title: "No transaction is attached to this dataset",
    description:
      mode === "supabase"
        ? "The connected records contain verification data only. Offering, ownership, and distribution workflows remain disabled until their authoritative sources and approvals are connected."
        : projectId && projectId !== PVDAQ_9068_PROJECT_ID
          ? "This project is not the active Savannah transaction simulation. It has no EcoXchange offering, investor position, ownership record, or distribution attached."
          : "PVDAQ 9068 is a production-research dataset. It has no EcoXchange offering, investor position, ownership record, or distribution attached.",
  };
}

export function describeDeterminationConsequence(
  status: VerificationRecord["status"],
  policy: TransactionPolicy,
): string {
  if (policy.state === "disabled") return "No transaction attached";
  if (status === "flagged") return "On hold (simulated)";
  if (status === "pending") return "Pending (simulated)";
  return "Eligible (simulated)";
}

/**
 * The public investor demo must start from a production series that was not
 * generated from the expected series. PVDAQ 9068 supplies measured inverter
 * telemetry; NASA POWER + pvlib supplies the independent expected leg. The
 * research dataset has no investor-account or distribution figures attached.
 */
function buildMeasuredDemoPortfolio(): Portfolio {
  const bundle = toProjectBundle();
  const latest = bundle.verification_records[bundle.verification_records.length - 1];
  if (!latest) throw new Error("PVDAQ 9068 demo bundle has no verification records");

  return {
    portfolio: {
      total_invested: 0,
      monthly_yield_usd: 0,
      lifetime_yield_usd: 0,
      active_projects: 1,
    },
    projects: [
      {
        id: bundle.project.id,
        name: bundle.project.name,
        location: bundle.project.location,
        capacity_kw: bundle.project.capacity_kw,
        status: bundle.project.status,
        latest_verification: latest.status,
        latest_period: latest.period_start,
        ytd_production_mwh: bundle.summary.annual_production_mwh,
        monthly_yield_usd: 0,
        investor_share_pct: 0,
      },
    ],
  };
}

const measuredDemoPortfolio = buildMeasuredDemoPortfolio();

/**
 * The project any "show me a verification record" entry point lands on. It is
 * derived from the default measured portfolio returned by loadPortfolio(), so
 * the landing page and sidebar cannot drift back to Savannah accidentally.
 */
export const PRIMARY_DEMO_PROJECT = {
  id: measuredDemoPortfolio.projects[0]!.id,
  latestPeriod: measuredDemoPortfolio.projects[0]!.latest_period,
} as const;

/** Route to the latest monthly determination for the primary demo project. */
export const LATEST_VERIFICATION_PATH = `/investor/project/${PRIMARY_DEMO_PROJECT.id}/verification/${PRIMARY_DEMO_PROJECT.latestPeriod}`;

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

export async function loadPortfolio(
  opts: LoadOptions = {},
): Promise<Portfolio> {
  if (supabase) return loadPortfolioLive();
  return opts.variant === "flagged"
    ? simulatedAccountPortfolio
    : measuredDemoPortfolio;
}

export async function loadProject(
  id: string,
  opts: LoadOptions = {},
): Promise<ProjectBundle | null> {
  // The investor golden path always resolves the measured asset first. This
  // also keeps a stale "flagged" presentation preference from making the
  // project disappear: PVDAQ already contains an observed flagged month.
  if (id === PVDAQ_9068_PROJECT_ID) return toProjectBundle();

  // The flagged demo toggle always reads from the static JSON, even when
  // Supabase is configured — it's a UX demo of the FLAGGED state.
  if (opts.variant === "flagged") {
    return id === "demo-savannah-5mw" || id === flagged.project.id
      ? flagged
      : null;
  }
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

  const projectCards: PortfolioProject[] = list.map((p) => {
    const recs = recordsByProject.get(p.id) ?? [];
    const totalMwh =
      recs.reduce((s, r) => s + (r.inverter_kwh ?? 0), 0) / 1000;
    const latest = recs[recs.length - 1];
    return {
      id: p.id,
      name: p.name,
      location: locationFromCoords(p.latitude, p.longitude),
      capacity_kw: p.capacity_kw_dc,
      status: p.status,
      latest_verification: latest?.status ?? "pending",
      latest_period: latest?.period_start ?? "",
      ytd_production_mwh: round1(totalMwh),
      monthly_yield_usd: 0,
      investor_share_pct: 0,
    };
  });

  return {
    portfolio: {
      total_invested: 0,
      monthly_yield_usd: 0,
      lifetime_yield_usd: 0,
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
      // Verification records do not establish an investor entitlement. Keep
      // finance out of this investor adapter until an authoritative offering
      // and account source is connected.
      estimated_revenue: 0,
    };
  });

  const totalKwh = records.reduce((s, r) => s + r.inverter_kwh, 0);
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
    offtake_type: "not_attached",
    ppa_rate_per_kwh: 0,
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
      total_revenue_estimate: 0,
      ppa_rate: 0,
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

function locationFromCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}
