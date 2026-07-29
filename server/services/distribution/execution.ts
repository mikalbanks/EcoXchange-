/**
 * Spec 17 § 11 — execution, and § 12 — corrections.
 *
 *   computed → [human approval] → submitted → settled
 *
 * Human approval is mandatory. **No automatic distribution execution, ever.**
 * Nothing in this module advances a run without a named person, and the
 * database rejects the transition independently (AC 13) so a future code path
 * cannot quietly route around it.
 */
import { and, eq } from "drizzle-orm";
import { GateNotSatisfied } from "./errors";
import { formatCents, parseCents, sumCents, type Cents } from "./money";
import {
  prepareEntries,
  recomputeBalances,
  reversalEntry,
  type Balances,
  type LedgerEntry,
} from "./capital-accounts";
import * as repo from "./repository";
import { ENGINE_VERSION } from "./index";
import type { DistributionBatch, DistributionSubmitter } from "./ports";
import type { DistributionRun } from "@shared/schema";

export interface ApproveInput {
  runId: string;
  /** The named human. An email or user id — never a service account. */
  approvedBy: string;
}

/**
 * Record approval. The only transition that unlocks submission.
 */
export async function approveRun(input: ApproveInput): Promise<DistributionRun> {
  const run = await repo.getRun(input.runId);
  if (!run) throw new GateNotSatisfied("run", `distribution run ${input.runId} not found`);

  if (run.status !== "computed") {
    throw new GateNotSatisfied(
      "run_status",
      `run ${run.id} is "${run.status}"; only a "computed" run may be approved`,
    );
  }
  if (!input.approvedBy.trim()) {
    throw new GateNotSatisfied("approval", "approval requires a named human");
  }

  const updated = await repo.updateRun(run.id, {
    status: "approved",
    approvedBy: input.approvedBy.trim(),
    approvedAt: new Date(),
  });
  return updated!;
}

export interface SubmitInput {
  runId: string;
  submitter: DistributionSubmitter;
}

/**
 * Hand the batch to the transfer agent.
 *
 * § 11.2: the payload carries an idempotency key on `distributionRunId`, and a
 * resubmission after an ambiguous failure **reads first** to determine whether
 * the prior batch landed. Paying twice is worse than failing loudly.
 */
export async function submitRun(input: SubmitInput): Promise<DistributionRun> {
  const run = await repo.getRun(input.runId);
  if (!run) throw new GateNotSatisfied("run", `distribution run ${input.runId} not found`);

  if (run.status !== "approved") {
    throw new GateNotSatisfied(
      "run_status",
      `run ${run.id} is "${run.status}"; only an approved run may be submitted`,
    );
  }
  if (!run.approvedBy || !run.approvedAt) {
    throw new GateNotSatisfied(
      "approval",
      `run ${run.id} has no recorded human approval and must not execute`,
    );
  }

  // Read before writing: the prior attempt may have landed.
  const existing = await input.submitter.lookup(run.id);
  if (existing) {
    return finaliseFromReceipt(run, existing);
  }

  const allocations = await repo.listAllocations([run.id]);
  const members = await repo.listMembers(run.spvId);
  const refByMember = new Map(members.map((m) => [m.id, m.transferAgentInvestorRef]));

  const lines = allocations
    .map((allocation) => ({
      investorRef: refByMember.get(allocation.memberId)!,
      amountCents: parseCents(allocation.netAmount),
    }))
    .filter((line) => line.amountCents > 0);

  const totalCents = sumCents(lines.map((l) => l.amountCents));
  if (totalCents !== parseCents(run.totalDistributed)) {
    throw new GateNotSatisfied(
      "batch_integrity",
      `batch totals ${formatCents(totalCents)} but the run recorded ` +
        `${run.totalDistributed} — refusing to submit`,
    );
  }

  const batch: DistributionBatch = {
    distributionRunId: run.id,
    spvId: run.spvId,
    lines,
    totalCents,
  };

  await repo.updateRun(run.id, { status: "submitted", submittedAt: new Date() });

  const receipt = await input.submitter.submit(batch);
  return finaliseFromReceipt(run, receipt);
}

async function finaliseFromReceipt(
  run: DistributionRun,
  receipt: Awaited<ReturnType<DistributionSubmitter["submit"]>>,
): Promise<DistributionRun> {
  if (receipt.status === "failed") {
    return (await repo.updateRun(run.id, {
      status: "failed",
      transferAgentBatchRef: receipt.batchRef,
      failureReason: receipt.failureReason,
    }))!;
  }

  if (receipt.status === "submitted") {
    return (await repo.updateRun(run.id, {
      status: "submitted",
      transferAgentBatchRef: receipt.batchRef,
    }))!;
  }

  return settleRun(run.id, receipt.settledTotalCents ?? 0, receipt.batchRef);
}

/**
 * § 11.4 — settlement reconciliation. Any variance between what settled and
 * what the run computed opens an exception and blocks the next period.
 */
