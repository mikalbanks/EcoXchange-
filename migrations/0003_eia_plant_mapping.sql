ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "eia_plant_code" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "eia_generator_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "eia_reference_plant_name" text;
