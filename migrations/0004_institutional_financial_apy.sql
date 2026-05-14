ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "financial_apy_pct" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "market_ppa_source" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "market_ppa_benchmark_usd_per_mwh" numeric(10, 4);
