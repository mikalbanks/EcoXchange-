/**
 * Spec 18 § 2.4 — matching on-chain distributions to verification records.
 *
 * This file is the point of Layer A. The product claim is that a given payment
 * settles a specific month of independently reconciled physical production, and
 * that both halves are publicly checkable. That claim is
 * `polymesh_distributions.verification_record_id`, and this is what sets it.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 *
 * ONLY a `pcp_submissions` row can produce a claim. That row carries the
 * `verification_record_id` EcoXchange submitted against and a deterministic
 * idempotency key, so it is a record of intent, not an inference.
 *
 *   matched      submission links this distribution → a VERIFIED record,
 *                amounts agree, and it was a real (non-mock) submission.
 *   discrepancy  submission exists but something is wrong — flagged/pending
 *                period, amount drift, or a mock submission.
 *   unmatched    no submission link. Always. No exceptions.
 *
 * Date proximity is NOT a matching strategy. An earlier draft attributed a
 * payment to "the most recent period closing before payment_at" and returned
 * `matched` on it — but a payment on day 3 of month N+1 settles month N, and
 * date arithmetic cannot tell that from a coincidence. A green badge asserting a
 * linkage derived from a date guess is a public claim that cannot be defended,
 * and that is strictly worse than showing nothing. Proximity survives only as a
 * note naming a candidate period for a human to confirm; it never populates
 * `verification_record_id` and never yields `matched`.
 *
 * ── An assumption that is NOT yet verified ──────────────────────────────────
 *
 * The join key is `pcp_submissions.pcp_distribution_id == Distribution.id`.
 * Polymesh's id is "<assetId>/<localId>"; there is no evidence the Capital
 * Platform returns that same string, because no real PCP response has ever been
 * seen. Until one is (Spec 18 § 6), every distribution will fall through to
 * `unmatched` — which is the safe direction to fail, but it means a screen full
 * of yellow badges is the EXPECTED state today, not a bug. `reconcileAsset`
 * reports the unlinked count so this is visible rather than silent.
 */

import { requireClient } from "./db.js";
import type { VerificationRecord } from "../db/types.js";
import type {
  PolymeshAsset,
  PolymeshDistribution,
  ReconciliationStatus,
} from "./models.js";

/**
 * How far back a candidate period may sit from a payment for the note to name
 * it. This bounds a *hint*, not a match — nothing downstream treats it as
 * evidence.
 */
const CANDIDATE_WINDOW_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tolerance on the amount comparison. The on-chain figure is descaled from a
 * fixed-point integer and the submitted figure is computed from verified kWh, so
 * exact equality is the wrong test: a cent of rounding is not a discrepancy, a
 * percent of drift is.
 */
const AMOUNT_TOLERANCE_PCT = 0.5;

export interface SubmissionLink {
  verification_record_id: string;
  distribution_amount: number;
  pcp_distribution_id: string | null;
  status: string;
  client_mode: "mock" | "http";
}

export interface ReconciliationOutcome {
  status: ReconciliationStatus;
  verificationRecordId: string | null;
  notes: string | null;
}

/** Numeric columns arrive from PostgREST as strings; parse at the boundary. */
function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Names the period a payment *probably* settles, for the operator note only.
 * Returns null when nothing plausible is in range.
 */
function candidatePeriod(
  paymentAt: string | null,
  records: VerificationRecord[],
): VerificationRecord | null {
  if (!paymentAt) return null;
  const paidAt = new Date(paymentAt).getTime();
  if (!Number.isFinite(paidAt)) return null;

  return (
    records
      .map((r) => ({ record: r, endedAt: new Date(r.period_end).getTime() }))
      .filter(
        (c) =>
          Number.isFinite(c.endedAt) &&
          c.endedAt <= paidAt &&
          paidAt - c.endedAt <= CANDIDATE_WINDOW_DAYS * DAY_MS,
      )
      .sort((a, b) => b.endedAt - a.endedAt)[0]?.record ?? null
  );
}

/**
 * Decides the reconciliation state for one distribution. Pure — all I/O is done
 * by the caller, so the decision table is directly testable.
 */
export function decideReconciliation(
  distribution: Pick<PolymeshDistribution, "payment_at" | "total_amount">,
  records: VerificationRecord[],
  submission: SubmissionLink | null,
): ReconciliationOutcome {
  // ── No submission link → unmatched, always ────────────────────────────────
  if (!submission) {
    const candidate = candidatePeriod(distribution.payment_at, records);
    return {
      status: "unmatched",
      verificationRecordId: null,
      notes: candidate
        ? `No submission record links this payment to a verified period. ` +
          `${candidate.period_start} closed shortly before it and may be the period it settles — ` +
          `confirm against the Capital Platform before treating this as reconciled.`
        : "No submission record links this payment to a verified period.",
    };
  }

  // ── Submission link exists → matched or discrepancy ───────────────────────
  const record = records.find((r) => r.id === submission.verification_record_id);
  if (!record) {
    return {
      status: "discrepancy",
      verificationRecordId: submission.verification_record_id,
      notes:
        "Submission references a verification record that does not belong to this asset's project.",
    };
  }

  const notes: string[] = [];
  let status: ReconciliationStatus = "matched";

  if (record.status !== "verified") {
    status = "discrepancy";
    notes.push(
      `Payment settled against a ${record.status.toUpperCase()} period (${record.period_start}).`,
    );
  }

  // A mock submission must never present as a confirmed payment, or the audit
  // trail cannot distinguish real money from a rehearsal.
  if (submission.client_mode === "mock") {
    status = "discrepancy";
    notes.push(
      "Linked submission was made in mock mode — this payment did not originate from a real Capital Platform call.",
    );
  }

  const onChain = toNumber(distribution.total_amount);
  if (onChain !== null && submission.distribution_amount > 0) {
    const driftPct =
      (Math.abs(onChain - submission.distribution_amount) /
        submission.distribution_amount) *
      100;
    if (driftPct > AMOUNT_TOLERANCE_PCT) {
      status = "discrepancy";
      notes.push(
        `On-chain amount ${onChain} differs from submitted ${submission.distribution_amount} by ${driftPct.toFixed(2)}%.`,
      );
    }
  }

  return {
    status,
    verificationRecordId: record.id,
    notes: notes.length ? notes.join(" ") : null,
  };
}

