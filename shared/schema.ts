import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp, integer, serial, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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
