import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp, integer, serial, jsonb, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type {
  FeeSchedule as Spec17FeeSchedule,
  ReservePolicy as Spec17ReservePolicy,
  DebtSchedule as Spec17DebtSchedule,
  WaterfallTier as Spec17WaterfallTier,
  MemberClass as Spec17MemberClass,
} from "./spec17-terms";

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

// ─── Interconnection queue (GridStatus) — before projects for FK on queueEntryId

export const QueueEntryComputeStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  READY: "READY",
  FAILED: "FAILED",
} as const;

export const interconnectionQueueEntries = pgTable(
  "interconnection_queue_entries",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: text("external_id").notNull(),
    isoCode: text("iso_code").notNull(),
    projectName: text("project_name").notNull().default(""),
    queueStatus: text("queue_status"),
    resourceType: text("resource_type"),
    capacityMW: decimal("capacity_mw", { precision: 12, scale: 4 }),
    state: text("state").notNull().default(""),
    county: text("county"),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    rawJson: text("raw_json"),
    syncedAt: timestamp("synced_at").defaultNow(),
  },
  (t) => ({
    isoExtIdx: uniqueIndex("interconnection_queue_iso_external_uid").on(t.isoCode, t.externalId),
    stateIdx: index("interconnection_queue_state_idx").on(t.state),
  }),
);

export const insertInterconnectionQueueEntrySchema = createInsertSchema(interconnectionQueueEntries).omit({
  id: true,
  syncedAt: true,
});
export type InsertInterconnectionQueueEntry = z.infer<typeof insertInterconnectionQueueEntrySchema>;
export type InterconnectionQueueEntry = typeof interconnectionQueueEntries.$inferSelect;

export const jurisdictionPpaBenchmarks = pgTable(
  "jurisdiction_ppa_benchmarks",
  {
    id: serial("id").primaryKey(),
    state: text("state"),
    isoCode: text("iso_code"),
    regionLabel: text("region_label").notNull().default(""),
    regulatoryZone: text("regulatory_zone"),
    benchmarkUsdPerMwh: decimal("benchmark_usd_per_mwh", { precision: 10, scale: 4 }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }),
    sourceNote: text("source_note"),
  },
  (t) => ({
    stIsoIdx: index("jurisdiction_ppa_state_iso_idx").on(t.state, t.isoCode),
  }),
);

export const insertJurisdictionPpaBenchmarkSchema = createInsertSchema(jurisdictionPpaBenchmarks).omit({
  id: true,
});
export type InsertJurisdictionPpaBenchmark = z.infer<typeof insertJurisdictionPpaBenchmarkSchema>;
export type JurisdictionPpaBenchmark = typeof jurisdictionPpaBenchmarks.$inferSelect;

export const queueEntryAnalytics = pgTable(
  "queue_entry_analytics",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    entryId: varchar("entry_id")
      .notNull()
      .references(() => interconnectionQueueEntries.id, { onDelete: "cascade" })
      .unique(),
    backtestSummary: jsonb("backtest_summary").$type<Record<string, unknown> | null>(),
    annualMwhModeled: decimal("annual_mwh_modeled", { precision: 14, scale: 3 }),
    annualKwhNsrdb: decimal("annual_kwh_nsrdb", { precision: 16, scale: 0 }),
    irrProxyPct: decimal("irr_proxy_pct", { precision: 8, scale: 4 }),
    moicProxy: decimal("moic_proxy", { precision: 8, scale: 4 }),
    ppaScenario: jsonb("ppa_scenario").$type<Record<string, unknown> | null>(),
    waterfallSummary: jsonb("waterfall_summary").$type<Record<string, number> | null>(),
    monthlyWaterfallSeries: jsonb("monthly_waterfall_series").$type<unknown[] | null>(),
    engineVersion: text("engine_version").notNull().default("1"),
    computeStatus: text("compute_status").notNull().default("PENDING"),
    errorMessage: text("error_message"),
    computedAt: timestamp("computed_at"),
  },
  (t) => ({
    statusIdx: index("queue_entry_analytics_status_idx").on(t.computeStatus),
  }),
);

export const insertQueueEntryAnalyticsSchema = createInsertSchema(queueEntryAnalytics).omit({
  id: true,
});
export type InsertQueueEntryAnalytics = z.infer<typeof insertQueueEntryAnalyticsSchema>;
export type QueueEntryAnalytics = typeof queueEntryAnalytics.$inferSelect;

// ─── Projects ────────────────────────────────────────────────────────────────

// ─── SPVs ───────────────────────────────────────────────────────────────────
//
// The legal entity that holds one or more projects and issues membership
// interests. Defined here rather than with the rest of the Spec 17 tables at the
// bottom of this file so that `projects.spvId` below can carry a real foreign
// key without a forward reference.

export const SpvStatus = {
  FORMING: "FORMING",
  OFFERING: "OFFERING",
  OPERATING: "OPERATING",
  WINDING_DOWN: "WINDING_DOWN",
  DISSOLVED: "DISSOLVED",
} as const;

