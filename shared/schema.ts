import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

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

// ─── PPAs (Power Purchase Agreements) ───────────────────────────────────────

export const PpaEscalationType = {
  FIXED: "FIXED",
  ESCALATING: "ESCALATING",
} as const;

export const ppas = pgTable("ppas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  offtakerName: text("offtaker_name").notNull(),
  contractStartDate: timestamp("contract_start_date").notNull(),
  contractEndDate: timestamp("contract_end_date").notNull(),
  pricePerMwh: decimal("price_per_mwh", { precision: 10, scale: 2 }).notNull(),
  escalationType: text("escalation_type").notNull().default("FIXED"),
  escalationRate: decimal("escalation_rate", { precision: 5, scale: 2 }).default("0"),
  contractedCapacityMW: decimal("contracted_capacity_mw", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPpaSchema = createInsertSchema(ppas).omit({
  id: true,
  createdAt: true,
});

export type InsertPpa = z.infer<typeof insertPpaSchema>;
export type Ppa = typeof ppas.$inferSelect;

// ─── Energy Production ──────────────────────────────────────────────────────

export const energyProduction = pgTable("energy_production", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  productionMwh: decimal("production_mwh", { precision: 12, scale: 2 }).notNull(),
  capacityFactor: decimal("capacity_factor", { precision: 5, scale: 4 }),
  source: text("source").notNull().default("MANUAL"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEnergyProductionSchema = createInsertSchema(energyProduction).omit({
  id: true,
  createdAt: true,
});

export type InsertEnergyProduction = z.infer<typeof insertEnergyProductionSchema>;
export type EnergyProduction = typeof energyProduction.$inferSelect;

// ─── Revenue Records ────────────────────────────────────────────────────────

export const revenueRecords = pgTable("revenue_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  ppaId: varchar("ppa_id").notNull(),
  productionId: varchar("production_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  grossRevenue: decimal("gross_revenue", { precision: 15, scale: 2 }).notNull(),
  operatingExpenses: decimal("operating_expenses", { precision: 15, scale: 2 }).notNull().default("0"),
  netRevenue: decimal("net_revenue", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRevenueRecordSchema = createInsertSchema(revenueRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertRevenueRecord = z.infer<typeof insertRevenueRecordSchema>;
export type RevenueRecord = typeof revenueRecords.$inferSelect;

// ─── Distributions ──────────────────────────────────────────────────────────

export const DistributionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DISTRIBUTED: "DISTRIBUTED",
} as const;

export const distributions = pgTable("distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  periodLabel: text("period_label").notNull(),
  totalDistributable: decimal("total_distributable", { precision: 15, scale: 2 }).notNull(),
  investorShare: decimal("investor_share", { precision: 15, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDistributionSchema = createInsertSchema(distributions).omit({
  id: true,
  createdAt: true,
});

export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type Distribution = typeof distributions.$inferSelect;

// ─── SCADA Data Sources ──────────────────────────────────────────────────────

export const ScadaSourceType = {
  PVDAQ_VERIFIED: "PVDAQ_VERIFIED",
  CSV_UPLOAD: "CSV_UPLOAD",
  CONNECTOR: "CONNECTOR",
  MANUAL: "MANUAL",
} as const;

export const ScadaSourceStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ERROR: "ERROR",
  PENDING: "PENDING",
} as const;

export const ScadaDataQuality = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN",
} as const;

export const scadaDataSources = pgTable("scada_data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  sourceType: text("source_type").notNull().default("MANUAL"),
  providerName: text("provider_name"),
  status: text("status").notNull().default("PENDING"),
  dataQuality: text("data_quality").notNull().default("UNKNOWN"),
  lastSyncAt: timestamp("last_sync_at"),
  recordCount: integer("record_count").default(0),
  connectorId: varchar("connector_id"),
  configJson: text("config_json"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScadaDataSourceSchema = createInsertSchema(scadaDataSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScadaDataSource = z.infer<typeof insertScadaDataSourceSchema>;
export type ScadaDataSource = typeof scadaDataSources.$inferSelect;

// ─── SCADA Connectors ────────────────────────────────────────────────────────

export const ScadaConnectorStatus = {
  AVAILABLE: "AVAILABLE",
  COMING_SOON: "COMING_SOON",
  BETA: "BETA",
} as const;

export const scadaConnectors = pgTable("scada_connectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("COMING_SOON"),
  logoUrl: text("logo_url"),
  supportedTechnologies: text("supported_technologies"),
  configSchema: text("config_schema"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScadaConnectorSchema = createInsertSchema(scadaConnectors).omit({
  id: true,
  createdAt: true,
});

export type InsertScadaConnector = z.infer<typeof insertScadaConnectorSchema>;
export type ScadaConnector = typeof scadaConnectors.$inferSelect;

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
