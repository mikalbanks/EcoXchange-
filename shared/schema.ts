import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  ADMIN: "ADMIN",
  DEVELOPER: "DEVELOPER",
  INVESTOR: "INVESTOR",
} as const;

export const Technology = {
  SOLAR: "SOLAR",
  SOLAR_STORAGE: "SOLAR_STORAGE",
} as const;

export const ProjectStage = {
  PRE_NTP: "PRE_NTP",
  NTP: "NTP",
  CONSTRUCTION: "CONSTRUCTION",
  COD: "COD",
} as const;

export const ProjectStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  IN_REVIEW: "IN_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const OfftakerType = {
  C_AND_I: "C_AND_I",
  COMMUNITY_SOLAR: "COMMUNITY_SOLAR",
  UTILITY: "UTILITY",
  MERCHANT: "MERCHANT",
} as const;

export const InterconnectionStatus = {
  UNKNOWN: "UNKNOWN",
  APPLIED: "APPLIED",
  STUDY: "STUDY",
  IA_EXECUTED: "IA_EXECUTED",
  READY_TO_BUILD: "READY_TO_BUILD",
} as const;

export const PermittingStatus = {
  UNKNOWN: "UNKNOWN",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
} as const;

export const SiteControlStatus = {
  NONE: "NONE",
  LOI: "LOI",
  OPTION: "OPTION",
  LEASE: "LEASE",
  OWNED: "OWNED",
} as const;

export const TaxCreditType = {
  ITC: "ITC",
  PTC: "PTC",
  UNKNOWN: "UNKNOWN",
} as const;

export const ReadinessRating = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
} as const;

export const DocumentType = {
  SITE_CONTROL: "SITE_CONTROL",
  INTERCONNECTION: "INTERCONNECTION",
  PERMITS: "PERMITS",
  EPC: "EPC",
  FINANCIAL_MODEL: "FINANCIAL_MODEL",
  INSURANCE: "INSURANCE",
  FEOC_ATTESTATION: "FEOC_ATTESTATION",
  OTHER: "OTHER",
} as const;

export const ChecklistStatus = {
  MISSING: "MISSING",
  UPLOADED: "UPLOADED",
  VERIFIED: "VERIFIED",
} as const;

export const StructurePreference = {
  EQUITY: "EQUITY",
  PREFERRED: "PREFERRED",
  UNKNOWN: "UNKNOWN",
} as const;

export const InvestorTimeline = {
  IMMEDIATE: "IMMEDIATE",
  DAYS_30_60: "DAYS_30_60",
  DAYS_60_90: "DAYS_60_90",
  UNKNOWN: "UNKNOWN",
} as const;

export const InterestStatus = {
  SUBMITTED: "SUBMITTED",
  WITHDRAWN: "WITHDRAWN",
  ACCEPTED_BY_DEV: "ACCEPTED_BY_DEV",
  DECLINED_BY_DEV: "DECLINED_BY_DEV",
} as const;

export const ApprovalAction = {
  SUBMIT: "SUBMIT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  REQUEST_CHANGES: "REQUEST_CHANGES",
  OVERRIDE_SCORE: "OVERRIDE_SCORE",
} as const;

export const PersonaStatus = {
  NOT_STARTED: "not_started",
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("DEVELOPER"),
  name: text("name").notNull(),
  orgName: text("org_name"),
  personaInquiryId: text("persona_inquiry_id"),
  personaStatus: text("persona_status").notNull().default("not_started"),
  personaVerifiedAt: timestamp("persona_verified_at"),
  personaLastEventAt: timestamp("persona_last_event_at"),
  personaPayload: text("persona_payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developerId: varchar("developer_id").notNull(),
  name: text("name").notNull(),
  technology: text("technology").notNull().default("SOLAR"),
  stage: text("stage").notNull().default("PRE_NTP"),
  country: text("country").notNull().default("US"),
  state: text("state").notNull(),
  county: text("county").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  capacityMW: decimal("capacity_mw", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("DRAFT"),
  summary: text("summary"),
  offtakerType: text("offtaker_type").notNull().default("C_AND_I"),
  interconnectionStatus: text("interconnection_status").notNull().default("UNKNOWN"),
  permittingStatus: text("permitting_status").notNull().default("UNKNOWN"),
  siteControlStatus: text("site_control_status").notNull().default("NONE"),
  feocAttested: boolean("feoc_attested").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Capital Stack ───────────────────────────────────────────────────────────

export const capitalStacks = pgTable("capital_stacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  totalCapex: decimal("total_capex", { precision: 15, scale: 2 }),
  taxCreditType: text("tax_credit_type").notNull().default("UNKNOWN"),
  taxCreditEstimated: decimal("tax_credit_estimated", { precision: 15, scale: 2 }),
  taxCreditTransferabilityReady: boolean("tax_credit_transferability_ready").default(false),
  equityNeeded: decimal("equity_needed", { precision: 15, scale: 2 }),
  debtPlaceholder: decimal("debt_placeholder", { precision: 15, scale: 2 }).default("0"),
  notes: text("notes"),
});

export const insertCapitalStackSchema = createInsertSchema(capitalStacks).omit({
  id: true,
});

export type InsertCapitalStack = z.infer<typeof insertCapitalStackSchema>;
export type CapitalStack = typeof capitalStacks.$inferSelect;

// ─── Readiness Score ─────────────────────────────────────────────────────────

export const readinessScores = pgTable("readiness_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  score: integer("score").notNull().default(0),
  rating: text("rating").notNull().default("RED"),
  reasons: text("reasons"),
  flags: text("flags"),
  overriddenByAdmin: boolean("overridden_by_admin").default(false),
  overrideNotes: text("override_notes"),
});

export const insertReadinessScoreSchema = createInsertSchema(readinessScores).omit({
  id: true,
});

export type InsertReadinessScore = z.infer<typeof insertReadinessScoreSchema>;
export type ReadinessScore = typeof readinessScores.$inferSelect;

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  type: text("type").notNull(),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ─── Data Room Checklist Items ───────────────────────────────────────────────

export const dataRoomChecklistItems = pgTable("data_room_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  required: boolean("required").default(true),
  status: text("status").notNull().default("MISSING"),
  notes: text("notes"),
});

