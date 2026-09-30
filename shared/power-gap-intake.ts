import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const PowerGapConstraintType = {
  CAPACITY_SHORTFALL: "CAPACITY_SHORTFALL",
  TIMING_MISMATCH: "TIMING_MISMATCH",
  RELIABILITY_RESILIENCE: "RELIABILITY_RESILIENCE",
  COST_FLEXIBILITY: "COST_FLEXIBILITY",
  NOT_SURE: "NOT_SURE",
} as const;

export const powerGapIntakes = pgTable(
  "power_gap_intakes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    contactName: text("contact_name").notNull(),
    workEmail: text("work_email").notNull(),
    company: text("company").notNull(),
    role: text("role"),
    siteName: text("site_name").notNull(),
    siteLocation: text("site_location").notNull(),
    utility: text("utility").notNull(),
    isoRto: text("iso_rto"),
    requiredFirmMw: decimal("required_firm_mw", { precision: 12, scale: 3 }).notNull(),
    firmSupplyMw: decimal("firm_supply_mw", { precision: 12, scale: 3 }),
    targetPowerDate: text("target_power_date").notNull(),
    permanentPowerDate: text("permanent_power_date"),
    constraintType: text("constraint_type").notNull(),
    bridgeDuration: text("bridge_duration"),
    existingResources: jsonb("existing_resources").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    reliabilityNotes: text("reliability_notes"),
    notes: text("notes"),
    consent: boolean("consent").notNull().default(false),
    source: text("source").notNull().default("website_power_gap"),
    status: text("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("power_gap_intakes_created_at_idx").on(t.createdAt),
    statusIdx: index("power_gap_intakes_status_idx").on(t.status),
  }),
);

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
);

const optionalMw = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0).max(10_000).optional(),
);

export const powerGapIntakeRequestSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  workEmail: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  company: z.string().trim().min(2).max(160),
  role: z.string().trim().max(120).optional().default(""),
  siteName: z.string().trim().min(2).max(180),
  siteLocation: z.string().trim().min(2).max(180),
  utility: z.string().trim().min(2).max(160),
  isoRto: z.string().trim().max(80).optional().default(""),
  requiredFirmMw: z.coerce.number().positive().max(10_000),
  firmSupplyMw: optionalMw,
  targetPowerDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  permanentPowerDate: optionalDate,
  constraintType: z.enum([
    PowerGapConstraintType.CAPACITY_SHORTFALL,
    PowerGapConstraintType.TIMING_MISMATCH,
    PowerGapConstraintType.RELIABILITY_RESILIENCE,
    PowerGapConstraintType.COST_FLEXIBILITY,
    PowerGapConstraintType.NOT_SURE,
  ]),
  bridgeDuration: z.string().trim().max(80).optional().default(""),
  existingResources: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  reliabilityNotes: z.string().trim().max(600).optional().default(""),
  notes: z.string().trim().max(1500).optional().default(""),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(""),
});

export type PowerGapIntakeRequest = z.infer<typeof powerGapIntakeRequestSchema>;
export type PowerGapIntake = typeof powerGapIntakes.$inferSelect;
