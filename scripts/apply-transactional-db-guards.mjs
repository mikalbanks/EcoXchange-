import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply transactional database guards");
}

const parsedUrl = new URL(databaseUrl);
const wantsSsl =
  parsedUrl.searchParams.has("sslmode") ||
  /supabase\.(co|com)$/i.test(parsedUrl.hostname);
parsedUrl.searchParams.delete("sslmode");

const migrationPath = fileURLToPath(
  new URL(
    "../migrations/0014_reassert_transactional_rls_after_schema_push.sql",
    import.meta.url,
  ),
);
const migrationSql = await readFile(migrationPath, "utf8");

const pool = new Pool({
  connectionString: parsedUrl.toString(),
  ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

try {
  await pool.query(migrationSql);

  const verification = await pool.query(`
    SELECT
      count(*) FILTER (WHERE NOT c.relrowsecurity)::int AS rls_disabled,
      count(*) FILTER (
        WHERE
          has_table_privilege('anon', c.oid, 'SELECT') OR
          has_table_privilege('anon', c.oid, 'INSERT') OR
          has_table_privilege('anon', c.oid, 'UPDATE') OR
          has_table_privilege('anon', c.oid, 'DELETE') OR
          has_table_privilege('authenticated', c.oid, 'SELECT') OR
          has_table_privilege('authenticated', c.oid, 'INSERT') OR
          has_table_privilege('authenticated', c.oid, 'UPDATE') OR
          has_table_privilege('authenticated', c.oid, 'DELETE')
      )::int AS browser_accessible
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  `);

  const { rls_disabled: rlsDisabled, browser_accessible: browserAccessible } =
    verification.rows[0];

  if (rlsDisabled !== 0 || browserAccessible !== 0) {
    throw new Error(
      `Database guard verification failed: ${rlsDisabled} tables without RLS, ` +
        `${browserAccessible} tables accessible to browser roles`,
    );
  }

  console.log("Transactional database guards verified");
} finally {
  await pool.end();
}
