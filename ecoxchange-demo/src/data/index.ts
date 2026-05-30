import verifiedData from "./demo-savannah.json";
import flaggedData from "./demo-savannah-flagged.json";
import type {
  AvailabilityStatus,
  DemoMode,
  DistributionPoint,
  Portfolio,
  PortfolioProject,
  Project,
  ProjectBundle,
  ProjectSummary,
  VerificationRecord,
  VerificationStatus,
} from "./types.js";
import { supabase, liveMode } from "../lib/supabase.js";
import { DEMO_ALLOCATION } from "../utils/demo-config.js";
import { locationFromCoords, lookupUsState } from "../utils/location.js";
import {
  applyReconciliation,
  normalizeToleranceConfig,
} from "../utils/reconciliation.js";

const verified = verifiedData as ProjectBundle;
const flagged = flaggedData as ProjectBundle;

type DbRow = Record<string, unknown>;

export interface LoadOptions {
  variant?: DemoMode;
}

export { liveMode };

export async function loadPortfolio(
  opts: LoadOptions = {},
): Promise<Portfolio> {
  const bundles = liveMode ? await loadActiveProjectBundlesLive() : [demoBundle(opts)];
  return buildPortfolio(bundles);
}

export async function loadProjectList(
  opts: LoadOptions = {},
): Promise<PortfolioProject[]> {
  const portfolio = await loadPortfolio(opts);
  return portfolio.projects;
}

export async function loadProject(
  id: string,
  opts: LoadOptions = {},
): Promise<ProjectBundle | null> {
  if (liveMode) return loadProjectLive(id);
  const bundle = demoBundle(opts);
  return bundle.project.id === id ? bundle : null;
}

export async function loadVerification(
  projectId: string,
  periodStart: string,
  opts: LoadOptions = {},
): Promise<{ project: Project; record: VerificationRecord } | null> {
  const bundle = await loadProject(projectId, opts);
  if (!bundle) return null;
  const record = bundle.verification_records.find(
    (item) => item.period_start === periodStart,
  );
  if (!record) return null;
  return { project: bundle.project, record };
}

async function loadActiveProjectBundlesLive(): Promise<ProjectBundle[]> {
  const { data: projects, error } = await supabase!
    .from("projects")
    .select("*")
    .eq("status", "active");
  if (error) throw new Error(`Projects query failed: ${error.message}`);

  const solarProjects = ((projects ?? []) as DbRow[]).filter(isSolarProject);
  const recordsByProject = await loadRecordsForProjects(
    solarProjects.map((project) => String(project.id)),
  );

  return solarProjects.map((project) =>
    bundleFromDbProject(project, recordsByProject.get(String(project.id)) ?? []),
  );
}

