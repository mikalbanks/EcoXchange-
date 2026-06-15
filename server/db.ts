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

export const db = drizzle(pool, { schema });

export default pool;
