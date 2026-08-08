import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockPCPClient } from "./mock-client";
import { assertAmount, assertPayable, type VerificationGate } from "./guards";
import {
  DistributionRefused,
  idempotencyKey,
  type DistributionRequest,
} from "./interface";
import { loadPCPConfig } from "./config";
import { getPcpClient } from "./index";
import { buildRequest, triggerDistribution, pollUntilTerminal } from "./trigger";
import * as submissions from "./submissions";

function gate(over: Partial<VerificationGate> = {}): VerificationGate {
  return {
    id: "rec-june",
    project_id: "proj-1",
    period_start: "2024-06-01",
    status: "verified",
    ...over,
  };
}

const baseInput = {
  record: gate(),
  offeringId: "off-1",
  assetId: "ECOSAV",
  periodEnd: "2024-06-30",
  verifiedKwh: 412_000,
  distributionAmount: 1_770_000, // cents
  currency: "USDC" as const,
};

describe("guards", () => {
  it("permits a verified record", () => {
    expect(() => assertPayable(gate())).not.toThrow();
  });

  it("refuses a FLAGGED record", () => {
    expect(() => assertPayable(gate({ status: "flagged" }))).toThrow(DistributionRefused);
    expect(() => assertPayable(gate({ status: "flagged" }))).toThrow(/FLAGGED/);
  });

  it("refuses a PENDING record", () => {
    expect(() => assertPayable(gate({ status: "pending" }))).toThrow(/PENDING/);
  });

  it("carries a machine-readable reason", () => {
    try {
      assertPayable(gate({ status: "flagged" }));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as DistributionRefused).reason).toBe("not_verified");
    }
  });

  it("rejects non-integer and non-positive amounts", () => {
    expect(() => assertAmount(100.5)).toThrow(/integer number of cents/);
    expect(() => assertAmount(0)).toThrow(/positive/);
    expect(() => assertAmount(-100)).toThrow(/positive/);
    expect(() => assertAmount(1)).not.toThrow();
  });
});

describe("idempotency key", () => {
  it("is deterministic on (projectId, periodStart)", () => {
    expect(idempotencyKey("proj-1", "2024-06-01")).toBe("proj-1:2024-06-01");
    expect(idempotencyKey("proj-1", "2024-06-01")).toBe(
      idempotencyKey("proj-1", "2024-06-01"),
    );
  });

  it("differs across periods and projects", () => {
    expect(idempotencyKey("proj-1", "2024-06-01")).not.toBe(
      idempotencyKey("proj-1", "2024-07-01"),
    );
    expect(idempotencyKey("proj-1", "2024-06-01")).not.toBe(
      idempotencyKey("proj-2", "2024-06-01"),
    );
  });

  it("is carried onto the built request", () => {
    expect(buildRequest(baseInput).idempotencyKey).toBe("proj-1:2024-06-01");
  });
});

describe("MockPCPClient", () => {
  it("reports itself as mock so the audit trail can record it", () => {
    expect(new MockPCPClient().mode).toBe("mock");
  });

  it("accepts a distribution and returns a deterministic id", async () => {
    const client = new MockPCPClient();
    const request = buildRequest(baseInput);
    const first = await client.submitDistribution(request);
    const second = await new MockPCPClient().submitDistribution(request);
    expect(first.accepted).toBe(true);
    expect(first.status).toBe("accepted");
    // Same key must not look like two different payments.
    expect(first.pcpDistributionId).toBe(second.pcpDistributionId);
  });

  it("can reject", async () => {
    const client = new MockPCPClient({ failureMode: "reject" });
    const result = await client.submitDistribution(buildRequest(baseInput));
    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.pcpDistributionId).toBeNull();
  });

  it("can time out", async () => {
    const client = new MockPCPClient({ failureMode: "timeout" });
    await expect(client.submitDistribution(buildRequest(baseInput))).rejects.toThrow(
      /timed out/,
    );
    expect(await client.healthCheck()).toBe(false);
  });

  it("can accept but leave settlement pending", async () => {
    const client = new MockPCPClient({ failureMode: "partial" });
    const result = await client.submitDistribution(buildRequest(baseInput));
    expect(result.accepted).toBe(true);
    expect(result.status).toBe("pending");
  });

  it("reaches a terminal status on the next poll", async () => {
    const client = new MockPCPClient();
    const submitted = await client.submitDistribution(buildRequest(baseInput));
    const status = await pollUntilTerminal(client, submitted.pcpDistributionId!, {
      maxAttempts: 2,
      intervalMs: 0,
    });
    expect(status.status).toBe("executed");
  });

  it("stops polling a stuck distribution instead of looping forever", async () => {
    const client = new MockPCPClient({ failureMode: "partial" });
    const submitted = await client.submitDistribution(buildRequest(baseInput));
    const status = await pollUntilTerminal(client, submitted.pcpDistributionId!, {
      maxAttempts: 3,
      intervalMs: 0,
    });
    expect(status.status).toBe("pending");
  });
});

