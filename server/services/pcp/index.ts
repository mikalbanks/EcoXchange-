/**
 * Spec 18 Layer C — the Polymath Capital Platform adapter.
 *
 * `getPcpClient()` is the only place a concrete transport is chosen. Callers
 * take a `PCPClient` and never import `MockPCPClient` or `HttpPCPClient`
 * directly, which is what makes the Phase 4 swap a config change.
 */

import { loadPCPConfig, type PCPConfig } from "./config.js";
import { HttpPCPClient } from "./http-client.js";
import { MockPCPClient } from "./mock-client.js";
import type { PCPClient } from "./interface.js";

let cached: PCPClient | undefined;

/**
 * The configured client. Defaults to mock — flipping `PCP_MODE=http` is the
 * one-line change described in § 3.3.
 */
export function getPcpClient(config: PCPConfig = loadPCPConfig()): PCPClient {
  if (config.mode === "http") return new HttpPCPClient(config);
  return new MockPCPClient({ latencyMs: 150 });
}

/** Memoised singleton for request handlers. */
export function pcpClient(): PCPClient {
  if (!cached) cached = getPcpClient();
  return cached;
}

/** Test seam. */
export function resetPcpClientForTests(): void {
  cached = undefined;
}

export { loadPCPConfig, type PCPConfig, type PCPEnvironment } from "./config.js";
export { HttpPCPClient } from "./http-client.js";
export { MockPCPClient, type FailureMode } from "./mock-client.js";
export {
  DistributionRefused,
  idempotencyKey,
  type DistributionRequest,
  type DistributionResult,
  type DistributionStatus,
  type PCPClient,
  type PCPMode,
  type SubmissionStatus,
} from "./interface.js";
export { assertAmount, assertPayable, type VerificationGate } from "./guards.js";
export {
  findByIdempotencyKey,
  isSupabaseConfigured as isPcpPersistenceConfigured,
  type PcpSubmissionRow,
} from "./submissions.js";
export {
  buildRequest,
  pollUntilTerminal,
  triggerDistribution,
  type TriggerInput,
  type TriggerOutcome,
} from "./trigger.js";