export const spvs = pgTable("spvs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("DE"),
  entityType: text("entity_type").notNull().default("LLC"),
  taxIdRef: text("tax_id_ref"),
  status: text("status").notNull().default("FORMING"),
  formedOn: timestamp("formed_on"),
  /** Fiscal year end as MM-DD; drives the tax year boundary in § 9. */
  fiscalYearEnd: text("fiscal_year_end").notNull().default("12-31"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSpvSchema = createInsertSchema(spvs).omit({
  id: true,
  createdAt: true,
});

export type InsertSpv = z.infer<typeof insertSpvSchema>;
export type Spv = typeof spvs.$inferSelect;

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developerId: varchar("developer_id").notNull(),
  /** Nullable: existing projects predate the SPV model (Spec 17 § 5). */
  spvId: varchar("spv_id").references(() => spvs.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  technology: text("technology").notNull().default("SOLAR"),
  stage: text("stage").notNull().default("PRE_NTP"),
  country: text("country").notNull().default("US"),
  state: text("state").notNull(),
  county: text("county").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 6 }),
  longitude: decimal("longitude", { precision: 10, scale: 6 }),
  capacityMW: decimal("capacity_mw", { precision: 10, scale: 2 }),
  capacityKw: decimal("capacity_kw", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("DRAFT"),
  summary: text("summary"),
  offtakerType: text("offtaker_type").notNull().default("C_AND_I"),
  interconnectionStatus: text("interconnection_status").notNull().default("UNKNOWN"),
  permittingStatus: text("permitting_status").notNull().default("UNKNOWN"),
  siteControlStatus: text("site_control_status").notNull().default("NONE"),
  feocAttested: boolean("feoc_attested").default(false),
  ppaRate: decimal("ppa_rate", { precision: 10, scale: 4 }).default("0"),
  monthlyDebtService: decimal("monthly_debt_service", { precision: 15, scale: 2 }).default("0"),
  monthlyOpex: decimal("monthly_opex", { precision: 15, scale: 2 }).default("0"),
  reserveRate: decimal("reserve_rate", { precision: 5, scale: 4 }).default("0"),
  sgtScoreNrel: decimal("sgt_score_nrel", { precision: 6, scale: 4 }),
  eiaActualMwh: decimal("eia_actual_mwh", { precision: 14, scale: 3 }),
  validationConfidence: decimal("validation_confidence", { precision: 6, scale: 2 }),
  eiaPlantCode: text("eia_plant_code"),
  eiaGeneratorId: text("eia_generator_id"),
  eiaReferencePlantName: text("eia_reference_plant_name"),
  /** When promoted from interconnection queue analytics */
  queueEntryId: varchar("queue_entry_id").references(() => interconnectionQueueEntries.id, { onDelete: "set null" }),
  /** Institutional: ((annual kWh × market PPA) − annual O&M) / asset CapEx, from NSRDB + market-rates */
  financialApyPct: decimal("financial_apy_pct", { precision: 8, scale: 4 }),
  /** How market PPA $/kWh was resolved (e.g. FIXED_PPA, CAISO_NP15_SPOT_PROXY) */
  marketPpaSource: text("market_ppa_source"),
  /** LevelTen / desk benchmark used for tooltip (USD/MWh) */
  marketPpaBenchmarkUsdPerMwh: decimal("market_ppa_benchmark_usd_per_mwh", { precision: 10, scale: 4 }),
  /** Structured external links surfaced in the marketplace listing (SEC filings, project page, news). */
  externalLinks: jsonb("external_links").$type<MarketplaceExternalLink[] | null>(),
  /** Photograph of the physical system, served from /projects/. Null falls back to a generated site card. */
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  /** Attribution line rendered under the photo — required for any third-party image. */
  imageCredit: text("image_credit"),
  /** License the photo is used under, e.g. "Public domain (U.S. Government work)". */
  imageLicense: text("image_license"),
  /** Mounting type, drives the capacity-factor lookup: SINGLE_AXIS_TRACKER | FIXED_TILT | ROOFTOP. */
  arrayType: text("array_type"),
  /** Commercial operation date for operating assets; null for pre-COD projects. */
  commercialOperationDate: timestamp("commercial_operation_date"),
  /** Remaining contracted offtake term in years, used for portfolio-level weighting. */
  contractTermRemainingYears: decimal("contract_term_remaining_years", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface MarketplaceExternalLink {
  label: string;
  url: string;
  source: string;
}

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

// ─── Portfolios ──────────────────────────────────────────────────────────────

/** One line of a constructed portfolio. Listings may be curated projects or queue entries. */
export interface PortfolioAllocation {
  listingId: string;
  listingSource: "PROJECT" | "QUEUE";
  /** Share of the investor's capital, 0-100. */
  weightPct: number;
}

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** Null for portfolios built by an anonymous visitor before they sign up. */
  ownerId: varchar("owner_id"),
  name: text("name").notNull().default("Untitled portfolio"),
  targetCheckSizeUsd: decimal("target_check_size_usd", { precision: 15, scale: 2 }).default("100000"),
  allocations: jsonb("allocations").$type<PortfolioAllocation[]>().notNull().default(sql`'[]'::jsonb`),
  /** Opaque token for read-only sharing without exposing the portfolio id. */
  shareToken: text("share_token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

/** Expression of interest in the prospective diversified fund. Not an offer, not a subscription. */
export const fundInterests = pgTable("fund_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  email: text("email").notNull(),
  checkSizeUsd: decimal("check_size_usd", { precision: 15, scale: 2 }),
  accreditationStatus: text("accreditation_status").notNull().default("UNKNOWN"),
  /** INCOME | BALANCED | GROWTH — informs which sleeve the investor would sit in. */
  riskPreference: text("risk_preference").notNull().default("BALANCED"),
  message: text("message"),
  /** Portfolio the investor had built when they opted in, if any. */
  sourcePortfolioId: varchar("source_portfolio_id"),
  status: text("status").notNull().default("SUBMITTED"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFundInterestSchema = createInsertSchema(fundInterests).omit({
  id: true,
  createdAt: true,
});

export type InsertFundInterest = z.infer<typeof insertFundInterestSchema>;
export type FundInterest = typeof fundInterests.$inferSelect;

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
  SGT_VERIFIED: "SGT_VERIFIED",
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

// ─── SGT: Meters ─────────────────────────────────────────────────────────────

export const MeterType = {
  NET: "NET",
  PRODUCTION: "PRODUCTION",
  CONSUMPTION: "CONSUMPTION",
} as const;

export const MeterProvider = {
  UTILITY_API: "UTILITY_API",
  MANUAL: "MANUAL",
} as const;

export const meters = pgTable("meters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  meterType: text("meter_type").notNull().default("NET"),
  provider: text("provider").notNull().default("MANUAL"),
  providerUid: text("provider_uid"),
  name: text("name"),
  timezone: text("timezone").notNull().default("UTC"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeterSchema = createInsertSchema(meters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeter = z.infer<typeof insertMeterSchema>;
export type Meter = typeof meters.$inferSelect;

// ─── SGT: Intervals ──────────────────────────────────────────────────────────

export const IntervalSource = {
  UTILITY_API: "UTILITY_API",
  SOLCAST: "SOLCAST",
  CALCULATED: "CALCULATED",
} as const;

export const sgtIntervals = pgTable("sgt_intervals", {
  id: serial("id").primaryKey(),
  meterId: varchar("meter_id").notNull().references(() => meters.id),
  intervalStart: timestamp("interval_start").notNull(),
  intervalEnd: timestamp("interval_end").notNull(),
  netWh: decimal("net_wh", { precision: 14, scale: 2 }),
  expectedGrossWh: decimal("expected_gross_wh", { precision: 14, scale: 2 }),
  syntheticGrossWh: decimal("synthetic_gross_wh", { precision: 14, scale: 2 }),
  irradianceWm2: decimal("irradiance_wm2", { precision: 10, scale: 4 }),
  source: text("source").notNull().default("CALCULATED"),
  qualityFlag: text("quality_flag"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSgtIntervalSchema = createInsertSchema(sgtIntervals).omit({
  id: true,
  settledAt: true,
  createdAt: true,
});

export type InsertSgtInterval = z.infer<typeof insertSgtIntervalSchema>;
export type SgtInterval = typeof sgtIntervals.$inferSelect;

// ─── SGT: Accounts (Double-Entry Ledger) ────────────────────────────────────

export const AccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
  REVENUE_CLEARING: "REVENUE_CLEARING",
  INVESTOR_YIELD: "INVESTOR_YIELD",
  PLATFORM_FEE: "PLATFORM_FEE",
  DEBT_SERVICE: "DEBT_SERVICE",
  OPEX_FUND: "OPEX_FUND",
  RESERVES: "RESERVES",
} as const;

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  accountType: text("account_type").notNull(),
  denominatedIn: text("denominated_in").notNull().default("Wh"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ─── SGT: Transactions ──────────────────────────────────────────────────────

export const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  intervalId: integer("interval_id").references(() => sgtIntervals.id),
  memo: text("memo"),
  status: text("status").notNull().default("PENDING"),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ─── SGT: Postings (Double-Entry Ledger Lines) ──────────────────────────────

export const postings = pgTable("postings", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
  accountId: varchar("account_id").notNull().references(() => accounts.id),
  amount: decimal("amount", { precision: 16, scale: 4 }).notNull(),
  direction: text("direction").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostingSchema = createInsertSchema(postings).omit({
  id: true,
  createdAt: true,
});

export type InsertPosting = z.infer<typeof insertPostingSchema>;
export type Posting = typeof postings.$inferSelect;

// ─── Verification Engine ────────────────────────────────────────────────────

export const SatelliteSource = {
  SOLCAST_LIVE: "SOLCAST_LIVE",
  SOLCAST_HISTORICAL: "SOLCAST_HISTORICAL",
  SOLCAST_ESTIMATED_ACTUALS: "SOLCAST_ESTIMATED_ACTUALS",
  SYNTHETIC_FALLBACK: "SYNTHETIC_FALLBACK",
} as const;

export const VerificationGranularity = {
  INTERVAL_15M: "INTERVAL_15M",
  DAILY: "DAILY",
} as const;

export const VerificationStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  FLAGGED: "FLAGGED",
  REJECTED: "REJECTED",
  SETTLED: "SETTLED",
} as const;

export const PpaSource = {
  FIXED_PPA: "FIXED_PPA",
  CAISO_NP15_SPOT_PROXY: "CAISO_NP15_SPOT_PROXY",
  CAISO_SP15_SPOT_PROXY: "CAISO_SP15_SPOT_PROXY",
  JURISDICTION_BENCHMARK: "JURISDICTION_BENCHMARK",
  LEVELTEN_P25_PROXY: "LEVELTEN_P25_PROXY",
  NATIONAL_AVG: "NATIONAL_AVG",
} as const;

export const OfftakerClass = {
  UTILITY: "UTILITY",
  C_AND_I: "C_AND_I",
  COMMUNITY_SOLAR: "COMMUNITY_SOLAR",
  WHOLESALE_EXPORT: "WHOLESALE_EXPORT",
  BEHIND_THE_METER: "BEHIND_THE_METER",
} as const;

export const PlantUse = {
  BEHIND_THE_METER_OFFSET: "BEHIND_THE_METER_OFFSET",
  WHOLESALE_EXPORT: "WHOLESALE_EXPORT",
  HYBRID: "HYBRID",
} as const;

export const AnomalyRuleCode = {
  VARIANCE_BAND: "VARIANCE_BAND",
  CLEAR_SKY_CAP: "CLEAR_SKY_CAP",
  CAPACITY_FACTOR: "CAPACITY_FACTOR",
  METER_DRIFT: "METER_DRIFT",
  DATA_GAP: "DATA_GAP",
  DUPLICATE: "DUPLICATE",
  ML_SCORER: "ML_SCORER",
} as const;

export const AnomalySeverity = {
  INFO: "INFO",
  WARN: "WARN",
  BLOCK: "BLOCK",
} as const;

export const VerificationApprovalAction = {
  CLEAR_ANOMALY: "CLEAR_ANOMALY",
  REJECT_VERIFICATION: "REJECT_VERIFICATION",
  MANUAL_VERIFICATION_RUN: "MANUAL_VERIFICATION_RUN",
} as const;

export const irradianceSnapshots = pgTable(
  "irradiance_snapshots",
  {
    id: serial("id").primaryKey(),
    projectId: varchar("project_id").notNull(),
    meterId: varchar("meter_id"),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    capacityKw: decimal("capacity_kw", { precision: 10, scale: 2 }).notNull(),
    pvEstimateKw: decimal("pv_estimate_kw", { precision: 14, scale: 4 }).notNull(),
    irradianceWm2: decimal("irradiance_wm2", { precision: 10, scale: 4 }),
    intervalStart: timestamp("interval_start").notNull(),
    intervalEnd: timestamp("interval_end").notNull(),
    satelliteSource: text("satellite_source").notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    rawResponseHash: text("raw_response_hash").notNull(),
    rawResponseJson: jsonb("raw_response_json").$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    pidStartSourceIdx: uniqueIndex("irradiance_snapshots_pid_start_source_uid").on(
      t.projectId,
      t.intervalStart,
      t.satelliteSource,
    ),
    pidStartIdx: index("irradiance_snapshots_pid_start_idx").on(t.projectId, t.intervalStart),
  }),
);

export const insertIrradianceSnapshotSchema = createInsertSchema(irradianceSnapshots).omit({
  id: true,
  fetchedAt: true,
});
export type InsertIrradianceSnapshot = z.infer<typeof insertIrradianceSnapshotSchema>;
export type IrradianceSnapshot = typeof irradianceSnapshots.$inferSelect;

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id").notNull().references(() => projects.id),
    intervalId: integer("interval_id").references(() => sgtIntervals.id),
    granularity: text("granularity").notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    expectedKwh: decimal("expected_kwh", { precision: 14, scale: 4 }).notNull(),
    actualKwh: decimal("actual_kwh", { precision: 14, scale: 4 }).notNull(),
    variancePct: decimal("variance_pct", { precision: 8, scale: 4 }).notNull(),
    tolerancePct: decimal("tolerance_pct", { precision: 6, scale: 4 }).notNull(),
    ppaRateUsdPerKwh: decimal("ppa_rate_usd_per_kwh", { precision: 10, scale: 6 }).notNull(),
    ppaSource: text("ppa_source").notNull(),
    offtakerClass: text("offtaker_class").notNull(),
    plantUse: text("plant_use").notNull(),
    grossRevenueUsd: decimal("gross_revenue_usd", { precision: 15, scale: 4 }).notNull(),
    status: text("status").notNull().default("PENDING"),
    evidenceHash: text("evidence_hash").notNull(),
    settledTransactionId: varchar("settled_transaction_id").references(() => transactions.id),
    runAt: timestamp("run_at").notNull().defaultNow(),
    clearedAt: timestamp("cleared_at"),
    settledAt: timestamp("settled_at"),
    notes: text("notes"),
  },
  (t) => ({
    pidGranStartIdx: uniqueIndex("verification_runs_pid_gran_start_uid").on(
      t.projectId,
      t.granularity,
      t.periodStart,
    ),
    pidStatusStartIdx: index("verification_runs_pid_status_start_idx").on(
      t.projectId,
      t.status,
      t.periodStart,
    ),
    intervalIdx: index("verification_runs_interval_idx").on(t.intervalId),
  }),
);

export const insertVerificationRunSchema = createInsertSchema(verificationRuns).omit({
  id: true,
  runAt: true,
  clearedAt: true,
  settledAt: true,
});
export type InsertVerificationRun = z.infer<typeof insertVerificationRunSchema>;
export type VerificationRun = typeof verificationRuns.$inferSelect;

export const anomalyFlags = pgTable(
  "anomaly_flags",
  {
    id: serial("id").primaryKey(),
    verificationRunId: varchar("verification_run_id").notNull().references(() => verificationRuns.id),
    ruleCode: text("rule_code").notNull(),
    severity: text("severity").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
    raisedAt: timestamp("raised_at").notNull().defaultNow(),
    clearedAt: timestamp("cleared_at"),
    clearedBy: varchar("cleared_by"),
    clearedReason: text("cleared_reason"),
  },
  (t) => ({
    runIdx: index("anomaly_flags_run_idx").on(t.verificationRunId),
    ruleSeverityIdx: index("anomaly_flags_rule_severity_idx").on(t.ruleCode, t.severity, t.raisedAt),
  }),
);

export const insertAnomalyFlagSchema = createInsertSchema(anomalyFlags).omit({
  id: true,
  raisedAt: true,
  clearedAt: true,
});
export type InsertAnomalyFlag = z.infer<typeof insertAnomalyFlagSchema>;
export type AnomalyFlag = typeof anomalyFlags.$inferSelect;

// ─── Engine A: expected-generation reports + site uncertainty cache ──────────
// Distinct from `verification_runs` (the three-source VERIFIED/FLAGGED/PENDING
// verdict table above). This holds Engine A's physics report — `report.to_dict()`
// from verification_engine 2.0.0 — keyed by (project_id, period, config_hash).

export const expectedGenerationReports = pgTable(
  "expected_generation_reports",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: varchar("project_id").notNull().references(() => projects.id),
    period: text("period").notNull(), // e.g. "2023" (annual) or "2023-01" (monthly)
    configHash: text("config_hash").notNull(),
    p50Kwh: decimal("p50_kwh", { precision: 14, scale: 4 }).notNull(),
    p90Kwh: decimal("p90_kwh", { precision: 14, scale: 4 }).notNull(),
    combinedUncertaintyPct: decimal("combined_uncertainty_pct", { precision: 8, scale: 4 }).notNull(),
    weatherSource: text("weather_source").notNull(),
    engineVersion: text("engine_version").notNull(),
    report: jsonb("report").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pidPeriodHashUid: uniqueIndex("expected_generation_reports_pid_period_hash_uid").on(
      t.projectId,
      t.period,
      t.configHash,
    ),
    pidPeriodIdx: index("expected_generation_reports_pid_period_idx").on(t.projectId, t.period),
  }),
);

export const insertExpectedGenerationReportSchema = createInsertSchema(expectedGenerationReports).omit({
  id: true,
  createdAt: true,
});
export type InsertExpectedGenerationReport = z.infer<typeof insertExpectedGenerationReportSchema>;
export type ExpectedGenerationReport = typeof expectedGenerationReports.$inferSelect;

export const siteUncertainty = pgTable(
  "site_uncertainty",
  {
    id: serial("id").primaryKey(),
    // Cache key: lat/lon rounded to a stable grid (e.g. "35.050,-106.540").
    siteKey: text("site_key").notNull(),
    latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
    // Per-site interannual variability (1-sigma fraction) computed from NSRDB years.
    interannualVariability: decimal("interannual_variability", { precision: 8, scale: 5 }).notNull(),
    nYears: integer("n_years").notNull(),
    yearsCovered: text("years_covered").notNull(), // e.g. "1998-2023"
    source: text("source").notNull().default("nsrdb"),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => ({
    siteKeyUid: uniqueIndex("site_uncertainty_site_key_uid").on(t.siteKey),
  }),
);

export const insertSiteUncertaintySchema = createInsertSchema(siteUncertainty).omit({
  id: true,
  computedAt: true,
});
export type InsertSiteUncertainty = z.infer<typeof insertSiteUncertaintySchema>;
export type SiteUncertainty = typeof siteUncertainty.$inferSelect;

// ─── Marketplace ─────────────────────────────────────────────────────────────

export const MarketplaceListingSource = {
  PROJECT: "PROJECT",
  QUEUE: "QUEUE",
} as const;

export const FinancialConfidence = {
  KNOWN: "KNOWN",
  ESTIMATED: "ESTIMATED",
  MARKET_PROXY: "MARKET_PROXY",
} as const;

export const MarketplaceRefreshStatus = {
  OK: "OK",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
} as const;

export const marketplaceMeta = pgTable("marketplace_meta", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  refreshedAt: timestamp("refreshed_at"),
  listingCount: integer("listing_count").notNull().default(0),
  lastRunStatus: text("last_run_status"),
  lastRunError: text("last_run_error"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const insertMarketplaceMetaSchema = createInsertSchema(marketplaceMeta).omit({
  id: true,
  computedAt: true,
});
export type InsertMarketplaceMeta = z.infer<typeof insertMarketplaceMetaSchema>;
export type MarketplaceMeta = typeof marketplaceMeta.$inferSelect;

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

// ════════════════════════════════════════════════════════════════════════════
// Spec 17 — Distribution Waterfall, Capital Accounts & Tax Allocation
//
// Money columns are `decimal(18,2)`; Drizzle returns them as strings and the
// engine parses them to integer cents (§ 2.8). Nothing here should ever be
// handed to `parseFloat`. Unit columns are `decimal(20,6)` per § 4.2.
//
// Several invariants in this block cannot be expressed in Drizzle's DSL and are
// enforced by trigger in `migrations/0009_distribution_waterfall.sql`:
//   · `capital_account_entries` rejects UPDATE and DELETE      (§ 4.6, AC 16)
//   · a run against terms with no `counselConfirmedAt` fails   (§ 4.1, AC 11)
//   · a run cannot reach `submitted` without a named approver  (§ 11.1, AC 13)
// ════════════════════════════════════════════════════════════════════════════

// ─── § 4.1 Waterfall terms ──────────────────────────────────────────────────

/**
 * The operating agreement, encoded. Immutable once an offering goes live;
 * amendments create a new version with a later `effectiveFrom`.
 *
 * The JSONB payload shapes and their validators live in `shared/spec17-terms.ts`.
 */
export const waterfallTerms = pgTable(
  "waterfall_terms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    version: integer("version").notNull(),
    effectiveFrom: timestamp("effective_from").notNull(),

    // Pre-waterfall configuration
    feeSchedule: jsonb("fee_schedule").$type<Spec17FeeSchedule>().notNull(),
    reservePolicy: jsonb("reserve_policy").$type<Spec17ReservePolicy>().notNull(),
    debtSchedule: jsonb("debt_schedule").$type<Spec17DebtSchedule | null>(),

    // The waterfall itself (§ 7.1)
    tiers: jsonb("tiers").$type<Spec17WaterfallTier[]>().notNull(),

    // Classes
    classes: jsonb("classes").$type<Spec17MemberClass[]>().notNull(),

    // Allocation method
    taxAllocationMethod: text("tax_allocation_method").notNull(),
    itcTreatment: text("itc_treatment").notNull(),

    // Distribution mechanics
    distributionFrequency: text("distribution_frequency").notNull().default("monthly"),
    minDistributionPerMemberCents: integer("min_distribution_per_member_cents").notNull().default(100),
    roundingResidualTreatment: text("rounding_residual_treatment").notNull().default("carry_forward"),

    sourceDocumentPath: text("source_document_path").notNull(),

    /**
     * The gate. No distribution run may execute against terms where this is
     * null — enforced by trigger, not by application code, because
     * distributing on unconfirmed terms is the worst failure this system can
     * produce.
     */
    counselConfirmedAt: timestamp("counsel_confirmed_at"),
    counselConfirmedBy: text("counsel_confirmed_by"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    versionUid: uniqueIndex("waterfall_terms_spv_version_uid").on(t.spvId, t.version),
    spvIdx: index("waterfall_terms_spv_idx").on(t.spvId),
  }),
);

export const insertWaterfallTermsSchema = createInsertSchema(waterfallTerms).omit({
  id: true,
  createdAt: true,
});

export type InsertWaterfallTerms = z.infer<typeof insertWaterfallTermsSchema>;
export type WaterfallTermsRow = typeof waterfallTerms.$inferSelect;

// ─── § 4.2 Members and positions ────────────────────────────────────────────

export const MemberTaxClassification = {
  INDIVIDUAL: "individual",
  ENTITY: "entity",
  IRA: "ira",
  TRUST: "trust",
} as const;

/**
 * EcoXchange's record of ownership, reconciled against the transfer agent's cap
 * table. The transfer agent is authoritative for token holdings; this ledger is
 * authoritative for capital accounts. Drift between them halts distributions
 * (§ 11.3).
 */
export const members = pgTable(
  "members",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    /** The transfer agent's investor identifier. */
    transferAgentInvestorRef: text("transfer_agent_investor_ref").notNull(),
    legalName: text("legal_name").notNull(),
    memberClass: text("member_class").notNull(),
    /** Vault reference only — never the tax ID itself. */
    taxIdRef: text("tax_id_ref"),
    /** Drives K-1 handling in § 9. */
    taxClassification: text("tax_classification"),
    /** Optional link to the platform login, when the member has one. */
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    admittedOn: timestamp("admitted_on").notNull(),
    withdrawnOn: timestamp("withdrawn_on"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    investorUid: uniqueIndex("members_spv_investor_ref_uid").on(t.spvId, t.transferAgentInvestorRef),
    spvIdx: index("members_spv_idx").on(t.spvId),
  }),
);

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export const MemberPositionSource = {
  SUBSCRIPTION: "subscription",
  TRANSFER_IN: "transfer_in",
  TRANSFER_OUT: "transfer_out",
  REDEMPTION: "redemption",
} as const;

/** Time-sliced so a mid-period transfer allocates correctly (§ 7.5). */
export const memberPositions = pgTable(
  "member_positions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    memberId: varchar("member_id").notNull().references(() => members.id),
    effectiveFrom: timestamp("effective_from").notNull(),
    /** Null = current. */
    effectiveTo: timestamp("effective_to"),
    units: decimal("units", { precision: 20, scale: 6 }).notNull(),
    source: text("source").notNull(),
    transferAgentTxRef: text("transfer_agent_tx_ref"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    memberIdx: index("member_positions_member_idx").on(t.memberId),
    windowIdx: index("member_positions_window_idx").on(t.memberId, t.effectiveFrom),
  }),
);

export const insertMemberPositionSchema = createInsertSchema(memberPositions).omit({
  id: true,
  createdAt: true,
});

export type InsertMemberPosition = z.infer<typeof insertMemberPositionSchema>;
export type MemberPosition = typeof memberPositions.$inferSelect;

// ─── § 4.3 Period financials ────────────────────────────────────────────────

/** One line of the period's operating expenses. */
export interface PeriodExpense {
  code: string;
  description: string;
  /** Money string, e.g. `"12500.00"`. */
  amount: string;
  vendor: string | null;
  /** Only `paid` expenses reduce cash; `accrued` is carried for the tax books. */
  recognition: "accrued" | "paid";
}

export const PeriodCloseStatus = {
  OPEN: "open",
  CLOSED: "closed",
  RESTATED: "restated",
} as const;

export const periodFinancials = pgTable(
  "period_financials",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Cash revenue — received, not invoiced (§ 2.7)
    energyRevenue: decimal("energy_revenue", { precision: 18, scale: 2 }).notNull().default("0"),
    recRevenue: decimal("rec_revenue", { precision: 18, scale: 2 }).notNull().default("0"),
    itcTransferProceeds: decimal("itc_transfer_proceeds", { precision: 18, scale: 2 }).notNull().default("0"),
    otherRevenue: decimal("other_revenue", { precision: 18, scale: 2 }).notNull().default("0"),

    // Operating expenses
    expenses: jsonb("expenses").$type<PeriodExpense[]>().notNull().default(sql`'[]'::jsonb`),
    totalOpex: decimal("total_opex", { precision: 18, scale: 2 }).notNull().default("0"),

    // Links to source
    revenueReconciliationIds: text("revenue_reconciliation_ids").array(),
    verificationRecordIds: text("verification_record_ids").array(),

    closeStatus: text("close_status").notNull().default("open"),
    closedAt: timestamp("closed_at"),
    closedBy: text("closed_by"),

    /**
     * GATE 3 of § 5 — cash received must be reconciled to the bank before the
     * period may close. The spec states the gate but not the field; a named
     * attestation is the only way to make it checkable.
     */
    bankReconciledAt: timestamp("bank_reconciled_at"),
    bankReconciledBy: text("bank_reconciled_by"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    periodUid: uniqueIndex("period_financials_spv_start_uid").on(t.spvId, t.periodStart),
  }),
);

export const insertPeriodFinancialsSchema = createInsertSchema(periodFinancials).omit({
  id: true,
  createdAt: true,
});

export type InsertPeriodFinancials = z.infer<typeof insertPeriodFinancialsSchema>;
export type PeriodFinancials = typeof periodFinancials.$inferSelect;

// ─── § 4.4 Reserves ─────────────────────────────────────────────────────────

export const reserveAccounts = pgTable(
  "reserve_accounts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    /** e.g. `om`, `equipment_replacement`, `dsra`, `decommissioning`. */
    code: text("code").notNull(),
    name: text("name").notNull(),
    targetBasis: text("target_basis").notNull(),
    targetValue: decimal("target_value", { precision: 18, scale: 2 }).notNull(),
    fundingPriority: integer("funding_priority").notNull(),
    fundingCapPerPeriod: decimal("funding_cap_per_period", { precision: 18, scale: 2 }),
    drawPermittedFor: text("draw_permitted_for").array().notNull(),
    currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).notNull().default("0"),
    bankAccountRef: text("bank_account_ref"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    codeUid: uniqueIndex("reserve_accounts_spv_code_uid").on(t.spvId, t.code),
  }),
);

export const insertReserveAccountSchema = createInsertSchema(reserveAccounts).omit({
  id: true,
  createdAt: true,
});

export type InsertReserveAccount = z.infer<typeof insertReserveAccountSchema>;
export type ReserveAccount = typeof reserveAccounts.$inferSelect;

export const ReserveMovementDirection = {
  FUND: "fund",
  DRAW: "draw",
} as const;

export const reserveMovements = pgTable(
  "reserve_movements",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    reserveAccountId: varchar("reserve_account_id").notNull().references(() => reserveAccounts.id),
    distributionRunId: varchar("distribution_run_id"),
    direction: text("direction").notNull(),
    amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
    /** A draw must cite a purpose listed in `drawPermittedFor` (§ 6). */
    reason: text("reason").notNull(),
    balanceAfter: decimal("balance_after", { precision: 18, scale: 2 }).notNull(),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("reserve_movements_account_idx").on(t.reserveAccountId),
    runIdx: index("reserve_movements_run_idx").on(t.distributionRunId),
  }),
);

export const insertReserveMovementSchema = createInsertSchema(reserveMovements).omit({
  id: true,
});

export type InsertReserveMovement = z.infer<typeof insertReserveMovementSchema>;
export type ReserveMovement = typeof reserveMovements.$inferSelect;

// ─── § 4.5 Distribution runs and allocations ────────────────────────────────

/**
 * Per-tier trace. A partially-satisfied preferred return must be visible,
 * because it is a claim on future cash and an investor is entitled to see it
 * (§ 7.2).
 */
export interface TierResultRecord {
  seq: number;
  type: string;
  class: string | null;
  /** Money strings. */
  demand: string;
  allocated: string;
  unmet: string;
  /** True when `unmet` carries forward rather than expiring. */
  accrues: boolean;
  perMember: Record<string, string>;
  /**
   * What each member was owed by this tier. Recorded alongside what they were
   * paid so that § 7.3's running balances — unreturned capital, accrued unpaid
   * preferred — can be *derived* from the run history rather than stored as
   * separate mutable state that could drift from it.
   */
  perMemberDemand: Record<string, string>;
}

/** Why a run produced less than the period's cash, or nothing at all (§ 6). */
export interface PreWaterfallNote {
  code: "funding_shortfall" | "reserve_underfunded" | "reserve_draw" | "debt_service_halt" | "fee_capped";
  detail: string;
  amount: string | null;
}

export const DistributionRunStatus = {
  COMPUTED: "computed",
  APPROVED: "approved",
  SUBMITTED: "submitted",
  SETTLED: "settled",
  FAILED: "failed",
  REVERSED: "reversed",
} as const;

export const distributionRuns = pgTable(
  "distribution_runs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    waterfallTermsId: varchar("waterfall_terms_id").notNull().references(() => waterfallTerms.id),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Pre-waterfall trace (§ 6) — every intermediate persisted for audit, so an
    // investor asking "why was this month lower" gets a trace, not a number.
    cashRevenue: decimal("cash_revenue", { precision: 18, scale: 2 }).notNull(),
    lessOpex: decimal("less_opex", { precision: 18, scale: 2 }).notNull(),
    lessDebtService: decimal("less_debt_service", { precision: 18, scale: 2 }).notNull().default("0"),
    lessReserveFunding: decimal("less_reserve_funding", { precision: 18, scale: 2 }).notNull().default("0"),
    plusReserveDraws: decimal("plus_reserve_draws", { precision: 18, scale: 2 }).notNull().default("0"),
    lessFees: decimal("less_fees", { precision: 18, scale: 2 }).notNull().default("0"),
    distributableCash: decimal("distributable_cash", { precision: 18, scale: 2 }).notNull(),
    notes: jsonb("notes").$type<PreWaterfallNote[]>().notNull().default(sql`'[]'::jsonb`),

    // Waterfall trace
    tierResults: jsonb("tier_results").$type<TierResultRecord[]>().notNull(),
    totalDistributed: decimal("total_distributed", { precision: 18, scale: 2 }).notNull(),
    roundingResidual: decimal("rounding_residual", { precision: 18, scale: 2 }).notNull().default("0"),
    carriedForward: decimal("carried_forward", { precision: 18, scale: 2 }).notNull().default("0"),
    undistributed: decimal("undistributed", { precision: 18, scale: 2 }).notNull().default("0"),

    status: text("status").notNull().default("computed"),
    /** Named human. Mandatory before submission — there is no automatic path. */
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    transferAgentBatchRef: text("transfer_agent_batch_ref"),
    submittedAt: timestamp("submitted_at"),
    settledAt: timestamp("settled_at"),
    settledTotal: decimal("settled_total", { precision: 18, scale: 2 }),
    failureReason: text("failure_reason"),

    engineVersion: text("engine_version").notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    /** Set on the *original* run, pointing at the reversing run (§ 12). */
    reversedBy: varchar("reversed_by").references((): AnyPgColumn => distributionRuns.id),
    /** Set on the *reversing* run, pointing back at what it reverses. */
    reverses: varchar("reverses").references((): AnyPgColumn => distributionRuns.id),
  },
  (t) => ({
    runUid: uniqueIndex("distribution_runs_spv_period_engine_uid").on(t.spvId, t.periodStart, t.engineVersion),
    spvIdx: index("distribution_runs_spv_idx").on(t.spvId),
    statusIdx: index("distribution_runs_status_idx").on(t.status),
  }),
);

export const insertDistributionRunSchema = createInsertSchema(distributionRuns).omit({
  id: true,
  computedAt: true,
});

export type InsertDistributionRun = z.infer<typeof insertDistributionRunSchema>;
export type DistributionRun = typeof distributionRuns.$inferSelect;

export const distributionAllocations = pgTable(
  "distribution_allocations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    distributionRunId: varchar("distribution_run_id").notNull().references(() => distributionRuns.id),
    memberId: varchar("member_id").notNull().references(() => members.id),
    memberClass: text("member_class").notNull(),
    /** Day-weighted within the period (§ 7.5). */
    weightedUnits: decimal("weighted_units", { precision: 20, scale: 6 }).notNull(),
    /** `{ tierSeq: amount }`. */
    tierBreakdown: jsonb("tier_breakdown").$type<Record<string, string>>().notNull(),
    grossAmount: decimal("gross_amount", { precision: 18, scale: 2 }).notNull(),
    withholding: decimal("withholding", { precision: 18, scale: 2 }).notNull().default("0"),
    netAmount: decimal("net_amount", { precision: 18, scale: 2 }).notNull(),
    /** Sub-minimum amounts brought in from prior periods, and pushed to the next. */
    carriedForwardIn: decimal("carried_forward_in", { precision: 18, scale: 2 }).notNull().default("0"),
    carriedForwardOut: decimal("carried_forward_out", { precision: 18, scale: 2 }).notNull().default("0"),
  },
  (t) => ({
    allocUid: uniqueIndex("distribution_allocations_run_member_uid").on(t.distributionRunId, t.memberId),
    memberIdx: index("distribution_allocations_member_idx").on(t.memberId),
  }),
);

