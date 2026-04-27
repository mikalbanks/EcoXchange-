import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
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
    "admin_notifications",
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
  ],
});
