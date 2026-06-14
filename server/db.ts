import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Supabase's connection poolers present a TLS certificate that isn't in Node's
// default trust store, so node-postgres throws "self-signed certificate in
// certificate chain" under a plain sslmode=require URL. Encrypt the connection
// but skip CA verification for managed Postgres (Supabase / sslmode=require);
// leave SSL off for local/unencrypted connections.
function resolveSsl(): false | { rejectUnauthorized: boolean } {
  const url = process.env.DATABASE_URL ?? "";
  if (/sslmode=require/i.test(url) || /supabase\.(co|com)/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(),
});

export const db = drizzle(pool, { schema });

export default pool;
