/**
 * Spec 18 § 3.3 — `MockPCPClient`.
 *
 * Used for all development and CI. The spec is emphatic that it must be capable
 * of failing: "It must be capable of failing, or the error paths never get
 * tested." Hence injectable failure modes rather than a client that always
 * cheerfully accepts.
 *
 * Deterministic by construction — the same request always produces the same
 * `pcpDistributionId`, so a retry looks like a retry rather than a new payment.
 */

import {
  DistributionRefused,
  type DistributionRequest,
  type DistributionResult,
  type PCPClient,
  type PCPMode,
} from "./interface.js";

export type FailureMode = "none" | "reject" | "timeout" | "partial";

export interface MockOptions {
  failureMode?: FailureMode;
  /** Simulated round-trip latency, ms. Zero in tests, non-zero for demos. */
  latencyMs?: number;
}

/** Stable id from the idempotency key — same input, same distribution id. */
function deterministicId(idempotencyKey: string): string {
  let hash = 0;
  for (let i = 0; i < idempotencyKey.length; i++) {
    hash = (hash * 31 + idempotencyKey.charCodeAt(i)) | 0;
  }
  return `pcp_mock_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockPCPClient implements PCPClient {
  readonly mode: PCPMode = "mock";
  private failureMode: FailureMode;
  private latencyMs: number;
  /** Everything this instance has accepted, so status lookups are coherent. */
  private readonly submitted = new Map<string, DistributionResult>();

  constructor(options: MockOptions = {}) {
    this.failureMode = options.failureMode ?? "none";
    this.latencyMs = options.latencyMs ?? 0;
  }

  /** Test seam: flip behaviour between calls to exercise recovery paths. */
  setFailureMode(mode: FailureMode): void {
    this.failureMode = mode;
  }

  async getOffering(offeringId: string): Promise<Record<string, unknown>> {
    await sleep(this.latencyMs);
    return {
      id: offeringId,
      name: "EcoXchange Savannah Solar Note",
      status: "open",
      currency: "USDC",
      mock: true,
    };
  }

  async listInvestors(offeringId: string): Promise<Array<Record<string, unknown>>> {
    await sleep(this.latencyMs);
    return [
      { id: "inv_mock_1", offeringId, did: "0xmock1", units: "1000", mock: true },
      { id: "inv_mock_2", offeringId, did: "0xmock2", units: "500", mock: true },
    ];
  }

  async submitDistribution(
    request: DistributionRequest,
  ): Promise<DistributionResult> {
    await sleep(this.latencyMs);
    const submittedAt = new Date();

    if (this.failureMode === "timeout") {
      // Models the dangerous case: the caller cannot tell whether it landed.
      // The local idempotency check is what makes the retry safe.
      throw new Error("PCP request timed out after 30000ms");
    }

    if (this.failureMode === "reject") {
      const result: DistributionResult = {
        accepted: false,
        pcpDistributionId: null,
        status: "rejected",
        message: "Offering is not accepting distributions (mock rejection).",
        submittedAt,
      };
      return result;
    }

    const pcpDistributionId = deterministicId(request.idempotencyKey);

    // `partial` accepts the submission but leaves it un-executed, which is what
    // a real queue does — the trigger must poll rather than assume settlement.
    const result: DistributionResult = {
      accepted: true,
      pcpDistributionId,
      status: this.failureMode === "partial" ? "pending" : "accepted",
      message:
        this.failureMode === "partial"
          ? "Accepted; settlement pending downstream (mock partial)."
          : null,
      submittedAt,
    };
    this.submitted.set(pcpDistributionId, result);
    return result;
  }

  async getDistributionStatus(
    pcpDistributionId: string,
  ): Promise<DistributionResult> {
    await sleep(this.latencyMs);
    const known = this.submitted.get(pcpDistributionId);
    if (!known) {
      throw new DistributionRefused(
        `Unknown distribution ${pcpDistributionId}`,
        "not_configured",
      );
    }
    if (this.failureMode === "partial") return known;
    // Terminal state on the next poll, so the trigger's loop terminates.
    return { ...known, status: "executed" };
  }

  async healthCheck(): Promise<boolean> {
    return this.failureMode !== "timeout";
  }
}
