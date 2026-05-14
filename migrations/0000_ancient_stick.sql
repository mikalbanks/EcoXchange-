CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"denominated_in" text DEFAULT 'Wh' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capital_stacks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"total_capex" numeric(15, 2),
	"tax_credit_type" text DEFAULT 'UNKNOWN' NOT NULL,
	"tax_credit_estimated" numeric(15, 2),
	"tax_credit_transferability_ready" boolean DEFAULT false,
	"equity_needed" numeric(15, 2),
	"debt_placeholder" numeric(15, 2) DEFAULT '0',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "data_room_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT true,
	"status" text DEFAULT 'MISSING' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"period_label" text NOT NULL,
	"total_distributable" numeric(15, 2) NOT NULL,
	"investor_share" numeric(15, 2) NOT NULL,
	"platform_fee" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"distributed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"type" text NOT NULL,
	"filename" text NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "energy_production" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"production_mwh" numeric(12, 2) NOT NULL,
	"capacity_factor" numeric(5, 4),
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investor_interests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"investor_id" varchar NOT NULL,
	"amount_intent" numeric(15, 2),
	"structure_preference" text DEFAULT 'UNKNOWN' NOT NULL,
	"timeline" text DEFAULT 'UNKNOWN' NOT NULL,
	"message" text,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"meter_type" text DEFAULT 'NET' NOT NULL,
	"provider" text DEFAULT 'MANUAL' NOT NULL,
	"provider_uid" text,
	"name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"amount" numeric(16, 4) NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"offtaker_name" text NOT NULL,
	"contract_start_date" timestamp NOT NULL,
	"contract_end_date" timestamp NOT NULL,
	"price_per_mwh" numeric(10, 2) NOT NULL,
	"escalation_type" text DEFAULT 'FIXED' NOT NULL,
	"escalation_rate" numeric(5, 2) DEFAULT '0',
	"contracted_capacity_mw" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_approval_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"admin_id" varchar NOT NULL,
	"action" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"technology" text DEFAULT 'SOLAR' NOT NULL,
	"stage" text DEFAULT 'PRE_NTP' NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"state" text NOT NULL,
	"county" text NOT NULL,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"capacity_mw" numeric(10, 2),
	"capacity_kw" numeric(10, 2),
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"summary" text,
	"offtaker_type" text DEFAULT 'C_AND_I' NOT NULL,
	"interconnection_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"permitting_status" text DEFAULT 'UNKNOWN' NOT NULL,
	"site_control_status" text DEFAULT 'NONE' NOT NULL,
	"feoc_attested" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "readiness_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rating" text DEFAULT 'RED' NOT NULL,
	"reasons" text,
	"flags" text,
	"overridden_by_admin" boolean DEFAULT false,
	"override_notes" text
);
--> statement-breakpoint
CREATE TABLE "revenue_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"ppa_id" varchar NOT NULL,
	"production_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"gross_revenue" numeric(15, 2) NOT NULL,
	"operating_expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_revenue" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scada_connectors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'COMING_SOON' NOT NULL,
	"logo_url" text,
	"supported_technologies" text,
	"config_schema" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "scada_connectors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scada_data_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"source_type" text DEFAULT 'MANUAL' NOT NULL,
	"provider_name" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"data_quality" text DEFAULT 'UNKNOWN' NOT NULL,
	"last_sync_at" timestamp,
	"record_count" integer DEFAULT 0,
	"connector_id" varchar,
	"config_json" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sgt_intervals" (
	"id" serial PRIMARY KEY NOT NULL,
	"meter_id" varchar NOT NULL,
	"interval_start" timestamp NOT NULL,
	"interval_end" timestamp NOT NULL,
	"net_wh" numeric(14, 2),
	"expected_gross_wh" numeric(14, 2),
	"synthetic_gross_wh" numeric(14, 2),
	"irradiance_wm2" numeric(10, 4),
	"source" text DEFAULT 'CALCULATED' NOT NULL,
	"quality_flag" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"interval_id" integer,
	"memo" text,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'DEVELOPER' NOT NULL,
	"name" text NOT NULL,
	"org_name" text,
	"persona_inquiry_id" text,
	"persona_status" text DEFAULT 'not_started' NOT NULL,
	"persona_verified_at" timestamp,
	"persona_last_event_at" timestamp,
	"persona_payload" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sgt_intervals" ADD CONSTRAINT "sgt_intervals_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_interval_id_sgt_intervals_id_fk" FOREIGN KEY ("interval_id") REFERENCES "public"."sgt_intervals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;