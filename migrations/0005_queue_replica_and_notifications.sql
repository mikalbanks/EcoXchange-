ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "queue_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "external_developer_entity" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "queue_status" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "queue_submitted_date" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "proposed_cod" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "days_in_queue" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "queue_iso" text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_queue_id_unique" UNIQUE("queue_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "project_id" varchar,
  "payload" text,
  "created_at" timestamp DEFAULT now()
);