describe("triggerDistribution", () => {
  const row = {
    id: "sub-1",
    verification_record_id: "rec-june",
    idempotency_key: "proj-1:2024-06-01",
    offering_id: "off-1",
    asset_id: "ECOSAV",
    distribution_amount: "17700.00",
    currency: "USDC",
    pcp_distribution_id: null,
    status: "submitted" as const,
    response_body: null,
    error_message: null,
    client_mode: "mock" as const,
    submitted_at: "2024-07-01T00:00:00.000Z",
    resolved_at: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(submissions, "findByIdempotencyKey").mockResolvedValue(null);
    vi.spyOn(submissions, "recordSubmission").mockResolvedValue(row);
    vi.spyOn(submissions, "resolveSubmission").mockResolvedValue(undefined);
    vi.spyOn(submissions, "failSubmission").mockResolvedValue(undefined);
  });

  it("submits a verified period and records the result", async () => {
    const client = new MockPCPClient();
    const outcome = await triggerDistribution(client, baseInput);
    expect(outcome.submitted).toBe(true);
    expect(outcome.result?.accepted).toBe(true);
    expect(submissions.recordSubmission).toHaveBeenCalledOnce();
    expect(submissions.resolveSubmission).toHaveBeenCalledOnce();
  });

  it("records the audit row with the client mode", async () => {
    await triggerDistribution(new MockPCPClient(), baseInput);
    expect(submissions.recordSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "proj-1:2024-06-01" }),
      "mock",
    );
  });

  it("refuses a FLAGGED record before any transport call", async () => {
    const client = new MockPCPClient();
    const spy = vi.spyOn(client, "submitDistribution");
    await expect(
      triggerDistribution(client, { ...baseInput, record: gate({ status: "flagged" }) }),
    ).rejects.toThrow(DistributionRefused);
    expect(spy).not.toHaveBeenCalled();
    // Nothing was written either — a refusal is not a submission.
    expect(submissions.recordSubmission).not.toHaveBeenCalled();
  });

  it("refuses a PENDING record before any transport call", async () => {
    const client = new MockPCPClient();
    const spy = vi.spyOn(client, "submitDistribution");
    await expect(
      triggerDistribution(client, { ...baseInput, record: gate({ status: "pending" }) }),
    ).rejects.toThrow(DistributionRefused);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not resubmit when the idempotency key was already used", async () => {
    vi.spyOn(submissions, "findByIdempotencyKey").mockResolvedValue(row);
    const client = new MockPCPClient();
    const spy = vi.spyOn(client, "submitDistribution");
    const outcome = await triggerDistribution(client, baseInput);
    expect(outcome.submitted).toBe(false);
    expect(outcome.duplicateOf?.id).toBe("sub-1");
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the key claimed when the transport throws, so a retry cannot double-pay", async () => {
    const client = new MockPCPClient({ failureMode: "timeout" });
    await expect(triggerDistribution(client, baseInput)).rejects.toThrow(/timed out/);
    // The row was written before the call and marked failed after — it still
    // holds the idempotency key.
    expect(submissions.recordSubmission).toHaveBeenCalledOnce();
    expect(submissions.failSubmission).toHaveBeenCalledWith("sub-1", expect.any(Error));

    vi.spyOn(submissions, "findByIdempotencyKey").mockResolvedValue({
      ...row,
      status: "failed",
    });
    const retry = await triggerDistribution(new MockPCPClient(), baseInput);
    expect(retry.submitted).toBe(false);
    expect(retry.duplicateOf?.status).toBe("failed");
  });

  it("records a rejection without treating it as a payment", async () => {
    const outcome = await triggerDistribution(
      new MockPCPClient({ failureMode: "reject" }),
      baseInput,
    );
    expect(outcome.submitted).toBe(true);
    expect(outcome.result?.accepted).toBe(false);
    expect(submissions.resolveSubmission).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ accepted: false }),
    );
  });
});

describe("client selection", () => {
  it("defaults to mock", () => {
    expect(loadPCPConfig({}).mode).toBe("mock");
    expect(getPcpClient(loadPCPConfig({})).mode).toBe("mock");
  });

  it("treats anything other than an explicit 'http' as mock", () => {
    // A typo must never silently point a payment trigger at a live API.
    expect(loadPCPConfig({ PCP_MODE: "HTTP" }).mode).toBe("mock");
    expect(loadPCPConfig({ PCP_MODE: "real" }).mode).toBe("mock");
    expect(loadPCPConfig({ PCP_MODE: "http" }).mode).toBe("http");
  });

  it("defaults to the sandbox environment and rejects unknown ones", () => {
    expect(loadPCPConfig({}).environment).toBe("sandbox");
    expect(loadPCPConfig({ PCP_ENVIRONMENT: "production" }).environment).toBe("sandbox");
    expect(loadPCPConfig({ PCP_ENVIRONMENT: "prod" }).environment).toBe("prod");
  });

  it("refuses to submit over HTTP without credentials", async () => {
    const client = getPcpClient(loadPCPConfig({ PCP_MODE: "http" }));
    expect(client.mode).toBe("http");
    await expect(
      client.submitDistribution(buildRequest(baseInput) as DistributionRequest),
    ).rejects.toThrow(/PCP_BASE_URL/);
  });
});
