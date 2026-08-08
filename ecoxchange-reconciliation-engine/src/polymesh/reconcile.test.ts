import { describe, expect, it } from "vitest";
import { decideReconciliation, type SubmissionLink } from "./reconcile.js";
import type { VerificationRecord } from "../db/types.js";
import type { ToleranceConfig } from "../config/tolerances.js";

const tolerances = {} as ToleranceConfig;

function record(over: Partial<VerificationRecord> = {}): VerificationRecord {
  return {
    id: "rec-june",
    project_id: "proj-1",
    period_start: "2024-06-01",
    period_end: "2024-06-30",
    inverter_kwh: 100,
    utility_kwh: 99,
    expected_kwh: 101,
    inv_vs_expected_pct: -1,
    inv_vs_utility_pct: 1,
    util_vs_expected_pct: -2,
    status: "verified",
    flag_reasons: null,
    tolerance_config: tolerances,
    estimated_revenue: 1000,
    engine_version: "0.1.0",
    verified_at: "2024-07-01T00:00:00.000Z",
    reviewed_by: null,
    review_notes: null,
    review_resolved_at: null,
    ...over,
  };
}

/** Paid a few days after the June period closed — the normal arrears case. */
const paidJuly = { payment_at: "2024-07-05T00:00:00.000Z", total_amount: "1000" };

const link: SubmissionLink = {
  verification_record_id: "rec-june",
  distribution_amount: 1000,
  pcp_distribution_id: "ECOSAV/1",
  status: "executed",
  client_mode: "http",
};

describe("decideReconciliation — no submission link", () => {
  it("is unmatched even when a verified period closed days earlier", () => {
    // The heart of the correction: date proximity is not evidence. Returning
    // `matched` here would be a public claim derived from a coincidence.
    const out = decideReconciliation(paidJuly, [record()], null);
    expect(out.status).toBe("unmatched");
    expect(out.verificationRecordId).toBeNull();
  });

  it("names the candidate period in the note without asserting it", () => {
    const out = decideReconciliation(paidJuly, [record()], null);
    expect(out.notes).toMatch(/2024-06-01/);
    expect(out.notes).toMatch(/may be the period it settles/);
    // The hint must never leak into the claim column.
    expect(out.verificationRecordId).toBeNull();
  });

  it("is unmatched with a plain note when nothing is in range", () => {
    const out = decideReconciliation(
      { payment_at: "2027-01-01T00:00:00.000Z", total_amount: "1000" },
      [record()],
      null,
    );
    expect(out.status).toBe("unmatched");
    expect(out.notes).toBe(
      "No submission record links this payment to a verified period.",
    );
  });

  it("never suggests a period that had not closed by the payment date", () => {
    const out = decideReconciliation(
      { payment_at: "2024-06-15T00:00:00.000Z", total_amount: "1000" },
      [record()],
      null,
    );
    expect(out.status).toBe("unmatched");
    expect(out.notes).not.toMatch(/2024-06-01/);
  });

  it("is unmatched with no history at all", () => {
    const out = decideReconciliation(paidJuly, [], null);
    expect(out.status).toBe("unmatched");
    expect(out.verificationRecordId).toBeNull();
  });

  it("is unmatched when the payment has no date", () => {
    const out = decideReconciliation(
      { payment_at: null, total_amount: "1000" },
      [record()],
      null,
    );
    expect(out.status).toBe("unmatched");
  });

  it("cannot produce a discrepancy without a submission link", () => {
    // A flagged period plus a nearby payment is suspicious, but with no
    // submission we do not know the two are related at all.
    const out = decideReconciliation(paidJuly, [record({ status: "flagged" })], null);
    expect(out.status).toBe("unmatched");
    expect(out.verificationRecordId).toBeNull();
  });
});

describe("decideReconciliation — submission link present", () => {
  it("matches a verified period with agreeing amounts", () => {
    const out = decideReconciliation(paidJuly, [record()], link);
    expect(out.status).toBe("matched");
    expect(out.verificationRecordId).toBe("rec-june");
    expect(out.notes).toBeNull();
  });

  it("matches regardless of how far the payment sits from the period", () => {
    // Intent beats arithmetic: the submission says which period this settles.
    const out = decideReconciliation(
      { payment_at: "2027-01-01T00:00:00.000Z", total_amount: "1000" },
      [record()],
      link,
    );
    expect(out.status).toBe("matched");
    expect(out.verificationRecordId).toBe("rec-june");
  });

  it("flags a FLAGGED period as a discrepancy", () => {
    const out = decideReconciliation(paidJuly, [record({ status: "flagged" })], link);
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/FLAGGED/);
  });

  it("flags a PENDING period as a discrepancy", () => {
    const out = decideReconciliation(paidJuly, [record({ status: "pending" })], link);
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/PENDING/);
  });

  it("reports amount drift beyond tolerance", () => {
    const out = decideReconciliation(
      { ...paidJuly, total_amount: "1100" },
      [record()],
      link,
    );
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/differs from submitted/);
  });

  it("tolerates rounding below the threshold", () => {
    const out = decideReconciliation(
      { ...paidJuly, total_amount: "1000.001" },
      [record()],
      link,
    );
    expect(out.status).toBe("matched");
  });

  it("parses NUMERIC amounts that arrive as strings", () => {
    // PostgREST returns NUMERIC as a string; treating it as NaN would make every
    // comparison silently pass.
    const out = decideReconciliation(
      { ...paidJuly, total_amount: "1500" },
      [record()],
      link,
    );
    expect(out.status).toBe("discrepancy");
  });

  it("refuses to present a mock submission as a confirmed payment", () => {
    const out = decideReconciliation(paidJuly, [record()], {
      ...link,
      client_mode: "mock",
    });
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/mock mode/);
  });

  it("flags a submission pointing at another project's record", () => {
    const out = decideReconciliation(paidJuly, [record({ id: "rec-other" })], link);
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/does not belong/);
  });

  it("accumulates multiple problems into one note", () => {
    const out = decideReconciliation(
      { ...paidJuly, total_amount: "1100" },
      [record({ status: "flagged" })],
      { ...link, client_mode: "mock" },
    );
    expect(out.status).toBe("discrepancy");
    expect(out.notes).toMatch(/FLAGGED/);
    expect(out.notes).toMatch(/mock mode/);
    expect(out.notes).toMatch(/differs from submitted/);
  });
});
