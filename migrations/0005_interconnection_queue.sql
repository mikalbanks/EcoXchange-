CREATE TABLE IF NOT EXISTS "interconnection_queue_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"iso_code" text NOT NULL,
	"project_name" text DEFAULT '' NOT NULL,
	"queue_status" text,
	"resource_type" text,
	"capacity_mw" numeric(12, 4),
	"state" text DEFAULT '' NOT NULL,
	"county" text,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"raw_json" text,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "interconnection_queue_iso_external_uid" ON "interconnection_queue_entries" ("iso_code","external_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interconnection_queue_state_idx" ON "interconnection_queue_entries" ("state");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue_entry_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" varchar NOT NULL UNIQUE,
	"backtest_summary" jsonb,
	"annual_mwh_modeled" numeric(14, 3),
	"annual_kwh_nsrdb" numeric(16, 0),
	"irr_proxy_pct" numeric(8, 4),
	"moic_proxy" numeric(8, 4),
	"ppa_scenario" jsonb,
	"waterfall_summary" jsonb,
	"monthly_waterfall_series" jsonb,
	"engine_version" text DEFAULT '1' NOT NULL,
	"compute_status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"computed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "queue_entry_analytics" ADD CONSTRAINT "queue_entry_analytics_entry_id_interconnection_queue_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."interconnection_queue_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_entry_analytics_status_idx" ON "queue_entry_analytics" ("compute_status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisdiction_ppa_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text,
	"iso_code" text,
	"region_label" text DEFAULT '' NOT NULL,
	"regulatory_zone" text,
	"benchmark_usd_per_mwh" numeric(10, 4) NOT NULL,
	"effective_from" timestamp,
	"source_note" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisdiction_ppa_state_iso_idx" ON "jurisdiction_ppa_benchmarks" ("state","iso_code");
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "queue_entry_id" varchar;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_queue_entry_id_interconnection_queue_entries_id_fk" FOREIGN KEY ("queue_entry_id") REFERENCES "public"."interconnection_queue_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
