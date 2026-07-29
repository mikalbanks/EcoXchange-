/**
 * Spec 17 — the seams where this engine meets systems it does not own.
 *
 * Three of the spec's dependencies do not exist in this repository yet: the
 * transfer agent's cap table (§ 11.3), Spec 13 § 14 revenue reconciliation
 * (§ 5 GATE 2), and the batch distribution executor (§ 11.2). Rather than let
 * that block the build, each is consumed through a narrow interface here with a
 * mock implementation below.
 *
 * The engine never imports a concrete implementation — everything arrives
 * through `DistributionDeps`. That is what makes § 11.3's halt logic and § 5's
 * gates real and testable today, and swappable later without the engine
 * changing at all.
 */
import type { Cents } from "./money";

// ─── § 11.3 Cap table ───────────────────────────────────────────────────────

export interface CapTableHolding {
  /** The transfer agent's investor identifier, matched to `members`. */
  investorRef: string;
  /** Units, as a decimal string. */
  units: string;
}

/**
 * The transfer agent is authoritative for token holdings; this ledger is
 * authoritative for capital accounts. Reconciling the two is a pre-flight gate
 * on every run.
 */
export interface CapTableReader {
  getHoldings(spvId: string, asOf: Date): Promise<CapTableHolding[]>;
}

// ─── § 5 GATE 2 — revenue reconciliation ────────────────────────────────────

export type RevenueReconciliationStatus = "ok" | "variance" | "blocked";

export interface RevenueReconciliationRecord {
  id: string;
  /**
   * Per Spec 13 § 14.8 "flag-don't-block": a `variance` state is permitted
   * through the gate and only `blocked` stops the close.
   */
  status: RevenueReconciliationStatus;
  detail: string;
}

export interface RevenueReconciliationReader {
  statusesForPeriod(
    spvId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RevenueReconciliationRecord[]>;
}

// ─── § 5 GATE 1 — production verification ───────────────────────────────────

export interface ProductionVerificationRecord {
  projectId: string;
  /** `null` when no verification exists for the period at all. */
  status: string | null;
  verificationRecordIds: string[];
}

export interface ProductionVerificationReader {
  statusesForPeriod(
    spvId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ProductionVerificationRecord[]>;
}

// ─── § 11.2 Execution ───────────────────────────────────────────────────────

export interface DistributionBatchLine {
  investorRef: string;
  /** Net of withholding. Cents; the adapter formats for its own wire protocol. */
  amountCents: Cents;
}

export interface DistributionBatch {
  /** Idempotency key. A resubmission must not double-pay. */
  distributionRunId: string;
  spvId: string;
  lines: DistributionBatchLine[];
  totalCents: Cents;
}

export interface DistributionBatchReceipt {
  batchRef: string;
  status: "submitted" | "settled" | "failed";
  settledTotalCents: Cents | null;
  failureReason: string | null;
}

/**
 * `lookup` exists because § 11.2 requires that a resubmission after an
 * ambiguous failure first reads to determine whether the prior batch landed.
 * Returns `null` when the key was never seen.
 */
export interface DistributionSubmitter {
  submit(batch: DistributionBatch): Promise<DistributionBatchReceipt>;
  lookup(distributionRunId: string): Promise<DistributionBatchReceipt | null>;
}

// ─── Dependency bundle ──────────────────────────────────────────────────────

export interface DistributionDeps {
  capTable: CapTableReader;
  revenueReconciliation: RevenueReconciliationReader;
  productionVerification: ProductionVerificationReader;
  submitter: DistributionSubmitter;
}

// ─── Mocks ──────────────────────────────────────────────────────────────────

/**
 * Mirrors whatever `member_positions` says, so a default run reconciles
 * cleanly. Tests perturb the returned holdings to exercise all three drift
 * cases in § 11.3.
 */
export class MirrorCapTableReader implements CapTableReader {
  constructor(
    private readonly source: (spvId: string, asOf: Date) => Promise<CapTableHolding[]>,
  ) {}

  async getHoldings(spvId: string, asOf: Date): Promise<CapTableHolding[]> {
    return this.source(spvId, asOf);
  }
}

/** Fixed holdings, for tests and for seeding a demo SPV. */
export class StaticCapTableReader implements CapTableReader {
  constructor(private readonly holdings: CapTableHolding[]) {}

  async getHoldings(): Promise<CapTableHolding[]> {
    return this.holdings;
  }
}

export class StaticRevenueReconciliationReader implements RevenueReconciliationReader {
  constructor(private readonly records: RevenueReconciliationRecord[] = []) {}

  async statusesForPeriod(): Promise<RevenueReconciliationRecord[]> {
    return this.records;
  }
}

export class StaticProductionVerificationReader implements ProductionVerificationReader {
  constructor(private readonly records: ProductionVerificationRecord[] = []) {}

  async statusesForPeriod(): Promise<ProductionVerificationRecord[]> {
    return this.records;
  }
}

/**
 * In-memory submitter. Honours the idempotency contract — a second `submit`
 * with the same run id returns the original receipt rather than paying twice.
 */
export class MockDistributionSubmitter implements DistributionSubmitter {
  private readonly receipts = new Map<string, DistributionBatchReceipt>();

  async submit(batch: DistributionBatch): Promise<DistributionBatchReceipt> {
    const existing = this.receipts.get(batch.distributionRunId);
    if (existing) return existing;

    const receipt: DistributionBatchReceipt = {
      batchRef: `mock-batch-${batch.distributionRunId}`,
      status: "settled",
      settledTotalCents: batch.totalCents,
      failureReason: null,
    };
    this.receipts.set(batch.distributionRunId, receipt);
    return receipt;
  }

  async lookup(distributionRunId: string): Promise<DistributionBatchReceipt | null> {
    return this.receipts.get(distributionRunId) ?? null;
  }
}
