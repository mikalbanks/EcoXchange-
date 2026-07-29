/**
 * Spec 17 — database access for the distribution engine.
 *
 * All Drizzle lives here so the engine modules stay pure and testable. Nothing
 * in this file makes a decision; it reads rows and writes rows.
 *
 * Note the asymmetry: reads are plain, but every write that moves money goes
 * through `persistRun`, in one transaction. A run that wrote allocations but
 * not capital account entries would leave the ledger unreconstructable, which
 * is the one failure this system exists to prevent.
 */
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  capitalAccountEntries,
  distributionAllocations,
  distributionRuns,
  itcPositions,
  memberPositions,
  members,
  periodFinancials,
  projects,
  reserveAccounts,
  reserveMovements,
  spvs,
  taxAllocations,
  waterfallTerms,
  type CapitalAccountEntry,
  type DistributionAllocation,
  type DistributionRun,
  type ItcPosition,
  type Member,
  type MemberPosition,
  type PeriodFinancials,
  type ReserveAccount,
  type Spv,
  type WaterfallTermsRow,
} from "@shared/schema";
import { formatCents, type Cents } from "./money";
import type { PreparedEntry } from "./capital-accounts";
import type { PlannedReserveMovement } from "./pre-waterfall";

export async function getSpv(spvId: string): Promise<Spv | undefined> {
  const [row] = await db.select().from(spvs).where(eq(spvs.id, spvId));
  return row;
}

export async function listSpvs(): Promise<Spv[]> {
  return db.select().from(spvs).orderBy(asc(spvs.name));
}

export async function getProjectsOfSpv(spvId: string) {
  return db.select().from(projects).where(eq(projects.spvId, spvId));
}

/**
 * The terms in force on a date — the highest version whose `effectiveFrom` has
 * arrived. Amendments create a new version rather than editing the old one, so
 * a historical period always replays against the terms that governed it.
 */
export async function getEffectiveTerms(
  spvId: string,
  asOf: Date,
): Promise<WaterfallTermsRow | undefined> {
  const [row] = await db
    .select()
    .from(waterfallTerms)
    .where(and(eq(waterfallTerms.spvId, spvId), lte(waterfallTerms.effectiveFrom, asOf)))
    .orderBy(desc(waterfallTerms.version))
    .limit(1);
  return row;
}

export async function getTermsById(id: string): Promise<WaterfallTermsRow | undefined> {
  const [row] = await db.select().from(waterfallTerms).where(eq(waterfallTerms.id, id));
  return row;
}

export async function listMembers(spvId: string): Promise<Member[]> {
  return db.select().from(members).where(eq(members.spvId, spvId)).orderBy(asc(members.id));
}

export async function listPositions(spvId: string): Promise<MemberPosition[]> {
  const spvMembers = await listMembers(spvId);
  if (spvMembers.length === 0) return [];
  return db
    .select()
    .from(memberPositions)
    .where(
      inArray(
        memberPositions.memberId,
        spvMembers.map((m) => m.id),
      ),
    )
    .orderBy(asc(memberPositions.effectiveFrom));
}

export async function getPeriod(
  spvId: string,
  periodStart: Date,
): Promise<PeriodFinancials | undefined> {
  const [row] = await db
    .select()
    .from(periodFinancials)
    .where(and(eq(periodFinancials.spvId, spvId), eq(periodFinancials.periodStart, periodStart)));
  return row;
}

export async function listPeriods(spvId: string): Promise<PeriodFinancials[]> {
  return db
    .select()
    .from(periodFinancials)
    .where(eq(periodFinancials.spvId, spvId))
    .orderBy(desc(periodFinancials.periodStart));
}

export async function listReserves(spvId: string): Promise<ReserveAccount[]> {
  return db
    .select()
    .from(reserveAccounts)
    .where(eq(reserveAccounts.spvId, spvId))
    .orderBy(asc(reserveAccounts.fundingPriority));
}

export async function listReserveMovements(spvId: string) {
  const reserves = await listReserves(spvId);
  if (reserves.length === 0) return [];
  return db
    .select()
    .from(reserveMovements)
    .where(
      inArray(
        reserveMovements.reserveAccountId,
        reserves.map((r) => r.id),
      ),
    )
    .orderBy(desc(reserveMovements.occurredAt));
}

/** Chronological — the accrual replay in § 7.3 depends on this order. */
export async function listRuns(spvId: string): Promise<DistributionRun[]> {
  return db
    .select()
    .from(distributionRuns)
    .where(eq(distributionRuns.spvId, spvId))
    .orderBy(asc(distributionRuns.periodStart), asc(distributionRuns.computedAt));
}

export async function getRun(runId: string): Promise<DistributionRun | undefined> {
  const [row] = await db.select().from(distributionRuns).where(eq(distributionRuns.id, runId));
  return row;
}

export async function listAllocations(runIds: string[]): Promise<DistributionAllocation[]> {
  if (runIds.length === 0) return [];
  return db
    .select()
    .from(distributionAllocations)
    .where(inArray(distributionAllocations.distributionRunId, runIds));
}

export async function listLedger(spvId: string): Promise<CapitalAccountEntry[]> {
  const spvMembers = await listMembers(spvId);
  if (spvMembers.length === 0) return [];
  return db
    .select()
    .from(capitalAccountEntries)
    .where(
      inArray(
        capitalAccountEntries.memberId,
        spvMembers.map((m) => m.id),
      ),
    )
    .orderBy(asc(capitalAccountEntries.seq));
}

export async function listLedgerForMember(memberId: string): Promise<CapitalAccountEntry[]> {
  return db
    .select()
    .from(capitalAccountEntries)
    .where(eq(capitalAccountEntries.memberId, memberId))
    .orderBy(asc(capitalAccountEntries.seq));
}

