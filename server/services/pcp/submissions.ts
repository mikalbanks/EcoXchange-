/**
 * Spec 18 § 3.5 — the `pcp_submissions` audit trail.
 *
 * Uses its own lazily-initialised Supabase client for the reason documented in
 * `backtest-supabase-writer.ts`: the reconciliation engine's `db/client.ts`
 * throws at import time when Supabase is unconfigured, which would crash the
 * server on boot.
 *
 * Unlike the backtest writer, failures here are NOT swallowed. A backtest that
 * cannot persist is still a useful backtest; a payment submitted without an
 * audit row is an unrecorded payment.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatCents, type Cents } from "../distribution/money.js";
import {
  DistributionRefused,
  type DistributionRequest,
  type DistributionResult,
  type PCPMode,
  type SubmissionStatus,
} from "./interface.js";

let cached: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getPcpSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cached;
}

/** Test seam. */
export function resetPcpSupabaseForTests(): void {
  cached = undefined;
}

export interface PcpSubmissionRow {
  id: string;
  verification_record_id: string;
  idempotency_key: string;
  offering_id: string;
  asset_id: string;
  distribution_amount: string;
  currency: string;
  pcp_distribution_id: string | null;
  status: SubmissionStatus;
  response_body: unknown;
  error_message: string | null;
  client_mode: PCPMode;
  submitted_at: string;
  resolved_at: string | null;
}

function requireClient(): SupabaseClient {
  const client = getPcpSupabase();
  if (!client) {
    throw new DistributionRefused(
      "Cannot record a PCP submission: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset. " +
        "Refusing to submit a payment that cannot be audited.",
      "not_configured",
    );
  }
  return client;
}

/**
 * Looks up a prior submission by idempotency key.
 *
 * This is the local enforcement of § 3.2's "non-negotiable" idempotency
 * requirement, and the mitigation for risk #3. It runs before every call
 * whether or not Polymath honours the `Idempotency-Key` header — a resubmission
 * after an ambiguous timeout must first read to learn whether the prior attempt
 * landed.
 */
export async function findByIdempotencyKey(
  key: string,
): Promise<PcpSubmissionRow | null> {
  const { data, error } = await requireClient()
    .from("pcp_submissions")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) throw new Error(`findByIdempotencyKey: ${error.message}`);
  return (data as PcpSubmissionRow | null) ?? null;
}

/**
 * Writes the submission row BEFORE the transport call.
 *
 * Order matters. If the row were written after, a process that died mid-call
 * would leave a payment that happened with no record that it did — the one
 * failure mode an audit trail exists to prevent. Writing first can at worst
 * leave a `submitted` row for a call that never left the building, which
 * `reconcile.ts` will later report as unmatched rather than as a silent payment.
 */
export async function recordSubmission(
  request: DistributionRequest,
  clientMode: PCPMode,
): Promise<PcpSubmissionRow> {
  const { data, error } = await requireClient()
    .from("pcp_submissions")
    .insert({
      verification_record_id: request.verificationRecordId,
      idempotency_key: request.idempotencyKey,
      offering_id: request.offeringId,
      asset_id: request.assetId,
      distribution_amount: formatCents(request.distributionAmount),
      currency: request.currency,
      status: "submitted" satisfies SubmissionStatus,
      client_mode: clientMode,
    })
    .select()
    .single();
  if (error) throw new Error(`recordSubmission: ${error.message}`);
  if (!data) throw new Error("recordSubmission: no row returned");
  return data as PcpSubmissionRow;
}

/** Records the transport's answer against an existing submission row. */
export async function resolveSubmission(
  submissionId: string,
  result: DistributionResult,
): Promise<void> {
  const status: SubmissionStatus = result.accepted
    ? result.status === "executed"
      ? "executed"
      : "accepted"
    : "rejected";
  const terminal = status === "executed" || status === "rejected";

  const { error } = await requireClient()
    .from("pcp_submissions")
    .update({
      pcp_distribution_id: result.pcpDistributionId,
      status,
      response_body: result as unknown,
      error_message: result.accepted ? null : result.message,
      resolved_at: terminal ? new Date().toISOString() : null,
    })
    .eq("id", submissionId);
  if (error) throw new Error(`resolveSubmission: ${error.message}`);
}

/**
 * Marks a submission failed when the transport threw — the ambiguous case,
 * where the call may or may not have landed. The row stays, so the idempotency
 * check blocks a blind retry and forces a status lookup instead.
 */
export async function failSubmission(
  submissionId: string,
  err: Error,
): Promise<void> {
  const { error } = await requireClient()
    .from("pcp_submissions")
    .update({
      status: "failed" satisfies SubmissionStatus,
      error_message: err.message,
    })
    .eq("id", submissionId);
  if (error) throw new Error(`failSubmission: ${error.message}`);
}

export type { Cents };