export const insertDistributionAllocationSchema = createInsertSchema(distributionAllocations).omit({
  id: true,
});

export type InsertDistributionAllocation = z.infer<typeof insertDistributionAllocationSchema>;
export type DistributionAllocation = typeof distributionAllocations.$inferSelect;

// ─── § 4.6 Capital account entries ──────────────────────────────────────────

export const CapEntryType = {
  CONTRIBUTION: "contribution",
  DISTRIBUTION: "distribution",
  INCOME_ALLOCATION: "income_allocation",
  LOSS_ALLOCATION: "loss_allocation",
  SYNDICATION_COST: "syndication_cost",
  REVERSAL: "reversal",
} as const;

/**
 * Append-only. The ledger that cannot be reconstructed later, which is why it
 * exists before the first contribution rather than after the first K-1.
 *
 * Book and tax diverge from day one — depreciation methods differ and ITC basis
 * reduction applies to tax basis only — so both columns are always populated and
 * neither is derived from the other (§ 8).
 *
 * UPDATE and DELETE are rejected by trigger. Corrections are `reversal` entries.
 */
export const capitalAccountEntries = pgTable(
  "capital_account_entries",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    memberId: varchar("member_id").notNull().references(() => members.id),
    entryType: text("entry_type").notNull(),
    periodStart: timestamp("period_start").notNull(),
    /** 704(b) book. */
    bookAmount: decimal("book_amount", { precision: 18, scale: 2 }).notNull(),
    /** Tax basis — diverges from book. */
    taxAmount: decimal("tax_amount", { precision: 18, scale: 2 }).notNull(),
    bookBalanceAfter: decimal("book_balance_after", { precision: 18, scale: 2 }).notNull(),
    taxBalanceAfter: decimal("tax_balance_after", { precision: 18, scale: 2 }).notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: varchar("source_id"),
    reversesEntryId: varchar("reverses_entry_id").references((): AnyPgColumn => capitalAccountEntries.id),
    reason: text("reason"),
    engineVersion: text("engine_version").notNull(),
    /** Monotonic per member; makes the ledger order deterministic on replay. */
    seq: serial("seq").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    memberPeriodIdx: index("idx_cap_member_period").on(t.memberId, t.periodStart),
    memberSeqIdx: index("idx_cap_member_seq").on(t.memberId, t.seq),
  }),
);

