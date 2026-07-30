import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// node-postgres maps a connection-string `sslmode=require` to *verifying* TLS,
// which rejects Supabase's pooler certificate ("self-signed certificate in
// certificate chain") and wins over a Pool `ssl` option. So strip `sslmode`
// from the URL and set `ssl` explicitly: encrypt without CA verification for
// managed Postgres (Supabase / any sslmode), plain/unencrypted for local DBs.
function buildPoolConfig(): pg.PoolConfig {
  const raw = process.env.DATABASE_URL;
  if (!raw) return {};
  try {
    const url = new URL(raw);
    const wantsSsl =
      url.searchParams.has("sslmode") || /supabase\.(co|com)$/i.test(url.hostname);
    url.searchParams.delete("sslmode");
    return {
      connectionString: url.toString(),
      ssl: wantsSsl ? { rejectUnauthorized: false } : false,
    };
  } catch {
    return { connectionString: raw };
  }
}

export const pool = new pg.Pool(buildPoolConfig());

// `pg.Pool` re-emits errors raised by *idle* clients. Without a listener that is
// an unhandled 'error' event, which takes the whole process down — so a paused
// Supabase project or a pooler blip becomes a hard restart instead of a
// degraded request. Log and let callers handle their own query failures.
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/**
 * Cheap liveness check. Returns false instead of throwing so callers can decide
 * how to degrade — a paused Supabase project makes every connection fail with
 * "Tenant or user not found" from the Supavisor pooler.
 */
export async function probeDatabase(timeoutMs = 3000): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
    try {
      await client.query("select 1");
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(`[db] probe failed: ${err?.message ?? err}`);
    return false;
  }
}

const CONNECTION_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "3D000", // invalid_catalog_name
  "28P01", // invalid_password
]);

/**
 * True when a query failed because the database was unreachable rather than
 * because the query itself was wrong. Lets routes answer 503 ("come back later")
 * instead of a generic 500. A paused Supabase project surfaces as the Supavisor
 * pooler message "Tenant or user not found", which carries no useful code.
 */
export function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && CONNECTION_ERROR_CODES.has(code)) return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    /tenant or user not found|tenant\/user|ENOTFOUND|ECONNREFUSED|connection terminated|timeout expired/i.test(
      message,
    )
  );
}

export const db = drizzle(pool, { schema });

export default pool;
