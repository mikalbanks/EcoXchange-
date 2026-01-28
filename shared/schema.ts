import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums as string literals for TypeScript
export const UserRole = {
  INVESTOR: "INVESTOR",
  ISSUER: "ISSUER",
  ADMIN: "ADMIN",
} as const;

export const KycStatus = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const ProjectStatus = {
  INTAKE: "INTAKE",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
} as const;

export const AssetType = {
  SOLAR: "SOLAR",
  WIND: "WIND",
  HYDROGEN: "HYDROGEN",
  OTHER: "OTHER",
} as const;

export const OfferingStatus = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const CommitmentStatus = {
  SUBMITTED: "SUBMITTED",
  CONFIRMED: "CONFIRMED",
  CANCELED: "CANCELED",
} as const;

export const DistributionStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
} as const;

export const SecurityType = {
  EQUITY: "EQUITY",
  PREFERRED: "PREFERRED",
} as const;

export const DistributionFrequency = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  ANNUALLY: "ANNUALLY",
} as const;

export const LedgerEntryType = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  RESERVE: "RESERVE",
  RELEASE: "RELEASE",
  PAYOUT: "PAYOUT",
} as const;

export const LedgerCurrency = {
  USDC_DEMO: "USDC_DEMO",
  USD_LEDGER: "USD_LEDGER",
} as const;

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("INVESTOR"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Investor Profile
export const investorProfiles = pgTable("investor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  kycStatus: text("kyc_status").notNull().default("NOT_STARTED"),
  accredited: boolean("accredited").default(false),
  accreditedAt: timestamp("accredited_at"),
  fullName: text("full_name"),
  entityName: text("entity_name"),
});

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles).omit({
  id: true,
});

export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;
export type InvestorProfile = typeof investorProfiles.$inferSelect;

// Issuer Profile
export const issuerProfiles = pgTable("issuer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  companyName: text("company_name").notNull(),
  website: text("website"),
});

export const insertIssuerProfileSchema = createInsertSchema(issuerProfiles).omit({
  id: true,
});

export type InsertIssuerProfile = z.infer<typeof insertIssuerProfileSchema>;
export type IssuerProfile = typeof issuerProfiles.$inferSelect;

// Projects
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issuerId: varchar("issuer_id").notNull(),
  name: text("name").notNull(),
  assetType: text("asset_type").notNull(),
  location: text("location").notNull(),
  capacityMW: decimal("capacity_mw", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("INTAKE"),
  ppaCounterparty: text("ppa_counterparty"),
  ppaTenorYears: integer("ppa_tenor_years"),
  ppaPrice: decimal("ppa_price", { precision: 10, scale: 4 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Offerings
export const offerings = pgTable("offerings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  issuerId: varchar("issuer_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("DRAFT"),
  targetRaise: decimal("target_raise", { precision: 15, scale: 2 }).notNull(),
  minInvestment: decimal("min_investment", { precision: 15, scale: 2 }).notNull(),
  securityType: text("security_type").notNull(),
  distributionFrequency: text("distribution_frequency").notNull().default("QUARTERLY"),
  expectedIrr: decimal("expected_irr", { precision: 5, scale: 2 }),
  openDate: timestamp("open_date"),
  closeDate: timestamp("close_date"),
  jurisdiction: text("jurisdiction").notNull().default("US"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOfferingSchema = createInsertSchema(offerings).omit({
  id: true,
  createdAt: true,
});

export type InsertOffering = z.infer<typeof insertOfferingSchema>;
export type Offering = typeof offerings.$inferSelect;

// Commitments
export const commitments = pgTable("commitments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: varchar("offering_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("SUBMITTED"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommitmentSchema = createInsertSchema(commitments).omit({
  id: true,
  createdAt: true,
});

export type InsertCommitment = z.infer<typeof insertCommitmentSchema>;
export type Commitment = typeof commitments.$inferSelect;

// Tokenization
export const tokenizations = pgTable("tokenizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: varchar("offering_id").notNull(),
  tokenStandard: text("token_standard").notNull().default("ERC3643_SIM"),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  tokenContractAddress: text("token_contract_address"),
  mintedAt: timestamp("minted_at"),
});

export const insertTokenizationSchema = createInsertSchema(tokenizations).omit({
  id: true,
  mintedAt: true,
});

export type InsertTokenization = z.infer<typeof insertTokenizationSchema>;
export type Tokenization = typeof tokenizations.$inferSelect;

// Token Allocations
export const tokenAllocations = pgTable("token_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenizationId: varchar("tokenization_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  tokens: decimal("tokens", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTokenAllocationSchema = createInsertSchema(tokenAllocations).omit({
  id: true,
  createdAt: true,
});

export type InsertTokenAllocation = z.infer<typeof insertTokenAllocationSchema>;
export type TokenAllocation = typeof tokenAllocations.$inferSelect;

// Distributions
export const distributions = pgTable("distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offeringId: varchar("offering_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"),
  paidAt: timestamp("paid_at"),
});

export const insertDistributionSchema = createInsertSchema(distributions).omit({
  id: true,
  paidAt: true,
});

export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type Distribution = typeof distributions.$inferSelect;

// Distribution Payouts
export const distributionPayouts = pgTable("distribution_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  distributionId: varchar("distribution_id").notNull(),
  investorId: varchar("investor_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"),
  paidAt: timestamp("paid_at"),
});

export const insertDistributionPayoutSchema = createInsertSchema(distributionPayouts).omit({
  id: true,
  paidAt: true,
});

export type InsertDistributionPayout = z.infer<typeof insertDistributionPayoutSchema>;
export type DistributionPayout = typeof distributionPayouts.$inferSelect;

// Ledger Account
export const ledgerAccounts = pgTable("ledger_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLedgerAccountSchema = createInsertSchema(ledgerAccounts).omit({
  id: true,
  createdAt: true,
});

export type InsertLedgerAccount = z.infer<typeof insertLedgerAccountSchema>;
export type LedgerAccount = typeof ledgerAccounts.$inferSelect;

// Ledger Entry
export const ledgerEntries = pgTable("ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  referenceType: text("reference_type"),
  referenceId: varchar("reference_id"),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;

// Zod schemas for form validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["INVESTOR", "ISSUER"]),
});

export const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  assetType: z.enum(["SOLAR", "WIND", "HYDROGEN", "OTHER"]),
  location: z.string().min(1, "Location is required"),
  capacityMW: z.string().optional(),
  ppaCounterparty: z.string().optional(),
  ppaTenorYears: z.number().optional(),
  ppaPrice: z.string().optional(),
  description: z.string().optional(),
});

export const offeringFormSchema = z.object({
  name: z.string().min(1, "Offering name is required"),
  projectId: z.string().min(1, "Project is required"),
  targetRaise: z.string().min(1, "Target raise is required"),
  minInvestment: z.string().min(1, "Minimum investment is required"),
  securityType: z.enum(["EQUITY", "PREFERRED"]),
  distributionFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]),
  expectedIrr: z.string().optional(),
  openDate: z.string().optional(),
  closeDate: z.string().optional(),
  jurisdiction: z.string().default("US"),
});

export const investmentFormSchema = z.object({
  amount: z.string().min(1, "Investment amount is required"),
});

export const distributionFormSchema = z.object({
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
});