async function loadProjectLive(id: string): Promise<ProjectBundle | null> {
  const { data: project, error } = await supabase!
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Project query failed: ${error.message}`);
  if (!project || !isSolarProject(project as DbRow)) return null;
  const records = await loadRecordsForProjects([id]);
  return bundleFromDbProject(project as DbRow, records.get(id) ?? []);
}

async function loadRecordsForProjects(
  projectIds: string[],
): Promise<Map<string, DbRow[]>> {
  const recordsByProject = new Map<string, DbRow[]>();
  if (projectIds.length === 0) return recordsByProject;

  const { data: records, error } = await supabase!
    .from("verification_records")
    .select("*")
    .in("project_id", projectIds)
    .order("period_start", { ascending: true });
  if (error) {
    throw new Error(`Verification records query failed: ${error.message}`);
  }

  for (const record of (records ?? []) as DbRow[]) {
    const projectId = String(record.project_id);
    const bucket = recordsByProject.get(projectId);
    if (bucket) bucket.push(record);
    else recordsByProject.set(projectId, [record]);
  }
  return recordsByProject;
}

function bundleFromDbProject(project: DbRow, rows: DbRow[]): ProjectBundle {
  const latitude = numberField(project, ["latitude", "lat"], 0);
  const longitude = numberField(project, ["longitude", "lon", "lng"], 0);
  const capacityKw = numberField(project, ["capacity_kw_dc", "capacity_kw", "capacity"], 0);
  const state = lookupUsState(latitude, longitude);
  const records = rows.map((row) => recordFromDb(row, project));
  const ppaRate = numberField(project, ["ppa_rate_per_kwh", "ppa_rate"], 0);

  return {
    project: {
      id: String(project.id),
      name: stringField(project, ["name", "project_name"], "Solar Project"),
      location:
        stringField(project, ["location"], "") ||
        locationFromCoords(latitude, longitude),
      latitude,
      longitude,
      capacity_kw: capacityKw,
      tilt_deg: numberField(project, ["tilt_deg", "tilt"], 0),
      azimuth_deg: numberField(project, ["azimuth_deg", "azimuth"], 180),
      module_efficiency: normalizeRatio(
        numberField(project, ["module_efficiency"], 0.2),
      ),
      system_losses: normalizeRatio(numberField(project, ["system_losses"], 0.14)),
      commissioning_date: stringField(project, ["commissioning_date"], ""),
      offtake_type: stringField(project, ["offtake_type", "revenue_type"], "community_solar"),
      ppa_rate_per_kwh: ppaRate,
      status: stringField(project, ["status"], "active"),
      state_code: state?.code ?? null,
      state_name: state?.name ?? null,
      availability_status: availabilityFromProject(project),
      target_irr_pct: optionalNumberField(project, [
        "target_irr_pct",
        "target_net_irr_pct",
        "irr_pct",
      ]),
    },
    verification_records: records,
    summary: summaryFromRecords(records, capacityKw, ppaRate),
  };
}

function recordFromDb(record: DbRow, project: DbRow): VerificationRecord {
  const inverterKwh = optionalNumberField(record, ["inverter_kwh", "actual_kwh"]);
  const utilityKwh = optionalNumberField(record, ["utility_kwh", "meter_kwh"]);
  const expectedKwh = optionalNumberField(record, [
    "expected_kwh",
    "modeled_kwh",
  ]);
  const status = statusFromValue(record.status);
  const estimatedRevenue =
    optionalNumberField(record, ["estimated_revenue", "revenue_usd"]) ??
    (inverterKwh !== null && numberField(project, ["ppa_rate_per_kwh", "ppa_rate"], 0) > 0
      ? inverterKwh * numberField(project, ["ppa_rate_per_kwh", "ppa_rate"], 0)
      : null);

  return applyReconciliation({
    period_start: stringField(record, ["period_start", "period"], ""),
    inverter_kwh: inverterKwh,
    expected_kwh: expectedKwh,
    utility_kwh: utilityKwh,
    inv_vs_expected_pct: optionalNumberField(record, ["inv_vs_expected_pct"]),
    inv_vs_utility_pct: optionalNumberField(record, ["inv_vs_utility_pct"]),
    util_vs_expected_pct: optionalNumberField(record, ["util_vs_expected_pct"]),
    status,
    persisted_status: status === "data_required" ? undefined : status,
    flag_reasons: arrayOfStrings(record.flag_reasons),
    estimated_revenue: estimatedRevenue,
    ghi_kwh_m2: optionalNumberField(record, ["ghi_kwh_m2", "ghi"]),
    tolerance_config: normalizeToleranceConfig(record.tolerance_config),
    engine_version: stringField(record, ["engine_version"], ""),
  });
}

function demoBundle(opts: LoadOptions = {}): ProjectBundle {
  const bundle = opts.variant === "flagged" ? flagged : verified;
  const state = lookupUsState(bundle.project.latitude, bundle.project.longitude);
  const records = bundle.verification_records.map((record) =>
    applyReconciliation({
      ...record,
      persisted_status:
        record.status === "data_required" ? undefined : record.status,
    }),
  );

  return {
    ...bundle,
    project: {
      ...bundle.project,
      state_code: state?.code ?? "GA",
      state_name: state?.name ?? "Georgia",
      availability_status: "not_connected",
      target_irr_pct: null,
    },
    verification_records: records,
    summary: summaryFromRecords(
      records,
      bundle.project.capacity_kw,
      bundle.project.ppa_rate_per_kwh,
    ),
  };
}

function buildPortfolio(bundles: ProjectBundle[]): Portfolio {
  const projects = bundles.map(projectCardFromBundle);
  const history: DistributionPoint[] = [];

  for (const bundle of bundles) {
    for (const record of bundle.verification_records) {
      history.push({
        project_id: bundle.project.id,
        project_name: bundle.project.name,
        period_start: record.period_start,
        amount_usd: distributionForRecord(record),
        status: record.status,
      });
    }
  }
  history.sort((a, b) => a.period_start.localeCompare(b.period_start));

  const latestPeriod = history.at(-1)?.period_start ?? "";
  const latestMonthlyDistributions = history
    .filter((item) => item.period_start === latestPeriod)
    .reduce((sum, item) => sum + item.amount_usd, 0);
  const ytdDistributions = history.reduce((sum, item) => sum + item.amount_usd, 0);
  const monthsReconciled = bundles.reduce(
    (sum, bundle) =>
      sum +
      bundle.verification_records.filter((record) => record.status === "verified")
        .length,
    0,
  );
  const irrProjects = projects.filter((project) => project.target_irr_pct !== null);
  const weightedAverageIrr =
    irrProjects.length > 0
      ? irrProjects.reduce(
          (sum, project) =>
            sum + project.target_irr_pct! * Math.max(project.capacity_kw, 1),
          0,
        ) /
        irrProjects.reduce((sum, project) => sum + Math.max(project.capacity_kw, 1), 0)
      : null;

  return {
    portfolio: {
      total_invested: DEMO_ALLOCATION.totalInvestedUsd,
      latest_monthly_distributions: Math.round(latestMonthlyDistributions),
      ytd_distributions: Math.round(ytdDistributions),
      weighted_average_target_irr_pct:
        weightedAverageIrr === null ? null : round1(weightedAverageIrr),
      verified_projects: projects.filter(
        (project) => project.latest_verification === "verified",
      ).length,
      months_reconciled: monthsReconciled,
      distribution_history: history,
      allocation_note: DEMO_ALLOCATION.note,
    },
    projects,
  };
}

function projectCardFromBundle(bundle: ProjectBundle): PortfolioProject {
  const records = bundle.verification_records;
  const latest = records.at(-1);
  const ytdProductionMwh =
    records.reduce((sum, record) => sum + (record.inverter_kwh ?? 0), 0) / 1000;
  const latestDistribution = latest ? distributionForRecord(latest) : 0;
  const ytdDistribution = records.reduce(
    (sum, record) => sum + distributionForRecord(record),
    0,
  );

  return {
    id: bundle.project.id,
    name: bundle.project.name,
    location: bundle.project.location,
    capacity_kw: bundle.project.capacity_kw,
    status: bundle.project.status,
    latest_verification: latest?.status ?? "data_required",
    latest_period: latest?.period_start ?? "",
    ytd_production_mwh: round1(ytdProductionMwh),
    investor_share_pct: DEMO_ALLOCATION.investorSharePct,
    latest_distribution_usd: Math.round(latestDistribution),
    ytd_distribution_usd: Math.round(ytdDistribution),
    months_reconciled: records.filter((record) => record.status === "verified")
      .length,
    state_code: bundle.project.state_code ?? null,
    state_name: bundle.project.state_name ?? null,
    revenue_type: bundle.project.offtake_type,
    availability_status: bundle.project.availability_status ?? "not_connected",
    target_irr_pct: bundle.project.target_irr_pct ?? null,
    has_required_data: records.length > 0 && records.some(hasUsableRecordData),
    verification_mismatch: records.some(
      (record) => record.verification_mismatch,
    ),
  };
}

function summaryFromRecords(
  records: VerificationRecord[],
  capacityKw: number,
  ppaRate: number,
): ProjectSummary {
  const totalKwh = records.reduce(
    (sum, record) => sum + (record.inverter_kwh ?? 0),
    0,
  );
  const totalRevenue = records.reduce(
    (sum, record) => sum + (record.estimated_revenue ?? 0),
    0,
  );
  const annualKwh = records.length > 0 ? (totalKwh * 12) / records.length : 0;

  return {
    annual_production_mwh: round1(annualKwh / 1000),
    capacity_factor_pct:
      capacityKw > 0 ? round1((annualKwh / (capacityKw * 8760)) * 100) : 0,
    months_verified: records.filter((record) => record.status === "verified")
      .length,
    months_flagged: records.filter((record) => record.status === "flagged")
      .length,
    total_revenue_estimate: Math.round(totalRevenue),
    ppa_rate: ppaRate,
  };
}

function isSolarProject(project: DbRow): boolean {
  const category = stringField(
    project,
    ["technology", "asset_type", "project_type", "asset_class"],
    "",
  ).toLowerCase();
  return category === "" || category.includes("solar");
}

function hasUsableRecordData(record: VerificationRecord): boolean {
  return record.expected_kwh !== null && record.inverter_kwh !== null;
}

function distributionForRecord(record: VerificationRecord): number {
  if (record.status !== "verified" || record.estimated_revenue === null) return 0;
  return record.estimated_revenue * (DEMO_ALLOCATION.investorSharePct / 100);
}

function statusFromValue(value: unknown): VerificationStatus {
  if (
    value === "verified" ||
    value === "flagged" ||
    value === "pending" ||
    value === "data_required"
  ) {
    return value;
  }
  return "pending";
}

function availabilityFromProject(project: DbRow): AvailabilityStatus {
  const raw = stringField(
    project,
    ["investor_availability_status", "availability_status", "investor_status"],
    "",
  );
  if (
    raw === "available" ||
    raw === "coming_soon" ||
    raw === "closed" ||
    raw === "not_connected"
  ) {
    return raw;
  }
  return "not_connected";
}

function stringField(
  row: DbRow,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return fallback;
}

function numberField(row: DbRow, keys: string[], fallback: number): number {
  return optionalNumberField(row, keys) ?? fallback;
}

function optionalNumberField(row: DbRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeRatio(value: number): number {
  return value > 1 ? value / 100 : value;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