export const insertDataRoomChecklistItemSchema = createInsertSchema(dataRoomChecklistItems).omit({
  id: true,
});

export type InsertDataRoomChecklistItem = z.infer<typeof insertDataRoomChecklistItemSchema>;
export type DataRoomChecklistItem = typeof dataRoomChecklistItems.$inferSelect;

// ─── Investor Interest ───────────────────────────────────────────────────────

export const investorInterests = pgTable("investor_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  amountIntent: decimal("amount_intent", { precision: 15, scale: 2 }),
  structurePreference: text("structure_preference").notNull().default("UNKNOWN"),
  timeline: text("timeline").notNull().default("UNKNOWN"),
  message: text("message"),
  status: text("status").notNull().default("SUBMITTED"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestorInterestSchema = createInsertSchema(investorInterests).omit({
  id: true,
  createdAt: true,
});

export type InsertInvestorInterest = z.infer<typeof insertInvestorInterestSchema>;
export type InvestorInterest = typeof investorInterests.$inferSelect;

// ─── Project Approval Log ────────────────────────────────────────────────────

export const projectApprovalLogs = pgTable("project_approval_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  adminId: varchar("admin_id").notNull(),
  action: text("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectApprovalLogSchema = createInsertSchema(projectApprovalLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectApprovalLog = z.infer<typeof insertProjectApprovalLogSchema>;
export type ProjectApprovalLog = typeof projectApprovalLogs.$inferSelect;

// ─── Zod Validation Schemas ─────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["DEVELOPER", "INVESTOR"]),
});

export const projectWizardStep1Schema = z.object({
  name: z.string().min(1, "Project name is required"),
  technology: z.enum(["SOLAR", "SOLAR_STORAGE"]),
  stage: z.enum(["PRE_NTP", "NTP", "CONSTRUCTION", "COD"]),
  state: z.string().min(1, "State is required"),
  county: z.string().min(1, "County is required"),
  capacityMW: z.string().min(1, "Capacity is required"),
});

export const projectWizardStep2Schema = z.object({
  siteControlStatus: z.enum(["NONE", "LOI", "OPTION", "LEASE", "OWNED"]),
  interconnectionStatus: z.enum(["UNKNOWN", "APPLIED", "STUDY", "IA_EXECUTED", "READY_TO_BUILD"]),
  permittingStatus: z.enum(["UNKNOWN", "IN_PROGRESS", "SUBMITTED", "APPROVED"]),
  offtakerType: z.enum(["C_AND_I", "COMMUNITY_SOLAR", "UTILITY", "MERCHANT"]),
  feocAttested: z.boolean(),
});

export const projectWizardStep3Schema = z.object({
  totalCapex: z.string().min(1, "Total capex is required"),
  taxCreditType: z.enum(["ITC", "PTC", "UNKNOWN"]),
  taxCreditEstimated: z.string().min(1, "Tax credit estimate is required"),
  taxCreditTransferabilityReady: z.boolean(),
  equityTarget: z.string().min(1, "Equity target is required"),
});

export const investorInterestFormSchema = z.object({
  amountIntent: z.string().min(1, "Amount is required"),
  structurePreference: z.enum(["EQUITY", "PREFERRED", "UNKNOWN"]),
  timeline: z.enum(["IMMEDIATE", "DAYS_30_60", "DAYS_60_90", "UNKNOWN"]),
  message: z.string().optional(),
});