export const insertCapitalAccountEntrySchema = createInsertSchema(capitalAccountEntries).omit({
  id: true,
  seq: true,
  createdAt: true,
});

export type InsertCapitalAccountEntry = z.infer<typeof insertCapitalAccountEntrySchema>;
export type CapitalAccountEntry = typeof capitalAccountEntries.$inferSelect;

// ─── § 4.7 Tax allocations and ITC positions ────────────────────────────────

export const TaxAllocationStatus = {
  DRAFT: "draft",
  CPA_REVIEW: "cpa_review",
  FINAL: "final",
  AMENDED: "amended",
} as const;

/**
 * [CPA] gated. `status` must reach `final` with `cpaReviewedAt` populated before
 * any K-1 issues — no exceptions, and no automation of that gate (§ 9).
 */
export const taxAllocations = pgTable(
  "tax_allocations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    memberId: varchar("member_id").notNull().references(() => members.id),
    taxYear: integer("tax_year").notNull(),
    ordinaryIncome: decimal("ordinary_income", { precision: 18, scale: 2 }).notNull().default("0"),
    depreciation: decimal("depreciation", { precision: 18, scale: 2 }).notNull().default("0"),
    interestExpense: decimal("interest_expense", { precision: 18, scale: 2 }).notNull().default("0"),
    otherItems: jsonb("other_items").$type<Record<string, string> | null>(),
    allocationMethod: text("allocation_method").notNull(),
    /**
     * Conditions detected during allocation that require a human tax decision —
     * §704(c) layers, qualified income offset, minimum gain chargeback. The
     * engine detects and escalates; it does not compute the mechanics (§ 9).
     */
    escalations: jsonb("escalations").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    cpaReviewedAt: timestamp("cpa_reviewed_at"),
    cpaReviewedBy: text("cpa_reviewed_by"),
    status: text("status").notNull().default("draft"),
    engineVersion: text("engine_version").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    allocUid: uniqueIndex("tax_allocations_spv_member_year_uid").on(t.spvId, t.memberId, t.taxYear),
  }),
);

