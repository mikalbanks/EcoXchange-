/**
 * Spec 18 § 3.3 — PCP transport configuration.
 *
 * `PCP_MODE` defaults to `mock`. Flipping to `http` is a one-line config change
 * once Polymath supplies credentials; nothing upstream of the interface moves.
 *
 * `PCP_CLIENT_SECRET` belongs in Supabase Vault, never in a committed env file.
 * `.env.example` documents the names only.
 */

import type { PCPMode } from "./interface.js";

export type PCPEnvironment = "dev" | "dev-luna" | "sandbox" | "staging" | "prod";

export interface PCPConfig {
  mode: PCPMode;
  environment: PCPEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  jwksUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

/** The five environments published by PolymathNetwork/auth-jwks. */
const ENVIRONMENTS: PCPEnvironment[] = [
  "dev",
  "dev-luna",
  "sandbox",
  "staging",
  "prod",
];

function parseEnvironment(raw: string | undefined): PCPEnvironment {
  return ENVIRONMENTS.includes(raw as PCPEnvironment)
    ? (raw as PCPEnvironment)
    : "sandbox";
}

export function loadPCPConfig(env: NodeJS.ProcessEnv = process.env): PCPConfig {
  return {
    // Anything other than an explicit "http" is mock. A typo must not silently
    // point a distribution trigger at a real payments API.
    mode: env.PCP_MODE === "http" ? "http" : "mock",
    environment: parseEnvironment(env.PCP_ENVIRONMENT),
    baseUrl: (env.PCP_BASE_URL ?? "").replace(/\/$/, ""),
    clientId: env.PCP_CLIENT_ID ?? "",
    clientSecret: env.PCP_CLIENT_SECRET ?? "",
    jwksUrl: env.PCP_JWKS_URL ?? "",
    timeoutMs: Number.parseInt(env.PCP_TIMEOUT_S ?? "", 10) * 1000 || 30_000,
    maxRetries: Number.parseInt(env.PCP_MAX_RETRIES ?? "", 10) || 3,
  };
}
