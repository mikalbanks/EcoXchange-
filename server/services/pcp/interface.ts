/**
 * Spec 18 § 3.2 — the Polymath Capital Platform seam.
 *
 * The distribution trigger is blocked on credentials EcoXchange does not have
 * and may need a paid tier to obtain. That must not block the build, so the
 * interface is defined now, the mock is implemented now, and the HTTP transport
 * drops in behind the same interface when credentials arrive. Everything
 * upstream — the trigger logic, the audit trail, the dashboard — is built and
 * tested against this file, not against a transport.
 *
 * This is the same ports-and-adapters shape as
 * `server/services/distribution/ports.ts`, deliberately. `DistributionSubmitter`
 * there is the port a real PCP client eventually satisfies; when it does,
 * `defaultSubmitter` in `default-deps.ts` is the single line that changes.
 *
 * Money is `Cents` from `../distribution/money.js` rather than a new numeric
 * type — a second money representation in the same codebase is how cents go
 * missing.
 */

import type { Cents } from "../distribution/money.js";

export type PCPMode = "mock" | "http";

export type DistributionStatus =
  | "accepted"
  | "rejected"
  | "pending"
  | "executed";

export type SubmissionStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "executed"
  | "failed";

/** A verified month of production, ready to trigger payment. */
export interface DistributionRequest {
  offeringId: string;
  assetId: string;
  /** ISO date, `YYYY-MM-DD`. */
  periodStart: string;
  periodEnd: string;
  verifiedKwh: number;
  distributionAmount: Cents;
  currency: "USD" | "USDC";
  /** FK to `verification_records.id`. */
  verificationRecordId: string;
  /**
   * Deterministic on `(projectId, periodStart)` — see `idempotencyKey()`.
   * A retry after a network failure must not produce a duplicate payment.
   */
  idempotencyKey: string;
}

export interface DistributionResult {
  accepted: boolean;
  pcpDistributionId: string | null;
  status: DistributionStatus;
  message: string | null;
  submittedAt: Date;
}

/**
 * The Capital Platform, transport-agnostic.
 *
 * Implementations must not enforce business rules — the verification guard
 * lives in `guards.ts` so it applies identically to every transport, including
 * ones written later.
 */
export interface PCPClient {
  readonly mode: PCPMode;
  getOffering(offeringId: string): Promise<Record<string, unknown>>;
  listInvestors(offeringId: string): Promise<Array<Record<string, unknown>>>;
  submitDistribution(request: DistributionRequest): Promise<DistributionResult>;
  getDistributionStatus(pcpDistributionId: string): Promise<DistributionResult>;
  healthCheck(): Promise<boolean>;
}

/**
 * The idempotency key, in one place so the trigger and the duplicate check
 * cannot drift apart.
 *
 * Spec 18 § 3.2 calls this non-negotiable, and it is the mitigation for risk #3:
 * if Polymath's API turns out not to support an idempotency header, the unique
 * constraint on `pcp_submissions.idempotency_key` enforces it locally instead.
 */
export function idempotencyKey(projectId: string, periodStart: string): string {
  return `${projectId}:${periodStart}`;
}

/** Raised when a request is refused before any transport call is made. */
export class DistributionRefused extends Error {
  constructor(
    message: string,
    readonly reason:
      | "not_verified"
      | "already_submitted"
      | "invalid_amount"
      | "not_configured",
  ) {
    super(message);
    this.name = "DistributionRefused";
  }
}
