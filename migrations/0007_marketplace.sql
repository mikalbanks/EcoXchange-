ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "external_links" jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL UNIQUE,
	"refreshed_at" timestamp,
	"listing_count" integer DEFAULT 0 NOT NULL,
	"last_run_status" text,
	"last_run_error" text,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
