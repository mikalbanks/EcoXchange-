/**
 * Spec 17 § 5 — period close.
 *
 * Runs after the verification engine and revenue reconciliation complete. Three
 * gates, all of which must pass before a period may be marked `closed`, and a
 * period must be `closed` before a distribution run computes against it.
 *
 *   GATE 1  production verified for every project in the SPV
 *   GATE 2  no revenue reconciliation in a `blocked` state
 *           (variance states pass — Spec 13 § 14.8, flag-don't-block)
 *   GATE 3  cash received reconciled to the bank
 *
 * Reopening a closed period requires a restatement (§ 12).
 */
import { PeriodBlocked } from "./errors";
import { type Cents, parseCents, sumCents } from "./money";
import { PeriodCloseStatus, type PeriodExpense } from "@shared/schema";
import type { ProductionVerificationReader, RevenueReconciliationReader } from "./ports";

/**
 * Verification statuses that satisfy GATE 1.
 *
 * `SETTLED` is included because an interval that has already posted to the SGT
 * ledger was verified first — see `deriveStatus` in
 * `server/services/verification-engine.ts`, where only a `BLOCK`-severity
 * anomaly produces `REJECTED`.
 */
const VERIFIED_STATUSES = new Set(["VERIFIED", "SETTLED"]);

export interface PeriodCloseInput {
  spvId: string;
  periodStart: Date;
  periodEnd: Date;
  /** Names the human attesting to the close. */
  closedBy: string;
  bankReconciledAt: Date | null;
  bankReconciledBy: string | null;
}

export interface PeriodCashInput {
  energyRevenue: Cents;
  recRevenue: Cents;
  itcTransferProceeds: Cents;
  otherRevenue: Cents;
  expenses: PeriodExpense[];
}

export interface PeriodCloseGateResult {
  passed: boolean;
  verificationRecordIds: string[];
  revenueReconciliationIds: string[];
  /** Non-blocking observations worth surfacing, e.g. variance states. */
  warnings: string[];
}

/**
 * Run the three gates. Throws `PeriodBlocked` naming the gate that failed,
 * rather than returning a boolean, because every caller's correct response to a
 * failed gate is to stop.
 */
export async function checkCloseGates(
  input: PeriodCloseInput,
  deps: {
    productionVerification: ProductionVerificationReader;
    revenueReconciliation: RevenueReconciliationReader;
  },
): Promise<PeriodCloseGateResult> {
  const warnings: string[] = [];

  // ── GATE 1 — production must be verified for every project in the SPV ────
  const verifications = await deps.productionVerification.statusesForPeriod(
    input.spvId,
    input.periodStart,
    input.periodEnd,
  );

  for (const record of verifications) {
    if (record.status === null) {
      throw new PeriodBlocked(
        "verification",
        `project ${record.projectId}: no verification record for the period`,
      );
    }
    if (!VERIFIED_STATUSES.has(record.status)) {
      throw new PeriodBlocked("verification", `project ${record.projectId}: ${record.status}`);
    }
  }

  // ── GATE 2 — revenue reconciliation must not be blocked ──────────────────
  const reconciliations = await deps.revenueReconciliation.statusesForPeriod(
    input.spvId,
    input.periodStart,
    input.periodEnd,
  );

  for (const record of reconciliations) {
    if (record.status === "blocked") {
      throw new PeriodBlocked(
        "revenue_reconciliation",
        `revenue reconciliation blocked: ${record.id} — ${record.detail}`,
      );
    }
    if (record.status === "variance") {
      // Permitted through: variance is flagged, not blocking.
      warnings.push(`revenue reconciliation ${record.id} in variance: ${record.detail}`);
    }
  }

  // ── GATE 3 — cash received must be reconciled to the bank ────────────────
  if (input.bankReconciledAt === null || !input.bankReconciledBy) {
    throw new PeriodBlocked("bank_reconciliation", "bank reconciliation incomplete");
  }

  return {
    passed: true,
    verificationRecordIds: verifications.flatMap((v) => v.verificationRecordIds),
    revenueReconciliationIds: reconciliations.map((r) => r.id),
    warnings,
  };
}

/**
 * Cash opex for the period.
 *
 * Only `paid` lines reduce distributable cash — the waterfall allocates cash
 * actually received and actually spent, never revenue or expense accrued
 * (§ 2.7). Accrued lines still matter to the tax books and are returned
 * separately rather than discarded.
 */
export function splitExpenses(expenses: PeriodExpense[]): { paid: Cents; accrued: Cents } {
  return {
    paid: sumCents(expenses.filter((e) => e.recognition === "paid").map((e) => parseCents(e.amount))),
    accrued: sumCents(
      expenses.filter((e) => e.recognition === "accrued").map((e) => parseCents(e.amount)),
    ),
  };
}

/** Cash revenue for the period — received, not invoiced. */
export function totalCashRevenue(input: PeriodCashInput): Cents {
  return (
    input.energyRevenue + input.recRevenue + input.itcTransferProceeds + input.otherRevenue
  );
}

/**
 * A distribution run may only compute against a period that has closed. Kept
 * here beside the gates so the two rules read together.
 */
export function assertPeriodClosed(closeStatus: string, periodStart: Date): void {
  if (closeStatus !== PeriodCloseStatus.CLOSED) {
    throw new PeriodBlocked(
      "period_state",
      `period beginning ${periodStart.toISOString().slice(0, 10)} is "${closeStatus}", not "closed"`,
    );
  }
}
