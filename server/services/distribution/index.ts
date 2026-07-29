/**
 * Spec 17 — the distribution engine's public surface.
 *
 * `computeDistributionRun` walks the architecture in § 3 end to end:
 *
 *   period close → pre-waterfall stack → waterfall → capital accounts
 *                                                  → (execution, separately)
 *
 * A computed run *never* moves money. It lands at status `computed` and waits
 * for a named human. § 11.1 is unambiguous: no automatic distribution
 * execution, ever. A software bug that pays the wrong amounts is recoverable
 * before submission and extremely expensive afterward.
 */
import {
  assertCapTableReconciled,
  reconcileCapTable,
  type LocalHolding,
} from "./cap-table";
import { assertPeriodClosed, splitExpenses } from "./period-close";
import { deriveCarriedForward, deriveMemberStates, effectiveRuns } from "./accruals";
import { applyMinimumDistribution, applyResidualTreatment } from "./de-minimis";
import {
  assertBalancesMatchLedger,
  distributionEntry,
  prepareEntries,
  recomputeBalances,
  type Balances,
  type PendingEntry,
} from "./capital-accounts";
import { computeWeightedUnits, unitsOutstandingOn, type PositionSlice } from "./weighting";
import { runPreWaterfall, type ReserveState } from "./pre-waterfall";
import { runWaterfall } from "./waterfall";
import { GateNotSatisfied } from "./errors";
import {
  formatCents,
  formatUnits,
  parseCents,
  sumCents,
  type Cents,
} from "./money";
import * as repo from "./repository";
import type { DistributionDeps } from "./ports";
import type { DistributionRun, PreWaterfallNote } from "@shared/schema";
import { validateTermsCoherence } from "@shared/spec17-terms";

/**
 * Bumped whenever a change alters computed output. It is part of the uniqueness
 * key on `distribution_runs`, so a recomputation under new engine logic sits
 * alongside the original rather than overwriting it — which is what makes
 * § 2.1's replay guarantee auditable rather than merely asserted.
 */
export const ENGINE_VERSION = "17.0.0";

export * from "./errors";
export * from "./ports";
export { ENGINE_VERSION as SPEC17_ENGINE_VERSION };

export interface ComputeOptions {
  spvId: string;
  periodStart: Date;
  deps: DistributionDeps;
  /** Recompute a period that already has a run under this engine version. */
  allowReplay?: boolean;
}

export interface ComputeResult {
  run: DistributionRun;
  warnings: string[];
}

