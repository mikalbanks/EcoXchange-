ALTER TABLE "projects" ADD COLUMN "ppa_rate" numeric(10, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "monthly_debt_service" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "monthly_opex" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "reserve_rate" numeric(5, 4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sgt_intervals" ADD COLUMN "settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'PENDING' NOT NULL;