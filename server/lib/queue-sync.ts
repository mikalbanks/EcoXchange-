import { storage } from "../storage";
import { computeSgtScoreFromNsrdbTruth } from "./nrel-engine";
import type { Project } from "@shared/schema";

export interface QueueLead {
  queueId: string;
  projectName: string;
  developerEntity: string | null;
  county: string | null;
  state: string | null;
  capacityMw: number;
  assetType: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  queueIso: "CAISO" | "PJM";
  proposedCod: Date | null;
  queueSubmittedDate: Date | null;
}

export interface QueueSyncSummary {
  scanned: number;
  eligible: number;
  inserted: number;
  updated: number;
}

const ALLOWED_TECH = new Set(["solar", "solar + storage", "storage"]);
const ALLOWED_STATUS = new Set(["active", "ia executed"]);
const MIN_CAPACITY_MW = 1;
const MAX_CAPACITY_MW = 70;

export function isQueueLeadEligible(input: {
  technology: string | null | undefined;
  status: string | null | undefined;
  capacityMw: number | null | undefined;
}): boolean {
  const tech = (input.technology || "").trim().toLowerCase();
  const status = (input.status || "").trim().toLowerCase();
  const capacityMw = Number(input.capacityMw);
  if (!ALLOWED_TECH.has(tech)) return false;
  if (!ALLOWED_STATUS.has(status)) return false;
  if (!Number.isFinite(capacityMw)) return false;
  return capacityMw >= MIN_CAPACITY_MW && capacityMw <= MAX_CAPACITY_MW;
}

function normalizeInterconnectionStatus(status: string | null): Project["interconnectionStatus"] {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("ia executed")) return "IA_EXECUTED";
  if (normalized.includes("active")) return "STUDY";
  return "UNKNOWN";
}

function normalizeTechnology(raw: string | null): Project["technology"] {
  const normalized = (raw || "").toLowerCase();
  if (normalized.includes("storage")) return "SOLAR_STORAGE";
  return "SOLAR";
}

function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function upsertQueueLead(lead: QueueLead): Promise<"inserted" | "updated"> {
  const existing = await storage.getProjectByQueueId(lead.queueId);

  const commonUpdates = {
    queueId: lead.queueId,
    source: "GRID_STATUS_LIVE",
    queueIso: lead.queueIso,
    name: lead.projectName,
    externalDeveloperEntity: lead.developerEntity,
    state: lead.state || "UNKNOWN",
    county: lead.county || "UNKNOWN",
    capacityMW: lead.capacityMw.toFixed(2),
    capacityKw: String(Math.round(lead.capacityMw * 1000)),
    latitude: lead.latitude != null ? String(lead.latitude) : null,
    longitude: lead.longitude != null ? String(lead.longitude) : null,
    queueStatus: lead.status,
    queueSubmittedDate: lead.queueSubmittedDate,
    proposedCod: lead.proposedCod,
    technology: normalizeTechnology(lead.assetType),
    interconnectionStatus: normalizeInterconnectionStatus(lead.status),
    status: "Queue Replica",
    summary: `Live queue replica (${lead.queueIso}) imported from GridStatus.`,
    daysInQueue:
      lead.queueSubmittedDate != null
        ? Math.max(0, Math.floor((Date.now() - lead.queueSubmittedDate.getTime()) / 86400000))
        : null,
  } as const;

  if (existing) {
    await storage.updateProject(existing.id, commonUpdates);
    return "updated";
  }

  const created = await storage.createProject({
    developerId: "00000000-0000-4000-8000-000000000001",
    ...commonUpdates,
  });

  if (lead.latitude != null && lead.longitude != null) {
    try {
      const result = await computeSgtScoreFromNsrdbTruth(lead.latitude, lead.longitude);
      await storage.updateProject(created.id, {
        sgtScoreNrel: String(result.sgtScoreNrel),
      });
    } catch (error) {
      console.warn(`[Queue Sync] SGT prelim backtest failed for ${lead.queueId}:`, error);
    }
  }

  return "inserted";
}

export async function syncQueueLeads(leads: QueueLead[]): Promise<QueueSyncSummary> {
  let eligible = 0;
  let inserted = 0;
  let updated = 0;

  for (const lead of leads) {
    if (
      !isQueueLeadEligible({
        technology: lead.assetType,
        status: lead.status,
        capacityMw: lead.capacityMw,
      })
    ) {
      continue;
    }
    eligible += 1;
    const result = await upsertQueueLead(lead);
    if (result === "inserted") inserted += 1;
    else updated += 1;
  }

  return {
    scanned: leads.length,
    eligible,
    inserted,
    updated,
  };
}

export async function getLiveQueueProjects(): Promise<Project[]> {
  const all = await storage.getAllProjects();
  return all
    .filter((p) => p.source === "GRID_STATUS_LIVE")
    .sort((a, b) => {
      const aDays = a.daysInQueue ?? -1;
      const bDays = b.daysInQueue ?? -1;
      return bDays - aDays;
    });
}

export async function submitQueueBuyInterest(args: {
  projectId: string;
  investorId: string;
  amountIntent?: string | null;
  timeline?: string | null;
  message?: string | null;
}): Promise<void> {
  const project = await storage.getProject(args.projectId);
  if (!project || project.source !== "GRID_STATUS_LIVE") {
    throw new Error("Queue replica not found");
  }

  await storage.createAdminNotification({
    type: "QUEUE_BUY_INTEREST",
    title: "New Queue Buy Interest",
    message: `Investor ${args.investorId} signaled buy interest in ${project.name} (${project.queueId ?? project.id}).`,
    projectId: project.id,
    payload: JSON.stringify({
      investorId: args.investorId,
      queueId: project.queueId,
      projectName: project.name,
      queueIso: project.queueIso,
      submittedAt: new Date().toISOString(),
      amountIntent: args.amountIntent ?? null,
      timeline: args.timeline ?? "UNKNOWN",
      message: args.message ?? null,
    }),
  });
}

export function parseQueueLeadFromJson(input: Record<string, unknown>): QueueLead | null {
  const queueId = String(input.queueId ?? "").trim();
  const projectName = String(input.projectName ?? "").trim();
  const queueIsoRaw = String(input.queueIso ?? "").toUpperCase();
  const capacityMw = Number(input.capacityMw ?? NaN);
  if (!queueId || !projectName || !Number.isFinite(capacityMw)) return null;
  if (queueIsoRaw !== "CAISO" && queueIsoRaw !== "PJM") return null;

  return {
    queueId,
    projectName,
    developerEntity: input.developerEntity ? String(input.developerEntity) : null,
    county: input.county ? String(input.county) : null,
    state: input.state ? String(input.state) : null,
    capacityMw,
    latitude: input.latitude == null ? null : Number(input.latitude),
    longitude: input.longitude == null ? null : Number(input.longitude),
    assetType: input.assetType ? String(input.assetType) : null,
    status: input.status ? String(input.status) : null,
    queueIso: queueIsoRaw,
    proposedCod: toDateOrNull(input.proposedCod ? String(input.proposedCod) : null),
    queueSubmittedDate: toDateOrNull(input.queueSubmittedDate ? String(input.queueSubmittedDate) : null),
  };
}

