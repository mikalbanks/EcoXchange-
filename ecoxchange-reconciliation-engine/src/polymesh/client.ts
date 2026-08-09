/**
 * Spec 18 § 2.2 — GraphQL client for the Polymesh SubQuery middleware.
 *
 * Retry with exponential backoff is deliberate rather than incidental: the
 * middleware is a free public endpoint (Spec 18 risk #5), and this repository
 * has no retry helper of its own — every other outbound call is a single
 * attempt behind a timeout. Rather than add `p-retry` to a second package.json,
 * the backoff is local and small.
 *
 * Retries only on transport failures and 5xx/429. A 4xx is a bad query and
 * retrying it just wastes the endpoint's budget.
 */

import type { PolymeshConfig } from "./config.js";

export class PolymeshQueryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "PolymeshQueryError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class PolymeshClient {
  constructor(private readonly config: PolymeshConfig) {}

  get network() {
    return this.config.network;
  }

  get endpoint() {
    return this.config.graphqlUrl;
  }

  /**
   * Executes one GraphQL query. Throws `PolymeshQueryError` when the endpoint
   * is unreachable after `maxRetries`, or when the response carries GraphQL
   * errors — a partial `data` alongside `errors` is treated as a failure,
   * because a half-synced asset is worse than an unsynced one.
   */
  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        // 500ms, 1s, 2s, … capped so a scheduled run cannot stall for minutes.
        await sleep(Math.min(500 * 2 ** (attempt - 1), 8_000));
      }

      try {
        const response = await fetch(this.config.graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        if (!response.ok) {
          const retryable = isRetryableStatus(response.status);
          const err = new PolymeshQueryError(
            `Polymesh middleware returned ${response.status}`,
            response.status,
            retryable,
          );
          if (!retryable) throw err;
          lastError = err;
          continue;
        }

        const body = (await response.json()) as GraphQLResponse<T>;
        if (body.errors?.length) {
          // A GraphQL-level error is a query problem, not a transport problem.
          throw new PolymeshQueryError(
            `Polymesh query failed: ${body.errors.map((e) => e.message).join("; ")}`,
          );
        }
        if (!body.data) {
          throw new PolymeshQueryError("Polymesh query returned no data");
        }
        return body.data;
      } catch (err) {
        if (err instanceof PolymeshQueryError && !err.retryable) throw err;
        lastError = err as Error;
      }
    }

    throw new PolymeshQueryError(
      `Polymesh middleware unreachable after ${this.config.maxRetries + 1} attempts: ${lastError?.message ?? "unknown error"}`,
      undefined,
      true,
    );
  }

  /** Cheap liveness probe. Never throws — returns false so callers can degrade. */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query<{ blocks: unknown }>(
        `query PolymeshHealth { blocks(first: 1) { totalCount } }`,
      );
      return true;
    } catch {
      return false;
    }
  }
}
