/**
 * Spec 18 § 3.4 — the distribution trigger.
 *
 *   Day 1  Verification engine runs. Writes verification_records.
 *   Day 1  Trigger evaluates: status == 'verified' AND no prior submission.
 *   Day 1  Compute amount from verified_kwh × contracted rate × ownership.
 *   Day 2  PCPClient.submitDistribution(request)   ← mock today, HTTP later
 *   Day 2  Log submission + response to pcp_submissions.
 *   Day 3  Poll getDistributionStatus until terminal.
 *   Day 3  Polymesh sync (Layer A) picks up the on-chain distribution event.
 *   Day 3  reconcile.ts matches it to the verification record. Badge turns green.
 *
 * The loop closing is the point: Layer C submits, Layer A independently observes
 * the result on the public ledger, and reconciliation confirms they agree.
 * EcoXchange never has to take Polymath's word that a payment happened.
 */

import {
  DistributionRefused,
  idempotencyKey,
  type DistributionRequest,
  type DistributionResult,
  type PCPClient,
} from "./interface.js";
import { assertAmount, assertPayable, type VerificationGate } from "./guards.js";
import {
  failSubmission,
  findByIdempotencyKey,
  recordSubmission,
  resolveSubmission,
  type PcpSubmissionRow,
} from "./submissions.js";
import type { Cents } from "../distribution/money.js";

export interface TriggerInput {
  record: VerificationGate;
  offeringId: string;
  assetId: string;
  periodEnd: string;
  verifiedKwh: number;
  distributionAmount: Cents;
  currency: "USD" | "USDC";
}

export interface TriggerOutcome {
  submitted: boolean;
  /** Set when a prior submission already covered this period. */
  duplicateOf: PcpSubmissionRow | null;
  submissionId: string | null;
  result: DistributionResult | null;
}

export function buildRequest(input: TriggerInput): DistributionRequest {
  return {
    offeringId: input.offeringId,
    assetId: input.assetId,
    periodStart: input.record.period_start,
    periodEnd: input.periodEnd,
    verifiedKwh: input.verifiedKwh,
    distributionAmount: input.distributionAmount,
    currency: input.currency,
    verificationRecordId: input.record.id,
    idempotencyKey: idempotencyKey(input.record.project_id, input.record.period_start),
  };
}

/**
 * Submits one verified period, exactly once.
 *
 * Guards run before the request is even built, so a FLAGGED record cannot reach
 * a transport under any code path. The idempotency check runs before the
 * transport call, so a retry after an ambiguous failure reads rather than pays.
 */
export async function triggerDistribution(
  client: PCPClient,
  input: TriggerInput,
): Promise<TriggerOutcome> {
  // Gate 1 — verified production only. Throws, never returns false.
  assertPayable(input.record);
  // Gate 2 — a sane amount.
  assertAmount(input.distributionAmount);

  const request = buildRequest(input);

  // Gate 3 — idempotency. Enforced locally regardless of what Polymath's API
  // does or does not support (Spec 18 risk #3).
  const prior = await findByIdempotencyKey(request.idempotencyKey);
  if (prior) {
    return {
      submitted: false,
      duplicateOf: prior,
      submissionId: prior.id,
      result: null,
    };
  }

  // Audit row first — see the ordering note in submissions.ts.
  const submission = await recordSubmission(request, client.mode);

  let result: DistributionResult;
  try {
    result = await client.submitDistribution(request);
  } catch (err) {
    // The ambiguous case. The row stays as `failed`, which keeps the
    // idempotency key claimed so nothing retries blindly.
    await failSubmission(submission.id, err as Error);
    throw err;
  }

  await resolveSubmission(submission.id, result);

  return {
    submitted: true,
    duplicateOf: null,
    submissionId: submission.id,
    result,
  };
}

/**
 * Polls until the distribution reaches a terminal state.
 *
 * Returns the last result seen rather than throwing on exhaustion — a still-
 * pending distribution is a normal state, and the on-chain sync will observe
 * settlement independently either way.
 */
export async function pollUntilTerminal(
  client: PCPClient,
  pcpDistributionId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<DistributionResult> {
  const maxAttempts = options.maxAttempts ?? 5;
  const intervalMs = options.intervalMs ?? 2_000;

  let last: DistributionResult | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, intervalMs));
    last = await client.getDistributionStatus(pcpDistributionId);
    if (last.status === "executed" || last.status === "rejected") return last;
  }
  if (!last) {
    throw new DistributionRefused(
      `No status returned for ${pcpDistributionId}`,
      "not_configured",
    );
  }
  return last;
}
