CREATE TABLE IF NOT EXISTS "irradiance_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" varchar NOT NULL,
	"meter_id" varchar,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"capacity_kw" numeric(10, 2) NOT NULL,
	"pv_estimate_kw" numeric(14, 4) NOT NULL,
	"irradiance_wm2" numeric(10, 4),
	"interval_start" timestamp NOT NULL,
	"interval_end" timestamp NOT NULL,
	"satellite_source" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"raw_response_hash" text NOT NULL,
	"raw_response_json" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "irradiance_snapshots_pid_start_source_uid" ON "irradiance_snapshots" ("project_id","interval_start","satellite_source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "irradiance_snapshots_pid_start_idx" ON "irradiance_snapshots" ("project_id","interval_start");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"interval_id" integer,
	"granularity" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"expected_kwh" numeric(14, 4) NOT NULL,
	"actual_kwh" numeric(14, 4) NOT NULL,
	"variance_pct" numeric(8, 4) NOT NULL,
	"tolerance_pct" numeric(6, 4) NOT NULL,
	"ppa_rate_usd_per_kwh" numeric(10, 6) NOT NULL,
	"ppa_source" text NOT NULL,
	"offtaker_class" text NOT NULL,
	"plant_use" text NOT NULL,
	"gross_revenue_usd" numeric(15, 4) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"evidence_hash" text NOT NULL,
	"settled_transaction_id" varchar,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"cleared_at" timestamp,
	"settled_at" timestamp,
	"notes" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_interval_id_sgt_intervals_id_fk" FOREIGN KEY ("interval_id") REFERENCES "public"."sgt_intervals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_settled_transaction_id_transactions_id_fk" FOREIGN KEY ("settled_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "verification_runs_pid_gran_start_uid" ON "verification_runs" ("project_id","granularity","period_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_runs_pid_status_start_idx" ON "verification_runs" ("project_id","status","period_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_runs_interval_idx" ON "verification_runs" ("interval_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anomaly_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"verification_run_id" varchar NOT NULL,
	"rule_code" text NOT NULL,
	"severity" text NOT NULL,
	"detail" jsonb NOT NULL,
	"raised_at" timestamp DEFAULT now() NOT NULL,
	"cleared_at" timestamp,
	"cleared_by" varchar,
	"cleared_reason" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anomaly_flags" ADD CONSTRAINT "anomaly_flags_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomaly_flags_run_idx" ON "anomaly_flags" ("verification_run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anomaly_flags_rule_severity_idx" ON "anomaly_flags" ("rule_code","severity","raised_at");
