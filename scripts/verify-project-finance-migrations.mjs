import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for isolated project-finance migration verification");
}

const parsedUrl = new URL(databaseUrl);
const wantsSsl =
  parsedUrl.searchParams.has("sslmode") ||
  /supabase\.(co|com)$/i.test(parsedUrl.hostname);
parsedUrl.searchParams.delete("sslmode");

const ticket08Migrations = [
  "0015_project_finance_core_tenancy.sql",
  "0016_project_finance_projects.sql",
  "0017_project_finance_facts_documents.sql",
  "0018_project_finance_scenarios.sql",
  "0019_project_finance_policies.sql",
  "0020_project_finance_calculation_runs.sql",
  "0021_project_finance_financial_results.sql",
  "0022_project_finance_underwriting_results.sql",
  "0023_project_finance_audit_rls.sql",
  "0024_project_finance_views_indexes.sql",
  "0025_project_finance_ai_runs.sql",
  "0026_project_finance_access_grants.sql",
];

const ticket09Migrations = ["0027_underwriting_policy_v0_1_0.sql"];
const pool = new Pool({
  connectionString: parsedUrl.toString(),
  ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

async function applyMigration(filename) {
  const sql = await readFile(resolve(process.cwd(), "migrations", filename), "utf8");
  try {
    await pool.query(sql);
    console.log(`applied ${filename}`);
  } catch (error) {
    error.message = `${filename} failed: ${error.message}`;
    throw error;
  }
}

try {
  // Supabase provides these roles/functions in production. A plain PostgreSQL service
  // does not, so recreate only the minimum platform contract needed to prove the
  // project-finance migrations themselves against a fresh isolated database.
  await pool.query(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin;
      end if;
    end $$;

    create schema if not exists auth;
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$ select null::uuid $$;
  `);

  for (const filename of ticket08Migrations) {
    await applyMigration(filename);
  }

  const requiredTables = [
    "project_finance.organizations",
    "project_finance.projects",
    "project_finance.project_facts",
    "project_finance.scenarios",
    "project_finance.underwriting_policies",
    "project_finance.calculation_runs",
    "project_finance.financing_results",
    "project_finance.underwriting_runs",
    "project_finance.underwriting_rule_results",
    "project_finance.audit_events",
    "project_finance.ai_runs",
  ];

  const tableCheck = await pool.query(
    `select unnest($1::text[]) as name`,
    [requiredTables],
  );
  for (const { name } of tableCheck.rows) {
    const result = await pool.query("select to_regclass($1) as table_name", [name]);
    if (!result.rows[0]?.table_name) {
      throw new Error(`Ticket 08 verification failed: missing ${name}`);
    }
  }

  const rlsCheck = await pool.query(`
    select count(*)::int as enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'project_finance'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  `);
  if ((rlsCheck.rows[0]?.enabled ?? 0) < 10) {
    throw new Error(
      `Ticket 08 verification failed: expected tenant RLS on at least 10 project-finance tables, found ${rlsCheck.rows[0]?.enabled ?? 0}`,
    );
  }

  console.log("Ticket 08 migrations verified against isolated PostgreSQL");

  for (const filename of ticket09Migrations) {
    await applyMigration(filename);
  }

  const policyCheck = await pool.query(`
    select p.id, count(v.id)::int as value_count
    from project_finance.underwriting_policies p
    left join project_finance.underwriting_policy_values v on v.policy_id = p.id
    where p.organization_id is null
      and p.policy_code = 'ECOXCHANGE_SOLAR_BASE'
      and p.policy_version = '0.1.0'
      and p.status = 'ACTIVE'
    group by p.id
  `);

  if (policyCheck.rowCount !== 1 || policyCheck.rows[0].value_count < 18) {
    throw new Error(
      "Ticket 09 persistence verification failed: ECOXCHANGE_SOLAR_BASE v0.1.0 was not seeded with the complete versioned policy",
    );
  }

  console.log("Ticket 09 policy persistence verified against isolated PostgreSQL");
} finally {
  await pool.end();
}
