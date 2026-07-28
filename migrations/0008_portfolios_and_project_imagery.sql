-- Project imagery, physical/contract attributes, and investor portfolio construction.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "image_url" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "image_alt" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "image_credit" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "image_license" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "array_type" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "commercial_operation_date" timestamp;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "contract_term_remaining_years" numeric(5, 2);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar,
	"name" text DEFAULT 'Untitled portfolio' NOT NULL,
	"target_check_size_usd" numeric(15, 2) DEFAULT '100000',
	"allocations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"share_token" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolios_share_token_idx" ON "portfolios" ("share_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolios_owner_idx" ON "portfolios" ("owner_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fund_interests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" text NOT NULL,
	"check_size_usd" numeric(15, 2),
	"accreditation_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"risk_preference" text DEFAULT 'BALANCED' NOT NULL,
	"message" text,
	"source_portfolio_id" varchar,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fund_interests_email_idx" ON "fund_interests" ("email");
