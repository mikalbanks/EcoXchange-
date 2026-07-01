import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Supabase poolers present a TLS cert outside Node's trust store. Strip
// `sslmode` from the URL and set non-verifying SSL so `drizzle-kit push` can
// connect (mirrors the runtime pool config in server/db.ts).
const dbUrl = new URL(process.env.DATABASE_URL);
const wantsSsl =
  dbUrl.searchParams.has("sslmode") || /supabase\.(co|com)$/i.test(dbUrl.hostname);
dbUrl.searchParams.delete("sslmode");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl.toString(),
    ssl: wantsSsl ? { rejectUnauthorized: false } : false,
  },
  tablesFilter: [
    "users",
    "projects",
    "capital_stacks",
    "readiness_scores",
    "documents",
    "data_room_checklist_items",
    "investor_interests",
    "project_approval_logs",
    "ppas",
    "energy_production",
    "revenue_records",
    "distributions",
    "scada_data_sources",
    "scada_connectors",
    "meters",
    "sgt_intervals",
    "accounts",
    "transactions",
    "postings",
    "conversations",
    "messages",
    "interconnection_queue_entries",
    "queue_entry_analytics",
    "jurisdiction_ppa_benchmarks",
    "expected_generation_reports",
    "site_uncertainty",
  ],
});