export async function settleRun(
  runId: string,
  settledTotalCents: Cents,
  batchRef: string,
): Promise<DistributionRun> {
  const run = await repo.getRun(runId);
  if (!run) throw new GateNotSatisfied("run", `distribution run ${runId} not found`);

  const expected = parseCents(run.totalDistributed);
  const variance = settledTotalCents - expected;

  return (await repo.updateRun(runId, {
    status: variance === 0 ? "settled" : "failed",
    settledAt: new Date(),
    settledTotal: formatCents(settledTotalCents),
    transferAgentBatchRef: batchRef,
    failureReason:
      variance === 0
        ? null
        : `settlement variance of ${formatCents(variance)}: settled ` +
          `${formatCents(settledTotalCents)} against ${formatCents(expected)} computed`,
  }))!;
}

/**
 * § 11.4 — a run with an unresolved settlement variance blocks the next
 * period's run. Called before computing, so an exception cannot be silently
 * outrun by the next month's cash.
 */
export async function assertNoUnresolvedSettlement(spvId: string): Promise<void> {
  const runs = await repo.listRuns(spvId);
  const failed = runs.find((run) => run.status === "failed" && run.reversedBy === null);
  if (failed) {
    throw new GateNotSatisfied(
      "settlement_exception",
      `run ${failed.id} for period ${failed.periodStart.toISOString().slice(0, 10)} has an ` +
        `unresolved exception (${failed.failureReason ?? "no reason recorded"}); resolve or ` +
        `reverse it before computing the next period`,
    );
  }
}

// ─── § 12 Corrections and restatement ───────────────────────────────────────

export interface ReverseInput {
  runId: string;
  reason: string;
  /** The named human authorising the correction. */
  reversedBy: string;
}

/**
 * Reverse a settled run.
 *
 * An error found after settlement is corrected *forward*, never by editing
 * history: a reversing run is created and linked, reversal entries are written
 * to the affected capital accounts, and the net difference lands in the next
 * distribution. The original rows are never touched.
 */
export async function reverseRun(input: ReverseInput): Promise<DistributionRun> {
  if (!input.reason.trim()) {
    throw new GateNotSatisfied("reversal", "a reversal must carry a stated reason");
  }
  if (!input.reversedBy.trim()) {
    throw new GateNotSatisfied("reversal", "a reversal must name the human authorising it");
  }

  const original = await repo.getRun(input.runId);
  if (!original) throw new GateNotSatisfied("run", `distribution run ${input.runId} not found`);

  if (original.reversedBy !== null) {
    throw new GateNotSatisfied("reversal", `run ${original.id} has already been reversed`);
  }
  if (original.status === "computed") {
    throw new GateNotSatisfied(
      "reversal",
      `run ${original.id} was never approved; there is nothing to reverse — recompute instead`,
    );
  }

  const allocations = await repo.listAllocations([original.id]);
  const ledger = await repo.listLedger(original.spvId);

  // The entries this run wrote, which the reversal negates one for one.
  const originalEntries: LedgerEntry[] = ledger.filter(
    (entry) => entry.sourceType === "distribution_run" && entry.sourceId === original.id,
  );

  const openingBalances = new Map<string, Balances>();
  const memberIds = new Set(ledger.map((e) => e.memberId));
  for (const memberId of memberIds) {
    openingBalances.set(
      memberId,
      recomputeBalances(ledger.filter((e) => e.memberId === memberId)),
    );
  }

  const reversals = originalEntries.map((entry) =>
    reversalEntry({
      original: entry,
      periodStart: original.periodStart,
      reason: input.reason.trim(),
    }),
  );

  const reversingRun = await repo.persistRun({
    engineVersion: ENGINE_VERSION,
    run: {
      spvId: original.spvId,
      waterfallTermsId: original.waterfallTermsId,
      periodStart: original.periodStart,
      periodEnd: original.periodEnd,
      // Every flow is the original negated, so the pair sums to nothing.
      cashRevenue: negate(original.cashRevenue),
      lessOpex: negate(original.lessOpex),
      lessDebtService: negate(original.lessDebtService),
      lessReserveFunding: negate(original.lessReserveFunding),
      plusReserveDraws: negate(original.plusReserveDraws),
      lessFees: negate(original.lessFees),
      distributableCash: negate(original.distributableCash),
      notes: [
        {
          code: "funding_shortfall",
          detail: `reversal of run ${original.id}: ${input.reason.trim()} (authorised by ${input.reversedBy.trim()})`,
          amount: null,
        },
      ],
      tierResults: [],
      totalDistributed: negate(original.totalDistributed),
      roundingResidual: "0.00",
      carriedForward: "0.00",
      undistributed: "0.00",
      status: "settled",
      approvedBy: input.reversedBy.trim(),
      approvedAt: new Date(),
      settledAt: new Date(),
      engineVersion: `${ENGINE_VERSION}-reversal`,
      reverses: original.id,
    },
    allocations: allocations.map((allocation) => ({
      memberId: allocation.memberId,
      memberClass: allocation.memberClass,
      weightedUnits: allocation.weightedUnits,
      tierBreakdown: {},
      grossAmount: -parseCents(allocation.grossAmount),
      withholding: 0,
      netAmount: -parseCents(allocation.netAmount),
      carriedForwardIn: 0,
      carriedForwardOut: 0,
    })),
    capitalEntries: prepareEntries(reversals, openingBalances),
    reserveMovements: [],
  });

  await repo.updateRun(original.id, { status: "reversed", reversedBy: reversingRun.id });

  return reversingRun;
}

function negate(money: string): string {
  return formatCents(-parseCents(money));
}
