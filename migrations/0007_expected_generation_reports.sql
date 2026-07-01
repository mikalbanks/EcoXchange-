CREATE TABLE IF NOT EXISTS "expected_generation_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"period" text NOT NULL,
	"config_hash" text NOT NULL,
	"p50_kwh" numeric(14, 4) NOT NULL,
	"p90_kwh" numeric(14, 4) NOT NULL,
	"combined_uncertainty_pct" numeric(8, 4) NOT NULL,
	"weather_source" text NOT NULL,
	"engine_version" text NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expected_generation_reports" ADD CONSTRAINT "expected_generation_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "expected_generation_reports_pid_period_hash_uid" ON "expected_generation_reports" ("project_id","period","config_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expected_generation_reports_pid_period_idx" ON "expected_generation_reports" ("project_id","period");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_uncertainty" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_key" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"interannual_variability" numeric(8, 5) NOT NULL,
	"n_years" integer NOT NULL,
	"years_covered" text NOT NULL,
	"source" text DEFAULT 'nsrdb' NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "site_uncertainty_site_key_uid" ON "site_uncertainty" ("site_key");
