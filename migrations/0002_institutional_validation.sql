ALTER TABLE "projects" ADD COLUMN "sgt_score_nrel" numeric(6, 4);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "eia_actual_mwh" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "validation_confidence" numeric(6, 2);--> statement-breakpoint