export async function computeDistributionRun(options: ComputeOptions): Promise<ComputeResult> {
  const { spvId, periodStart, deps } = options;
  const warnings: string[] = [];

  const spv = await repo.getSpv(spvId);
  if (!spv) throw new GateNotSatisfied("spv", `SPV ${spvId} not found`);

  // ── The period must have closed ──────────────────────────────────────────
  const period = await repo.getPeriod(spvId, periodStart);
  if (!period) {
    throw new GateNotSatisfied(
      "period",
      `no financials recorded for the period beginning ${periodStart.toISOString().slice(0, 10)}`,
    );
  }
  assertPeriodClosed(period.closeStatus, period.periodStart);
  const periodEnd = period.periodEnd;

  // ── Terms, and the counsel gate ──────────────────────────────────────────
  const terms = await repo.getEffectiveTerms(spvId, periodEnd);
  if (!terms) {
    throw new GateNotSatisfied("waterfall_terms", `no waterfall terms in force for ${spvId}`);
  }
  // The database enforces this too (AC 11); checking here produces a usable
  // error rather than a constraint violation.
  if (terms.counselConfirmedAt === null) {
    throw new GateNotSatisfied(
      "counsel_confirmed",
      `waterfall terms version ${terms.version} have not been confirmed by counsel — ` +
        `no distribution may compute against them`,
    );
  }

  const coherenceErrors = validateTermsCoherence({ tiers: terms.tiers, classes: terms.classes });
  if (coherenceErrors.length > 0) {
    throw new GateNotSatisfied("waterfall_terms", coherenceErrors.join("; "));
  }

  // ── Members, positions and day-weighting ─────────────────────────────────
  const memberRows = await repo.listMembers(spvId);
  const positionRows = await repo.listPositions(spvId);

  const slices: PositionSlice[] = positionRows.map((p) => ({
    memberId: p.memberId,
    effectiveFrom: p.effectiveFrom,
    effectiveTo: p.effectiveTo,
    units: p.units,
  }));

  const weighting = computeWeightedUnits(slices, period.periodStart, periodEnd);
  const weightedUnits = new Map(weighting.members.map((m) => [m.memberId, m.weightedMicroUnits]));

  // ── § 11.3 cap table pre-flight — every drift case halts ─────────────────
  const outstanding = unitsOutstandingOn(slices, periodEnd);
  const localHoldings: LocalHolding[] = memberRows.map((member) => ({
    memberId: member.id,
    investorRef: member.transferAgentInvestorRef,
    units: outstanding.get(member.id) ?? 0n,
  }));

  const reconciliation = reconcileCapTable(
    localHoldings,
    await deps.capTable.getHoldings(spvId, periodEnd),
  );
  assertCapTableReconciled(reconciliation);

  // ── § 6 pre-waterfall stack ──────────────────────────────────────────────
  const reserveRows = await repo.listReserves(spvId);
  const reserves: ReserveState[] = reserveRows.map((r) => ({
    id: r.id,
    code: r.code,
    targetBasis: r.targetBasis,
    targetValue: r.targetValue,
    fundingPriority: r.fundingPriority,
    fundingCapPerPeriod: r.fundingCapPerPeriod,
    drawPermittedFor: r.drawPermittedFor,
    currentBalance: parseCents(r.currentBalance),
  }));

  const ledger = await repo.listLedger(spvId);
  const priorRunRows = await repo.listRuns(spvId);
  const priorRuns = priorRunRows
    .filter((run) => run.periodStart < period.periodStart)
    .map((run) => ({
      id: run.id,
      status: run.status,
      tierResults: run.tierResults,
      reversedBy: run.reversedBy,
      reverses: run.reverses,
    }));

  const memberStates = deriveMemberStates({
    members: memberRows.map((m) => ({ memberId: m.id, memberClass: m.memberClass })),
    ledger: ledger.map((entry) => ({
      memberId: entry.memberId,
      entryType: entry.entryType,
      bookAmount: entry.bookAmount,
      taxAmount: entry.taxAmount,
    })),
    priorRuns,
    weightedUnits,
  });

  const expenses = splitExpenses(period.expenses);
  const preWaterfall = runPreWaterfall({
    daysInPeriod: weighting.daysInPeriod,
    energyRevenue: parseCents(period.energyRevenue),
    recRevenue: parseCents(period.recRevenue),
    itcTransferProceeds: parseCents(period.itcTransferProceeds),
    otherRevenue: parseCents(period.otherRevenue),
    totalOpex: expenses.paid,
    debtServiceDue: debtServiceFor(terms.debtSchedule, period.periodStart),
    reserves,
    feeSchedule: terms.feeSchedule,
    assetsUnderAdministration: sumCents(memberStates.map((m) => m.contributedCapital)),
  });

  // ── § 7 waterfall ────────────────────────────────────────────────────────
  const waterfall = runWaterfall({
    distributable: preWaterfall.distributableCash,
    tiers: terms.tiers,
    classes: terms.classes,
    members: memberStates,
    daysInPeriod: weighting.daysInPeriod,
  });

  const notes: PreWaterfallNote[] = [...preWaterfall.notes];

  // ── § 7.4 residual and de-minimis carry ──────────────────────────────────
  const sponsorClasses = new Set(terms.classes.filter((c) => c.is_sponsor).map((c) => c.code));
  const residual = applyResidualTreatment({
    residual: waterfall.undistributed,
    treatment: terms.roundingResidualTreatment,
    sponsorMembers: memberStates
      .filter((m) => sponsorClasses.has(m.memberClass))
      .map((m) => ({ memberId: m.memberId, weightedMicroUnits: m.weightedMicroUnits })),
  });
  if (residual.note) {
    notes.push({ code: "funding_shortfall", detail: residual.note, amount: null });
  }

  const carriedIn = deriveCarriedForward(
    priorRuns,
    (await repo.listAllocations(effectiveRuns(priorRuns).map((r) => r.id))).map((a) => ({
      distributionRunId: a.distributionRunId,
      memberId: a.memberId,
      carriedForwardOut: a.carriedForwardOut,
    })),
  );

  const carry = applyMinimumDistribution(
    waterfall.members.map((member) => ({
      memberId: member.memberId,
      memberClass: member.memberClass,
      gross: member.gross + (residual.sweptToMembers.get(member.memberId) ?? 0),
      carriedForwardIn: carriedIn.get(member.memberId) ?? 0,
    })),
    terms.minDistributionPerMemberCents,
  );

  // ── § 8 capital accounts ─────────────────────────────────────────────────
  const openingBalances = new Map<string, Balances>();
  for (const member of memberRows) {
    const entries = ledger.filter((e) => e.memberId === member.id);
    assertBalancesMatchLedger(member.id, entries);
    openingBalances.set(member.id, recomputeBalances(entries));
  }

  const pending: PendingEntry[] = carry.members
    .filter((m) => m.payable > 0)
    .map((m) =>
      distributionEntry({
        memberId: m.memberId,
        periodStart: period.periodStart,
        amount: m.payable,
        distributionRunId: "pending",
      }),
    );
  const capitalEntries = prepareEntries(pending, openingBalances);

  // ── Persist ──────────────────────────────────────────────────────────────
  const existing = priorRunRows.find(
    (run) =>
      run.periodStart.getTime() === period.periodStart.getTime() &&
      run.engineVersion === ENGINE_VERSION,
  );
  if (existing && !options.allowReplay) {
    throw new GateNotSatisfied(
      "duplicate_run",
      `a run already exists for this period under engine version ${ENGINE_VERSION} (${existing.id})`,
    );
  }

  const weightedByMember = new Map(weighting.members.map((m) => [m.memberId, m.weightedUnits]));

  const run = await repo.persistRun({
    engineVersion: ENGINE_VERSION,
    run: {
      spvId,
      waterfallTermsId: terms.id,
      periodStart: period.periodStart,
      periodEnd,
      cashRevenue: formatCents(preWaterfall.cashRevenue),
      lessOpex: formatCents(preWaterfall.lessOpex),
      lessDebtService: formatCents(preWaterfall.lessDebtService),
      lessReserveFunding: formatCents(preWaterfall.lessReserveFunding),
      plusReserveDraws: formatCents(preWaterfall.plusReserveDraws),
      lessFees: formatCents(preWaterfall.lessFees),
      distributableCash: formatCents(preWaterfall.distributableCash),
      notes,
      tierResults: waterfall.tierResults,
      totalDistributed: formatCents(carry.totalPayable),
      roundingResidual: formatCents(waterfall.undistributed),
      carriedForward: formatCents(carry.totalCarried + residual.carriedForward),
      undistributed: formatCents(residual.carriedForward),
      status: "computed",
      engineVersion: ENGINE_VERSION,
    },
    allocations: carry.members.map((member) => {
      const fromWaterfall = waterfall.members.find((m) => m.memberId === member.memberId);
      return {
        memberId: member.memberId,
        memberClass: member.memberClass,
        weightedUnits: weightedByMember.get(member.memberId) ?? formatUnits(0n),
        tierBreakdown: Object.fromEntries(
          Object.entries(fromWaterfall?.byTier ?? {}).map(([seq, amount]) => [
            seq,
            formatCents(amount),
          ]),
        ),
        grossAmount: member.payable,
        withholding: 0,
        netAmount: member.payable,
        carriedForwardIn: member.carriedForwardIn,
        carriedForwardOut: member.carriedForwardOut,
      };
    }),
    capitalEntries,
    reserveMovements: preWaterfall.reserveMovements,
  });

  if (residual.note) warnings.push(residual.note);
  for (const note of preWaterfall.notes) warnings.push(note.detail);

  return { run, warnings };
}

/**
 * P&I due for a period. `null` schedule means unlevered, which is zero rather
 * than an error — most first offerings are.
 */
function debtServiceFor(
  schedule: { payments: { period_start: string; principal: string; interest: string }[] } | null,
  periodStart: Date,
): Cents {
  if (!schedule) return 0;
  const key = periodStart.toISOString().slice(0, 10);
  const payment = schedule.payments.find((p) => p.period_start === key);
  if (!payment) return 0;
  return parseCents(payment.principal) + parseCents(payment.interest);
}
