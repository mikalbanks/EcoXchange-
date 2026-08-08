/**
 * Spec 18 § 3.3 — `HttpPCPClient`, the real transport.
 *
 * PHASE 4, GATED ON POLYMATH. Every request path below is written against
 * inference, not documentation, and is unreachable until `PCP_BASE_URL` and
 * credentials exist. It is committed in this shape so that the swap is a
 * configuration change rather than a rewrite, exactly as § 3.1 requires.
 *
 * The auth model is inferred from `PolymathNetwork/auth-jwks` (pushed
 * 2026-03-25), which publishes JSON Web Key Sets for five environments —
 * `dev`, `dev-luna`, `sandbox`, `staging`, `prod`. Published JWKS implies
 * JWT-based programmatic auth and, critically, a sandbox to build against.
 *
 * **That is inference from repository artifacts, not documentation from
 * Polymath.** Spec 18 risk #7 is that the inference is simply wrong. If it is,
 * the cost is this file — the interface, the mock, the guards, the audit table
 * and every caller stay exactly as they are.
 *
 * Before this is used for real, confirm against Spec 18 § 6 question 4 whether
 * the distributions module accepts programmatic submission at all. If it does
 * not, risk #2 fires and the "72-hour automated distribution" claim in investor
 * materials is unsupported and must be revised before any general solicitation.
 */

import {
  DistributionRefused,
  type DistributionRequest,
  type DistributionResult,
  type PCPClient,
  type PCPMode,
} from "./interface.js";
import { formatCents } from "../distribution/money.js";
import type { PCPConfig } from "./config.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class HttpPCPClient implements PCPClient {
  readonly mode: PCPMode = "http";
  private token: TokenCache | null = null;

  constructor(private readonly config: PCPConfig) {}

  private assertConfigured(): void {
    if (!this.config.baseUrl || !this.config.clientId || !this.config.clientSecret) {
      throw new DistributionRefused(
        "PCP HTTP transport is selected but PCP_BASE_URL / PCP_CLIENT_ID / PCP_CLIENT_SECRET are not set. " +
          "Credentials come from Polymath (Spec 18 § 6); until then run with PCP_MODE=mock.",
        "not_configured",
      );
    }
  }

  /** Client-credentials grant, per the auth-jwks inference. */
  private async accessToken(): Promise<string> {
    this.assertConfigured();
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 30_000) return this.token.token;

    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`PCP auth failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this.token = {
      token: body.access_token,
      expiresAt: now + (body.expires_in ?? 3600) * 1000,
    };
    return this.token.token;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    this.assertConfigured();
    const token = await this.accessToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`PCP ${path} returned ${response.status}: ${detail.slice(0, 300)}`);
    }
    return (await response.json()) as T;
  }

  async getOffering(offeringId: string): Promise<Record<string, unknown>> {
    return this.request(`/offerings/${encodeURIComponent(offeringId)}`);
  }

  async listInvestors(offeringId: string): Promise<Array<Record<string, unknown>>> {
    const body = await this.request<{ data?: Array<Record<string, unknown>> }>(
      `/offerings/${encodeURIComponent(offeringId)}/investors`,
    );
    return body.data ?? [];
  }

  async submitDistribution(
    request: DistributionRequest,
  ): Promise<DistributionResult> {
    const submittedAt = new Date();
    const body = await this.request<{
      id?: string;
      status?: string;
      message?: string;
    }>(`/offerings/${encodeURIComponent(request.offeringId)}/distributions`, {
      method: "POST",
      // Sent whether or not Polymath honours it. The local unique constraint on
      // pcp_submissions.idempotency_key is the actual guarantee (risk #3).
      headers: { "Idempotency-Key": request.idempotencyKey },
      body: JSON.stringify({
        asset_id: request.assetId,
        period_start: request.periodStart,
        period_end: request.periodEnd,
        amount: formatCents(request.distributionAmount),
        currency: request.currency,
        reference: request.verificationRecordId,
      }),
    });

    const status = (body.status ?? "accepted") as DistributionResult["status"];
    return {
      accepted: status !== "rejected",
      pcpDistributionId: body.id ?? null,
      status,
      message: body.message ?? null,
      submittedAt,
    };
  }

  async getDistributionStatus(
    pcpDistributionId: string,
  ): Promise<DistributionResult> {
    const body = await this.request<{
      id?: string;
      status?: string;
      message?: string;
      submitted_at?: string;
    }>(`/distributions/${encodeURIComponent(pcpDistributionId)}`);
    const status = (body.status ?? "pending") as DistributionResult["status"];
    return {
      accepted: status !== "rejected",
      pcpDistributionId: body.id ?? pcpDistributionId,
      status,
      message: body.message ?? null,
      submittedAt: body.submitted_at ? new Date(body.submitted_at) : new Date(),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request("/health");
      return true;
    } catch {
      return false;
    }
  }
}
