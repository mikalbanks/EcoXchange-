/**
 * Spec 18 § 3.4 — the guard rails.
 *
 * "A FLAGGED or PENDING verification record must never produce a distribution
 * submission. This is the core investor promise. Enforce it at the interface
 * boundary with an assertion, not only in the calling code."
 *
 * So the check lives here and is applied by `trigger.ts` before any transport is
 * touched — which means it holds for `MockPCPClient` and `HttpPCPClient` alike,
 * and for any transport written later. A caller cannot opt out of it by
 * constructing a client directly, because a client alone cannot resolve a
 * verification record.
 */

import { DistributionRefused } from "./interface.js";

/** The subset of `verification_records` the guard needs. */
export interface VerificationGate {
  id: string;
  project_id: string;
  period_start: string;
  status: "verified" | "flagged" | "pending";
}

/**
 * Throws unless this record is safe to pay against.
 *
 * Deliberately not a boolean: a caller that ignores a `false` still pays, but a
 * caller that ignores a throw does not exist.
 */
export function assertPayable(record: VerificationGate): void {
  if (record.status !== "verified") {
    throw new DistributionRefused(
      `Refusing to submit a distribution for ${record.project_id} ${record.period_start}: ` +
        `verification status is ${record.status.toUpperCase()}, not VERIFIED. ` +
        `Only verified production may trigger a payment (Spec 18 § 3.4).`,
      "not_verified",
    );
  }
}

/** Throws unless the computed amount is a positive whole number of cents. */
export function assertAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new DistributionRefused(
      `Distribution amount must be an integer number of cents, got ${amountCents}.`,
      "invalid_amount",
    );
  }
  if (amountCents <= 0) {
    throw new DistributionRefused(
      `Distribution amount must be positive, got ${amountCents}.`,
      "invalid_amount",
    );
  }
}
