/**
 * Spec 18 § 2.1 / § 2.2 — Polymesh chain read configuration.
 *
 * The spec's architecture decision: query the public SubQuery GraphQL
 * middleware directly rather than standing up `polymesh-rest-api`. That service
 * is self-hosted (NestJS + its own node WebSocket and middleware URLs), which
 * is unjustified overhead for a read-only integration. The middleware is
 * already a public HTTP endpoint.
 *
 * Revisit only if a write path to the chain becomes necessary — signing needs
 * the TypeScript SDK or pcp-signing-managers, and writes go through Polymath
 * (Layer C), not directly to chain.
 *
 * Configuration follows the repo's dominant idiom: presence of config selects
 * behaviour. An unconfigured environment skips the sync rather than throwing,
 * the same way marketplace-refresh.ts skips without GRIDSTATUS_API_KEY.
 */

export type PolymeshNetwork = "testnet" | "mainnet";

/** Verified 2026-08-07 (Spec 18 § 2.1). Confirm with scripts/introspect-polymesh.sh. */
const DEFAULT_ENDPOINTS: Record<PolymeshNetwork, string> = {
  testnet: "https://testnet-graphqlnative.polymath.network/",
  mainnet: "https://mainnet-graphqlnative.polymath.network/",
};

export interface PolymeshConfig {
  network: PolymeshNetwork;
  graphqlUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

function parseNetwork(raw: string | undefined): PolymeshNetwork {
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/**
 * Reads config from the environment. Never throws — an unset `POLYMESH_NETWORK`
 * simply means testnet, which is the correct default while nothing is live.
 */
export function loadPolymeshConfig(
  env: NodeJS.ProcessEnv = process.env,
): PolymeshConfig {
  const network = parseNetwork(env.POLYMESH_NETWORK);
  return {
    network,
    graphqlUrl: env.POLYMESH_GRAPHQL_URL || DEFAULT_ENDPOINTS[network],
    timeoutMs: Number.parseInt(env.POLYMESH_TIMEOUT_MS ?? "", 10) || 30_000,
    maxRetries: Number.parseInt(env.POLYMESH_MAX_RETRIES ?? "", 10) || 3,
  };
}

/**
 * Whether the Supabase write path is available. The sync is a no-op without it,
 * mirroring how the rest of the repo degrades to in-memory when Supabase is
 * unconfigured (see .env.example).
 */
export function isPersistenceConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