export async function listItcPositions(spvId: string): Promise<ItcPosition[]> {
  return db.select().from(itcPositions).where(eq(itcPositions.spvId, spvId));
}

export async function listTaxAllocations(spvId: string, taxYear: number) {
  return db
    .select()
    .from(taxAllocations)
    .where(and(eq(taxAllocations.spvId, spvId), eq(taxAllocations.taxYear, taxYear)));
}

/** ITC positions whose recapture window is still open, across every SPV. */
export async function listOpenRecaptureWindows(asOf: Date): Promise<ItcPosition[]> {
  return db
    .select()
    .from(itcPositions)
    .where(gte(itcPositions.recapturePeriodEnds, asOf))
    .orderBy(asc(itcPositions.recapturePeriodEnds));
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export interface RunAllocationInput {
  memberId: string;
  memberClass: string;
  weightedUnits: string;
  tierBreakdown: Record<string, string>;
  grossAmount: Cents;
  withholding: Cents;
  netAmount: Cents;
  carriedForwardIn: Cents;
  carriedForwardOut: Cents;
}

export interface PersistRunInput {
  run: typeof distributionRuns.$inferInsert;
  allocations: RunAllocationInput[];
  capitalEntries: PreparedEntry[];
  reserveMovements: PlannedReserveMovement[];
  engineVersion: string;
}

/**
 * Write a computed run and everything it implies, atomically.
 *
 * Reserve balances are updated here rather than recomputed on read because
 * `reserve_movements` carries `balance_after` — the movement log and the
 * balance must agree, and one transaction is the only way to guarantee it.
 */
export async function persistRun(input: PersistRunInput): Promise<DistributionRun> {
  return db.transaction(async (tx) => {
    const [run] = await tx.insert(distributionRuns).values(input.run).returning();

    if (input.allocations.length > 0) {
      await tx.insert(distributionAllocations).values(
        input.allocations.map((allocation) => ({
          distributionRunId: run.id,
          memberId: allocation.memberId,
          memberClass: allocation.memberClass,
          weightedUnits: allocation.weightedUnits,
          tierBreakdown: allocation.tierBreakdown,
          grossAmount: formatCents(allocation.grossAmount),
          withholding: formatCents(allocation.withholding),
          netAmount: formatCents(allocation.netAmount),
          carriedForwardIn: formatCents(allocation.carriedForwardIn),
          carriedForwardOut: formatCents(allocation.carriedForwardOut),
        })),
      );
    }

    if (input.capitalEntries.length > 0) {
      await tx.insert(capitalAccountEntries).values(
        input.capitalEntries.map((entry) => ({
          memberId: entry.memberId,
          entryType: entry.entryType,
          periodStart: entry.periodStart,
          bookAmount: formatCents(entry.bookAmount),
          taxAmount: formatCents(entry.taxAmount),
          bookBalanceAfter: formatCents(entry.bookBalanceAfter),
          taxBalanceAfter: formatCents(entry.taxBalanceAfter),
          sourceType: entry.sourceType,
          sourceId: entry.sourceId ?? run.id,
          reversesEntryId: entry.reversesEntryId ?? null,
          reason: entry.reason ?? null,
          engineVersion: input.engineVersion,
        })),
      );
    }

    for (const movement of input.reserveMovements) {
      await tx.insert(reserveMovements).values({
        reserveAccountId: movement.reserveAccountId,
        distributionRunId: run.id,
        direction: movement.direction,
        amount: formatCents(movement.amount),
        reason: movement.reason,
        balanceAfter: formatCents(movement.balanceAfter),
      });

      await tx
        .update(reserveAccounts)
        .set({ currentBalance: formatCents(movement.balanceAfter) })
        .where(eq(reserveAccounts.id, movement.reserveAccountId));
    }

    return run;
  });
}

export async function updateRun(
  runId: string,
  updates: Partial<typeof distributionRuns.$inferInsert>,
): Promise<DistributionRun | undefined> {
  const [row] = await db
    .update(distributionRuns)
    .set(updates)
    .where(eq(distributionRuns.id, runId))
    .returning();
  return row;
}

export async function insertLedgerEntries(
  entries: PreparedEntry[],
  engineVersion: string,
): Promise<CapitalAccountEntry[]> {
  if (entries.length === 0) return [];
  return db
    .insert(capitalAccountEntries)
    .values(
      entries.map((entry) => ({
        memberId: entry.memberId,
        entryType: entry.entryType,
        periodStart: entry.periodStart,
        bookAmount: formatCents(entry.bookAmount),
        taxAmount: formatCents(entry.taxAmount),
        bookBalanceAfter: formatCents(entry.bookBalanceAfter),
        taxBalanceAfter: formatCents(entry.taxBalanceAfter),
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        reversesEntryId: entry.reversesEntryId ?? null,
        reason: entry.reason ?? null,
        engineVersion,
      })),
    )
    .returning();
}

export async function closePeriod(
  spvId: string,
  periodStart: Date,
  updates: {
    closedBy: string;
    verificationRecordIds: string[];
    revenueReconciliationIds: string[];
  },
): Promise<PeriodFinancials | undefined> {
  const [row] = await db
    .update(periodFinancials)
    .set({
      closeStatus: "closed",
      closedAt: new Date(),
      closedBy: updates.closedBy,
      verificationRecordIds: updates.verificationRecordIds,
      revenueReconciliationIds: updates.revenueReconciliationIds,
    })
    .where(and(eq(periodFinancials.spvId, spvId), eq(periodFinancials.periodStart, periodStart)))
    .returning();
  return row;
}
