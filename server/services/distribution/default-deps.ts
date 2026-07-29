/**
 * Spec 17 — production wiring for the ports in `ports.ts`.
 *
 * Two of these are stand-ins, and deliberately visible as such:
 *
 * **Cap table.** § 11.3 wants the transfer agent's holdings. This repository's
 * transfer-agent integration is a 951-byte mock (`securitize-bridge.ts`), so
 * the reader mirrors `member_positions`. That means the gate passes trivially
 * today — but the reconciliation logic, the halt behaviour and the API surface
 * are all real, and swapping this one class for a live client makes the gate
 * bite without the engine changing.
 *
 * **Revenue reconciliation.** Spec 13 § 14 (verified · invoiced · received)
 * does not exist in this repository at all. Rather than let GATE 2 be
 * vacuously true, it is derived from the verification engine's anomaly flags:
 * a `BLOCK`-severity flag is `blocked`, a `WARN` is `variance`. That is a
 * narrower signal than Spec 13 will provide, and it is honest about being one.
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import { anomalyFlags, projects, verificationRuns } from "@shared/schema";
import { formatUnits } from "./money";
import { unitsOutstandingOn, type PositionSlice } from "./weighting";
import * as repo from "./repository";
import {
  MockDistributionSubmitter,
  type CapTableHolding,
  type CapTableReader,
  type DistributionDeps,
  type ProductionVerificationReader,
  type ProductionVerificationRecord,
  type RevenueReconciliationReader,
  type RevenueReconciliationRecord,
} from "./ports";

/**
 * Mirrors `member_positions`. Replace with the transfer agent's client the
 * moment there is one — nothing else has to change.
 */
export class LedgerMirrorCapTableReader implements CapTableReader {
  async getHoldings(spvId: string, asOf: Date): Promise<CapTableHolding[]> {
    const members = await repo.listMembers(spvId);
    const positions = await repo.listPositions(spvId);

    const slices: PositionSlice[] = positions.map((p) => ({
      memberId: p.memberId,
      effectiveFrom: p.effectiveFrom,
      effectiveTo: p.effectiveTo,
      units: p.units,
    }));

    const outstanding = unitsOutstandingOn(slices, asOf);

    return members
      .map((member) => ({
        investorRef: member.transferAgentInvestorRef,
        units: formatUnits(outstanding.get(member.id) ?? 0n),
      }))
      .filter((holding) => holding.units !== "0.000000");
  }
}

/** Rolls per-interval verification runs up to one status per project. */
export class VerificationEngineReader implements ProductionVerificationReader {
  async statusesForPeriod(
    spvId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ProductionVerificationRecord[]> {
    const spvProjects = await db.select().from(projects).where(eq(projects.spvId, spvId));
    if (spvProjects.length === 0) return [];

    const runs = await db
      .select()
      .from(verificationRuns)
      .where(
        and(
          inArray(
            verificationRuns.projectId,
            spvProjects.map((p) => p.id),
          ),
          gte(verificationRuns.periodStart, periodStart),
          lte(verificationRuns.periodEnd, endOfDay(periodEnd)),
        ),
      );

    return spvProjects.map((project) => {
      const projectRuns = runs.filter((run) => run.projectId === project.id);
      if (projectRuns.length === 0) {
        return { projectId: project.id, status: null, verificationRecordIds: [] };
      }

      // The worst status in the period governs — one rejected interval is
      // enough to block the close.
      const statuses = new Set(projectRuns.map((run) => run.status));
      const status = statuses.has("REJECTED")
        ? "REJECTED"
        : statuses.has("FLAGGED")
          ? "FLAGGED"
          : statuses.has("PENDING")
            ? "PENDING"
            : projectRuns.every((run) => run.status === "SETTLED")
              ? "SETTLED"
              : "VERIFIED";

      return {
        projectId: project.id,
        status,
        verificationRecordIds: projectRuns.map((run) => run.id),
      };
    });
  }
}

/**
 * Stand-in for Spec 13 § 14. Derives blocking state from anomaly flags raised
 * against the period's verification runs.
 */
export class AnomalyDerivedRevenueReconciliationReader implements RevenueReconciliationReader {
  async statusesForPeriod(
    spvId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RevenueReconciliationRecord[]> {
    const spvProjects = await db.select().from(projects).where(eq(projects.spvId, spvId));
    if (spvProjects.length === 0) return [];

    const runs = await db
      .select()
      .from(verificationRuns)
      .where(
        and(
          inArray(
            verificationRuns.projectId,
            spvProjects.map((p) => p.id),
          ),
          gte(verificationRuns.periodStart, periodStart),
          lte(verificationRuns.periodEnd, endOfDay(periodEnd)),
        ),
      );

    if (runs.length === 0) return [];

    const flags = await db
      .select()
      .from(anomalyFlags)
      .where(
        inArray(
          anomalyFlags.verificationRunId,
          runs.map((run) => run.id),
        ),
      );

    return flags
      .filter((flag) => flag.clearedAt === null && flag.severity !== "INFO")
      .map((flag) => ({
        id: flag.id != null ? String(flag.id) : `${flag.verificationRunId}-${flag.ruleCode}`,
        status: flag.severity === "BLOCK" ? ("blocked" as const) : ("variance" as const),
        detail: `${flag.ruleCode}: ${flag.detail ?? "no detail recorded"}`,
      }));
  }
}

function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/**
 * The submitter stays mocked until the transfer-agent integration is real.
 * A single shared instance so its idempotency map survives across requests
 * within a process — a resubmission genuinely finds the earlier receipt.
 */
export const defaultSubmitter = new MockDistributionSubmitter();

export function defaultDeps(): DistributionDeps {
  return {
    capTable: new LedgerMirrorCapTableReader(),
    revenueReconciliation: new AnomalyDerivedRevenueReconciliationReader(),
    productionVerification: new VerificationEngineReader(),
    submitter: defaultSubmitter,
  };
}