export const insertTaxAllocationSchema = createInsertSchema(taxAllocations).omit({
  id: true,
  createdAt: true,
});

export type InsertTaxAllocation = z.infer<typeof insertTaxAllocationSchema>;
export type TaxAllocation = typeof taxAllocations.$inferSelect;

/** A disposition or disqualification inside the five-year window (§ 10.2). */
export interface RecaptureEvent {
  occurredOn: string;
  kind: "disposition" | "ceased_to_qualify" | "ownership_change";
  detail: string;
  /** Unvested fraction at the time, as a percent string. Not a tax computation. */
  unvestedPctAtEvent: string;
  escalatedAt: string | null;
}

export const itcPositions = pgTable(
  "itc_positions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    spvId: varchar("spv_id").notNull().references(() => spvs.id),
    /** Null when transferred under §6418. */
    memberId: varchar("member_id").references(() => members.id),
    placedInServiceDate: timestamp("placed_in_service_date").notNull(),
    eligibleBasis: decimal("eligible_basis", { precision: 18, scale: 2 }).notNull(),
    creditRatePct: decimal("credit_rate_pct", { precision: 6, scale: 3 }).notNull(),
    adders: jsonb("adders").$type<Record<string, string> | null>(),
    creditAmount: decimal("credit_amount", { precision: 18, scale: 2 }).notNull(),
    treatment: text("treatment").notNull(),
    transferProceeds: decimal("transfer_proceeds", { precision: 18, scale: 2 }),
    transfereeRef: text("transferee_ref"),

    // Recapture: 5-year vesting, 20%/yr (§ 10.2)
    vestingStart: timestamp("vesting_start").notNull(),
    vestedPct: decimal("vested_pct", { precision: 6, scale: 3 }).notNull().default("0"),
    recaptureEvents: jsonb("recapture_events").$type<RecaptureEvent[]>().notNull().default(sql`'[]'::jsonb`),
    /**
     * The five-year window outlives the attention span of any operational
     * process, so the end date is stored and surfaced rather than recomputed on
     * demand by whoever happens to remember.
     */
    recapturePeriodEnds: timestamp("recapture_period_ends").notNull(),
    cpaReviewedAt: timestamp("cpa_reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    spvIdx: index("itc_positions_spv_idx").on(t.spvId),
    windowIdx: index("itc_positions_window_idx").on(t.recapturePeriodEnds),
  }),
);

export const insertItcPositionSchema = createInsertSchema(itcPositions).omit({
  id: true,
  createdAt: true,
});

export type InsertItcPosition = z.infer<typeof insertItcPositionSchema>;
export type ItcPosition = typeof itcPositions.$inferSelect;