/**
 * Reads verification history directly rather than via `db/verification-records.js`,
 * which transitively imports the eager `db/client.ts`. Same query, safe to import
 * from the server. See `./db.ts`.
 */
async function loadVerificationHistory(
  projectId: string,
): Promise<VerificationRecord[]> {
  const { data, error } = await requireClient()
    .from("verification_records")
    .select("*")
    .eq("project_id", projectId)
    .order("period_start", { ascending: true });
  if (error) throw new Error(`loadVerificationHistory: ${error.message}`);
  return (data ?? []) as VerificationRecord[];
}

async function loadSubmissionLinks(
  assetId: string,
): Promise<Map<string, SubmissionLink>> {
  const { data, error } = await requireClient()
    .from("pcp_submissions")
    .select(
      "verification_record_id,distribution_amount,pcp_distribution_id,status,client_mode",
    )
    .eq("asset_id", assetId);
  if (error) throw new Error(`loadSubmissionLinks: ${error.message}`);

  const byDistributionId = new Map<string, SubmissionLink>();
  for (const row of (data ?? []) as SubmissionLink[]) {
    if (row.pcp_distribution_id) byDistributionId.set(row.pcp_distribution_id, row);
  }
  return byDistributionId;
}

export interface ReconcileResult {
  changed: number;
  /** Distributions with no submission link — expected to be all of them today. */
  unlinked: number;
  /** Submissions whose pcp_distribution_id matched no on-chain distribution. */
  orphanSubmissions: number;
}

/**
 * Reconciles every distribution recorded for one asset.
 *
 * An asset with no `project_id` is not an error — it is an asset that exists on
 * chain but has not been mapped to an EcoXchange project yet. Its distributions
 * stay `unmatched`, which is the honest state.
 */
export async function reconcileAsset(
  asset: PolymeshAsset,
): Promise<ReconcileResult> {
  const { data, error } = await requireClient()
    .from("polymesh_distributions")
    .select("*")
    .eq("polymesh_asset_id", asset.id);
  if (error) throw new Error(`reconcileAsset: ${error.message}`);

  const distributions = (data ?? []) as PolymeshDistribution[];
  if (distributions.length === 0) {
    return { changed: 0, unlinked: 0, orphanSubmissions: 0 };
  }

  const records = asset.project_id
    ? await loadVerificationHistory(asset.project_id)
    : [];
  const submissions = asset.project_id
    ? await loadSubmissionLinks(asset.asset_id)
    : new Map<string, SubmissionLink>();

  const matchedKeys = new Set<string>();
  let changed = 0;
  let unlinked = 0;

  for (const dist of distributions) {
    const link = submissions.get(dist.distribution_id) ?? null;
    if (link) matchedKeys.add(dist.distribution_id);
    else unlinked++;

    const outcome = decideReconciliation(dist, records, link);

    const unchanged =
      outcome.status === dist.reconciliation_status &&
      outcome.verificationRecordId === dist.verification_record_id &&
      outcome.notes === dist.reconciliation_notes;
    if (unchanged) continue;

    const { error: updErr } = await requireClient()
      .from("polymesh_distributions")
      .update({
        reconciliation_status: outcome.status,
        verification_record_id: outcome.verificationRecordId,
        reconciliation_notes: outcome.notes,
      })
      .eq("id", dist.id);
    if (updErr) throw new Error(`reconcileAsset update: ${updErr.message}`);
    changed++;
  }

  // Submissions that reference a distribution id no chain row carries. Either
  // the payment has not landed yet, or the join-key assumption above is wrong.
  // Surfaced rather than swallowed, because those two look identical in the
  // data and only one of them is a bug.
  const orphanSubmissions = [...submissions.keys()].filter(
    (k) => !matchedKeys.has(k),
  ).length;
  if (orphanSubmissions > 0) {
    console.warn(
      `[polymesh] ${asset.asset_id}: ${orphanSubmissions} submission(s) reference a pcp_distribution_id ` +
        `with no matching on-chain distribution. Either settlement is pending, or ` +
        `pcp_distribution_id does not equal Polymesh's "<assetId>/<localId>" — verify against a real PCP response.`,
    );
  }

  return { changed, unlinked, orphanSubmissions };
}
