import { randomUUID } from "crypto";

/** Stable IDs so demo login always matches seeded projects (MemStorage). */
const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_DEVELOPER_ID = "00000000-0000-4000-8000-000000000002";
const DEMO_INVESTOR_ID = "00000000-0000-4000-8000-000000000003";
import bcrypt from "bcryptjs";
import {
  type User, type InsertUser,
  type Project, type InsertProject,
  type CapitalStack, type InsertCapitalStack,
  type ReadinessScore, type InsertReadinessScore,
  type Document, type InsertDocument,
  type DataRoomChecklistItem, type InsertDataRoomChecklistItem,
  type InvestorInterest, type InsertInvestorInterest,
  type ProjectApprovalLog, type InsertProjectApprovalLog,
  type Ppa, type InsertPpa,
  type EnergyProduction, type InsertEnergyProduction,
  type RevenueRecord, type InsertRevenueRecord,
  type Distribution, type InsertDistribution,
  type ScadaDataSource, type InsertScadaDataSource,
  type ScadaConnector, type InsertScadaConnector,
  type Meter, type InsertMeter,
  type SgtInterval, type InsertSgtInterval,
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type Posting, type InsertPosting,
  type InterconnectionQueueEntry, type InsertInterconnectionQueueEntry,
  type QueueEntryAnalytics, type InsertQueueEntryAnalytics,
  type IrradianceSnapshot, type InsertIrradianceSnapshot,
  type VerificationRun, type InsertVerificationRun,
  type AnomalyFlag, type InsertAnomalyFlag,
  type MarketplaceMeta, type InsertMarketplaceMeta,
  type MarketplaceExternalLink,
  type Portfolio, type InsertPortfolio, type PortfolioAllocation,
  type FundInterest, type InsertFundInterest,
} from "@shared/schema";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPersonaInquiryId(inquiryId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getProject(id: string): Promise<Project | undefined>;
  getProjectsByDeveloper(developerId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByStatus(...statuses: string[]): Promise<Project[]>;

  getCapitalStack(projectId: string): Promise<CapitalStack | undefined>;
  createCapitalStack(cs: InsertCapitalStack): Promise<CapitalStack>;
  updateCapitalStack(projectId: string, updates: Partial<CapitalStack>): Promise<CapitalStack | undefined>;

  getReadinessScore(projectId: string): Promise<ReadinessScore | undefined>;
  createReadinessScore(score: InsertReadinessScore): Promise<ReadinessScore>;
  updateReadinessScore(projectId: string, updates: Partial<ReadinessScore>): Promise<ReadinessScore | undefined>;

  getDocumentsByProject(projectId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  getChecklistByProject(projectId: string): Promise<DataRoomChecklistItem[]>;
  createChecklistItem(item: InsertDataRoomChecklistItem): Promise<DataRoomChecklistItem>;
  updateChecklistItem(id: string, updates: Partial<DataRoomChecklistItem>): Promise<DataRoomChecklistItem | undefined>;

  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfolioByShareToken(token: string): Promise<Portfolio | undefined>;
  getPortfoliosByOwner(ownerId: string): Promise<Portfolio[]>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: string): Promise<void>;

  createFundInterest(interest: InsertFundInterest): Promise<FundInterest>;
  getAllFundInterests(): Promise<FundInterest[]>;

  getInterestsByProject(projectId: string): Promise<InvestorInterest[]>;
  getInterestsByInvestor(investorId: string): Promise<InvestorInterest[]>;
  createInterest(interest: InsertInvestorInterest): Promise<InvestorInterest>;
  updateInterest(id: string, updates: Partial<InvestorInterest>): Promise<InvestorInterest | undefined>;
  getAllInterests(): Promise<InvestorInterest[]>;

  getApprovalLogs(projectId: string): Promise<ProjectApprovalLog[]>;
  createApprovalLog(log: InsertProjectApprovalLog): Promise<ProjectApprovalLog>;

  getPpasByProject(projectId: string): Promise<Ppa[]>;
  createPpa(ppa: InsertPpa): Promise<Ppa>;

  getProductionByProject(projectId: string): Promise<EnergyProduction[]>;
  createProduction(prod: InsertEnergyProduction): Promise<EnergyProduction>;
  bulkCreateProduction(records: InsertEnergyProduction[]): Promise<EnergyProduction[]>;
  deleteProductionByProject(projectId: string): Promise<number>;

  getRevenueByProject(projectId: string): Promise<RevenueRecord[]>;
  createRevenue(rev: InsertRevenueRecord): Promise<RevenueRecord>;

  getDistributionsByProject(projectId: string): Promise<Distribution[]>;
  createDistribution(dist: InsertDistribution): Promise<Distribution>;
  updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined>;

  getScadaDataSourcesByProject(projectId: string): Promise<ScadaDataSource[]>;
  getScadaDataSource(id: string): Promise<ScadaDataSource | undefined>;
  createScadaDataSource(source: InsertScadaDataSource): Promise<ScadaDataSource>;
  updateScadaDataSource(id: string, updates: Partial<ScadaDataSource>): Promise<ScadaDataSource | undefined>;

  getAllScadaConnectors(): Promise<ScadaConnector[]>;
  getScadaConnector(id: string): Promise<ScadaConnector | undefined>;
  createScadaConnector(connector: InsertScadaConnector): Promise<ScadaConnector>;

  getMetersByProject(projectId: string): Promise<Meter[]>;
  getMeter(id: string): Promise<Meter | undefined>;
  createMeter(meter: InsertMeter): Promise<Meter>;
  updateMeter(id: string, updates: Partial<Meter>): Promise<Meter | undefined>;

  getSgtIntervalsByMeter(meterId: string): Promise<SgtInterval[]>;
  createSgtInterval(interval: InsertSgtInterval): Promise<SgtInterval>;

  getAccountsByProject(projectId: string): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;

  getTransactionsByProject(projectId: string): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;

  getPostingsByTransaction(transactionId: string): Promise<Posting[]>;
  createPosting(posting: InsertPosting): Promise<Posting>;

  getAllInterconnectionQueueEntries(): Promise<InterconnectionQueueEntry[]>;
  getInterconnectionQueueEntry(id: string): Promise<InterconnectionQueueEntry | undefined>;
  getQueueEntryAnalyticsByEntryId(entryId: string): Promise<QueueEntryAnalytics | undefined>;
  getAllQueueEntryAnalytics(): Promise<QueueEntryAnalytics[]>;
  upsertQueueEntryAnalytics(row: Partial<QueueEntryAnalytics> & { entryId: string }): Promise<QueueEntryAnalytics>;

  // Verification engine
  createIrradianceSnapshot(snapshot: InsertIrradianceSnapshot): Promise<IrradianceSnapshot>;
  getIrradianceSnapshots(projectId: string, from?: Date, to?: Date): Promise<IrradianceSnapshot[]>;
  getIrradianceSnapshotForInterval(projectId: string, intervalStart: Date): Promise<IrradianceSnapshot | undefined>;

  createVerificationRun(run: InsertVerificationRun): Promise<VerificationRun>;
  getVerificationRun(id: string): Promise<VerificationRun | undefined>;
  getVerificationRuns(
    projectId: string,
    filters?: { from?: Date; to?: Date; status?: string; granularity?: string; limit?: number },
  ): Promise<VerificationRun[]>;
  getVerificationRunByInterval(intervalId: number): Promise<VerificationRun | undefined>;
  updateVerificationRun(id: string, updates: Partial<VerificationRun>): Promise<VerificationRun | undefined>;

  createAnomalyFlag(flag: InsertAnomalyFlag): Promise<AnomalyFlag>;
  getAnomalyFlagsByRun(runId: string): Promise<AnomalyFlag[]>;
  updateAnomalyFlag(id: number, updates: Partial<AnomalyFlag>): Promise<AnomalyFlag | undefined>;
  getOpenAnomalies(projectId: string): Promise<AnomalyFlag[]>;

  // Marketplace metadata (single-row kv keyed by 'global').
  getMarketplaceMeta(key: string): Promise<MarketplaceMeta | undefined>;
  upsertMarketplaceMeta(row: InsertMarketplaceMeta): Promise<MarketplaceMeta>;
}

import { computeReadiness, generateChecklist, computeCapitalStack, computeRevenue, computeDistribution } from "./scoring-engine";
export { computeReadiness, generateChecklist, computeCapitalStack, computeRevenue, computeDistribution };

// ─── MemStorage ──────────────────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private capitalStacks: Map<string, CapitalStack> = new Map();
  private readinessScores: Map<string, ReadinessScore> = new Map();
  private documents: Map<string, Document> = new Map();
  private checklistItems: Map<string, DataRoomChecklistItem> = new Map();
  private interests: Map<string, InvestorInterest> = new Map();
  private portfolios: Map<string, Portfolio> = new Map();
  private fundInterests: Map<string, FundInterest> = new Map();
  private approvalLogs: Map<string, ProjectApprovalLog> = new Map();
  private ppas: Map<string, Ppa> = new Map();
  private productionRecords: Map<string, EnergyProduction> = new Map();
  private revenueRecords: Map<string, RevenueRecord> = new Map();
  private distributions: Map<string, Distribution> = new Map();
  private scadaDataSources: Map<string, ScadaDataSource> = new Map();
  private scadaConnectors: Map<string, ScadaConnector> = new Map();
  private metersMap: Map<string, Meter> = new Map();
  private sgtIntervalsMap: Map<number, SgtInterval> = new Map();
  private sgtIntervalSeq: number = 1;
  private accountsMap: Map<string, Account> = new Map();
  private transactionsMap: Map<string, Transaction> = new Map();
  private postingsMap: Map<number, Posting> = new Map();
  private interconnectionQueueEntries: Map<string, InterconnectionQueueEntry> = new Map();
  private queueEntryAnalytics: Map<string, QueueEntryAnalytics> = new Map();
  private postingSeq: number = 1;
  private irradianceSnapshotsMap: Map<number, IrradianceSnapshot> = new Map();
  private irradianceSnapshotSeq: number = 1;
  private verificationRunsMap: Map<string, VerificationRun> = new Map();
  private anomalyFlagsMap: Map<number, AnomalyFlag> = new Map();
  private anomalyFlagSeq: number = 1;
  private marketplaceMetaMap: Map<string, MarketplaceMeta> = new Map();
  private marketplaceMetaSeq: number = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    const adminId = DEMO_ADMIN_ID;
    this.users.set(adminId, {
      id: adminId,
      email: "admin@ecoxchange.demo",
      passwordHash: hashPassword("Admin123!"),
      role: "ADMIN",
      name: "Platform Admin",
      orgName: "EcoXchange",
      personaInquiryId: null,
      personaStatus: "not_started",
      personaVerifiedAt: null,
      personaLastEventAt: null,
      personaPayload: null,
      createdAt: new Date(),
    });

    const devId = DEMO_DEVELOPER_ID;
    this.users.set(devId, {
      id: devId,
      email: "developer@ecoxchange.demo",
      passwordHash: hashPassword("Developer123!"),
      role: "DEVELOPER",
      name: "Sarah Chen",
      orgName: "Sunfield Energy LLC",
      personaInquiryId: null,
      personaStatus: "not_started",
      personaVerifiedAt: null,
      personaLastEventAt: null,
      personaPayload: null,
      createdAt: new Date(),
    });

    const investorId = DEMO_INVESTOR_ID;
    this.users.set(investorId, {
      id: investorId,
      email: "investor@ecoxchange.demo",
      passwordHash: hashPassword("Investor123!"),
      role: "INVESTOR",
      name: "James Morrison",
      orgName: "GreenVest Capital",
      personaInquiryId: null,
      personaStatus: "not_started",
      personaVerifiedAt: null,
      personaLastEventAt: null,
      personaPayload: null,
      createdAt: new Date(),
    });

    // GREEN project
    const proj1Id = "proj1";
    this.projects.set(proj1Id, {
      id: proj1Id,
      developerId: devId,
      spvId: null,
      name: "Imperial Valley Solar I",
      technology: "SOLAR",
      stage: "NTP",
      country: "US",
      state: "California",
      county: "Imperial",
      latitude: "32.8476",
      longitude: "-115.5695",
      capacityMW: "12.00",
      capacityKw: "12000",
      status: "APPROVED",
      summary: "A 12MW utility-scale solar project in Imperial Valley, CA with executed IA and approved permits. Single-axis tracking on 80 acres of leased agricultural land. Ready for construction financing.",
      offtakerType: "UTILITY",
      interconnectionStatus: "IA_EXECUTED",
      permittingStatus: "APPROVED",
      siteControlStatus: "LEASE",
      feocAttested: true,
      ppaRate: "0",
      // Derived from the capital stack below.
      monthlyDebtService: "0",
      // $15/kW-year, the low end of the US utility-scale O&M range once land
      // lease, insurance, asset management and inverter reserves are included.
      monthlyOpex: "15000.00",
      reserveRate: "0.05",
      sgtScoreNrel: null,
      eiaActualMwh: null,
      validationConfidence: "88.50",
      eiaPlantCode: null,
      eiaGeneratorId: null,
      eiaReferencePlantName: null,
      queueEntryId: null,
      financialApyPct: "8.4200",
      marketPpaSource: "CAISO_SP15_SPOT_PROXY",
      marketPpaBenchmarkUsdPerMwh: "64.4900",
      externalLinks: null,
      imageUrl: null,
      imageAlt: null,
      imageCredit: null,
      imageLicense: null,
      arrayType: "SINGLE_AXIS_TRACKER",
      commercialOperationDate: null,
      contractTermRemainingYears: "20.00",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs1Id = randomUUID();
    this.capitalStacks.set(proj1Id, {
      id: cs1Id,
      projectId: proj1Id,
      // $1.45/W all-in for 12 MW of single-axis tracking in CAISO, which is
      // where California utility-scale EPC plus interconnection actually lands.
      totalCapex: "17400000",
      taxCreditType: "ITC",
      taxCreditEstimated: "5220000",
      taxCreditTransferabilityReady: true,
      equityNeeded: "6090000",
      debtPlaceholder: "0",
      notes: "30% ITC eligible. Transferability confirmed. Sponsor equity 35% of capex.",
    });

    // Generate checklist for project 1
    const checklist1 = generateChecklist(this.projects.get(proj1Id)!);
    for (const item of checklist1) {
      const itemId = randomUUID();
      this.checklistItems.set(itemId, {
        id: itemId,
        projectId: proj1Id,
        key: item.key,
        label: item.label,
        required: item.required,
        status: "UPLOADED",
        notes: null,
      });
    }

    // Sample documents for project 1
    const docTypes = ["SITE_CONTROL", "INTERCONNECTION", "PERMITS", "FINANCIAL_MODEL", "FEOC_ATTESTATION", "EPC"];
    const docNames = ["lease_agreement.pdf", "ia_execution_notice.pdf", "county_permit_approval.pdf", "financial_model_v3.xlsx", "feoc_attestation_signed.pdf", "epc_term_sheet.pdf"];
    for (let i = 0; i < docTypes.length; i++) {
      const docId = randomUUID();
      this.documents.set(docId, {
        id: docId,
        projectId: proj1Id,
        type: docTypes[i],
        filename: docNames[i],
        filePath: `/uploads/${proj1Id}/${docNames[i]}`,
        uploadedBy: devId,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      });
    }

    // Compute readiness AFTER creating docs and checklist
    const score1 = computeReadiness(
      this.projects.get(proj1Id)!,
      Array.from(this.documents.values()).filter(d => d.projectId === proj1Id),
      Array.from(this.checklistItems.values()).filter(c => c.projectId === proj1Id),
      this.capitalStacks.get(proj1Id)
    );
    const rs1Id = randomUUID();
    this.readinessScores.set(proj1Id, {
      id: rs1Id,
      projectId: proj1Id,
      score: score1.score,
      rating: score1.rating,
      reasons: JSON.stringify(score1.reasons),
      flags: JSON.stringify(score1.flags),
      overriddenByAdmin: false,
      overrideNotes: null,
    });

    // Sample investor interest on project 1
    const int1Id = randomUUID();
    this.interests.set(int1Id, {
      id: int1Id,
      projectId: proj1Id,
      investorId: investorId,
      amountIntent: "500000",
      structurePreference: "EQUITY",
      timeline: "IMMEDIATE",
      message: "Interested in an equity position. Our fund focuses on community solar in ERCOT. Would like to discuss tax credit transfer terms.",
      status: "SUBMITTED",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    // RED project
    const proj2Id = "proj2";
    this.projects.set(proj2Id, {
      id: proj2Id,
      developerId: devId,
      spvId: null,
      name: "Pecos Flat Solar Farm",
      technology: "SOLAR_STORAGE",
      stage: "PRE_NTP",
      country: "US",
      state: "Texas",
      county: "Pecos",
      latitude: "31.4237",
      longitude: "-103.4925",
      capacityMW: "5.50",
      capacityKw: "5500",
      status: "SUBMITTED",
      summary: "A 5.5MW solar + storage project in Pecos County, TX. Early stage with LOI on 40 acres of ranch land. Seeking development partners.",
      offtakerType: "COMMUNITY_SOLAR",
      interconnectionStatus: "APPLIED",
      permittingStatus: "IN_PROGRESS",
      siteControlStatus: "LOI",
      feocAttested: false,
      ppaRate: "0",
      monthlyDebtService: "0",
      monthlyOpex: "0",
      reserveRate: "0",
      sgtScoreNrel: null,
      eiaActualMwh: null,
      validationConfidence: "62.00",
      eiaPlantCode: null,
      eiaGeneratorId: null,
      eiaReferencePlantName: null,
      queueEntryId: null,
      financialApyPct: "6.9500",
      marketPpaSource: "LEVELTEN_P25_PROXY",
      marketPpaBenchmarkUsdPerMwh: "64.4900",
      externalLinks: null,
      imageUrl: null,
      imageAlt: null,
      imageCredit: null,
      imageLicense: null,
      arrayType: "SINGLE_AXIS_TRACKER",
      commercialOperationDate: null,
      contractTermRemainingYears: null,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs2Id = randomUUID();
    this.capitalStacks.set(proj2Id, {
      id: cs2Id,
      projectId: proj2Id,
      totalCapex: "6100000",
      taxCreditType: "ITC",
      taxCreditEstimated: "1830000",
      taxCreditTransferabilityReady: false,
      equityNeeded: "4270000",
      debtPlaceholder: "0",
      notes: null,
    });

    const checklist2 = generateChecklist(this.projects.get(proj2Id)!);
    const uploadedKeys2 = ["interconnection", "financial_model"];
    for (const item of checklist2) {
      const itemId = randomUUID();
      this.checklistItems.set(itemId, {
        id: itemId,
        projectId: proj2Id,
        key: item.key,
        label: item.label,
        required: item.required,
        status: uploadedKeys2.includes(item.key) ? "UPLOADED" : "MISSING",
        notes: null,
      });
    }

    // Some docs for project 2
    const doc2aId = randomUUID();
    this.documents.set(doc2aId, {
      id: doc2aId,
      projectId: proj2Id,
      type: "INTERCONNECTION",
      filename: "interconnection_app_receipt.pdf",
      filePath: `/uploads/${proj2Id}/interconnection_app_receipt.pdf`,
      uploadedBy: devId,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });
    const doc2bId = randomUUID();
    this.documents.set(doc2bId, {
      id: doc2bId,
      projectId: proj2Id,
      type: "FINANCIAL_MODEL",
      filename: "desert_sun_proforma.xlsx",
      filePath: `/uploads/${proj2Id}/desert_sun_proforma.xlsx`,
      uploadedBy: devId,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    const score2 = computeReadiness(
      this.projects.get(proj2Id)!,
      Array.from(this.documents.values()).filter(d => d.projectId === proj2Id),
      Array.from(this.checklistItems.values()).filter(c => c.projectId === proj2Id),
      this.capitalStacks.get(proj2Id)
    );
    const rs2Id = randomUUID();
    this.readinessScores.set(proj2Id, {
      id: rs2Id,
      projectId: proj2Id,
      score: score2.score,
      rating: score2.rating,
      reasons: JSON.stringify(score2.reasons),
      flags: JSON.stringify(score2.flags),
      overriddenByAdmin: false,
      overrideNotes: null,
    });

    // Approval log for project 1
    const log1Id = randomUUID();
    this.approvalLogs.set(log1Id, {
      id: log1Id,
      projectId: proj1Id,
      adminId: adminId,
      action: "APPROVE",
      notes: "Project meets all requirements for investor visibility.",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    });

    // ─── Yield Pipeline Seed Data (Project 1 only — approved + COD-ready) ────
    const ppaId = `ppa-${proj1Id}-default`;
    const now = new Date();
    this.ppas.set(ppaId, {
      id: ppaId,
      projectId: proj1Id,
      offtakerName: "Austin Energy",
      contractStartDate: new Date(now.getFullYear() - 1, 0, 1),
      contractEndDate: new Date(now.getFullYear() + 19, 11, 31),
      pricePerMwh: "72.00",
      escalationType: "ESCALATING",
      escalationRate: "2.00",
      contractedCapacityMW: "12.00",
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    this.seedHourlyProductionAndRevenue(proj1Id, ppaId, 12000, 32.8476, -115.5695, months, now);

    // ─── Project 3: Lancaster Sun Ranch (SGT-verified, Solcast data) ────
    const proj3Id = "proj3";
    this.projects.set(proj3Id, {
      id: proj3Id,
      developerId: devId,
      spvId: null,
      name: "Lancaster Sun Ranch",
      technology: "SOLAR",
      stage: "COD",
      country: "US",
      state: "California",
      county: "Los Angeles",
      latitude: "34.6868",
      longitude: "-118.1542",
      capacityMW: "25.00",
      capacityKw: "25000",
      status: "APPROVED",
      summary: "A 25MW single-axis tracking solar facility in Lancaster, CA with verified SCADA production history. Utility PPA with Southern California Edison. Returns derived from Solcast Sky Oracle satellite telemetry with SGT Handshake verification.",
      offtakerType: "UTILITY",
      interconnectionStatus: "IA_EXECUTED",
      permittingStatus: "APPROVED",
      siteControlStatus: "OWNED",
      feocAttested: true,
      ppaRate: "0",
      // Debt is derived from the capital stack below rather than asserted here,
      // so the two can no longer disagree.
      monthlyDebtService: "0",
      monthlyOpex: "18500.00",
      reserveRate: "0.04",
      sgtScoreNrel: null,
      eiaActualMwh: null,
      validationConfidence: "91.20",
      eiaPlantCode: null,
      eiaGeneratorId: null,
      eiaReferencePlantName: null,
      queueEntryId: null,
      financialApyPct: "9.1800",
      marketPpaSource: "CAISO_SP15_SPOT_PROXY",
      marketPpaBenchmarkUsdPerMwh: "64.4900",
      externalLinks: null,
      imageUrl: null,
      imageAlt: null,
      imageCredit: null,
      imageLicense: null,
      arrayType: "SINGLE_AXIS_TRACKER",
      commercialOperationDate: new Date(Date.UTC(2021, 9, 1)),
      contractTermRemainingYears: "16.25",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs3Id = randomUUID();
    this.capitalStacks.set(proj3Id, {
      id: cs3Id,
      projectId: proj3Id,
      totalCapex: "31250000",
      taxCreditType: "ITC",
      taxCreditEstimated: "9375000",
      taxCreditTransferabilityReady: true,
      equityNeeded: "14062500",
      debtPlaceholder: "8562500",
      notes: "30% ITC eligible. Operational asset with verified production history. Sponsor equity 45% of capex, balance senior debt plus ITC transfer.",
    });

    const checklist3 = generateChecklist(this.projects.get(proj3Id)!);
    for (const item of checklist3) {
      const itemId3 = randomUUID();
      this.checklistItems.set(itemId3, {
        id: itemId3,
        projectId: proj3Id,
        key: item.key,
        label: item.label,
        required: item.required,
        status: "UPLOADED",
        notes: null,
      });
    }

    const doc3Types = ["SITE_CONTROL", "INTERCONNECTION", "PERMITS", "FINANCIAL_MODEL", "FEOC_ATTESTATION", "EPC", "PPA"];
    const doc3Names = ["deed_of_trust.pdf", "ia_executed_sce.pdf", "la_county_permit.pdf", "financial_model_v4.xlsx", "feoc_attestation_signed.pdf", "epc_completion_cert.pdf", "ppa_sce_energy.pdf"];
    for (let i = 0; i < doc3Types.length; i++) {
      const docId3 = randomUUID();
      this.documents.set(docId3, {
        id: docId3,
        projectId: proj3Id,
        type: doc3Types[i],
        filename: doc3Names[i],
        filePath: `/uploads/${proj3Id}/${doc3Names[i]}`,
        uploadedBy: devId,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      });
    }

    const score3 = computeReadiness(
      this.projects.get(proj3Id)!,
      Array.from(this.documents.values()).filter(d => d.projectId === proj3Id),
      Array.from(this.checklistItems.values()).filter(c => c.projectId === proj3Id),
      this.capitalStacks.get(proj3Id)
    );
    const rs3Id = randomUUID();
    this.readinessScores.set(proj3Id, {
      id: rs3Id,
      projectId: proj3Id,
      score: score3.score,
      rating: score3.rating,
      reasons: JSON.stringify(score3.reasons),
      flags: JSON.stringify(score3.flags),
      overriddenByAdmin: false,
      overrideNotes: null,
    });

    const log3Id = randomUUID();
    this.approvalLogs.set(log3Id, {
      id: log3Id,
      projectId: proj3Id,
      adminId: adminId,
      action: "APPROVE",
      notes: "Operational asset with verified Solcast Sky Oracle production data. Approved for investor visibility.",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    // ─── Yield Pipeline for Project 3 (Solcast Sky Oracle-derived actuals) ────
    const ppa3Id = `ppa-${proj3Id}-default`;
    this.ppas.set(ppa3Id, {
      id: ppa3Id,
      projectId: proj3Id,
      offtakerName: "Southern California Edison",
      contractStartDate: new Date(now.getFullYear() - 1, 0, 1),
      contractEndDate: new Date(now.getFullYear() + 19, 11, 31),
      pricePerMwh: "72.00",
      escalationType: "ESCALATING",
      escalationRate: "1.50",
      contractedCapacityMW: "25.00",
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    });

    this.seedHourlyProductionAndRevenue(proj3Id, ppa3Id, 25000, 34.6868, -118.1542, months, now);

    // Investor interest on project 3
    const int3Id = randomUUID();
    this.interests.set(int3Id, {
      id: int3Id,
      projectId: proj3Id,
      investorId: investorId,
      amountIntent: "750000",
      structurePreference: "EQUITY",
      timeline: "IMMEDIATE",
      message: "Strong interest in the verified production profile. Solcast-verified satellite telemetry gives us confidence in the yield projections. Requesting data room access.",
      status: "SUBMITTED",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    // ─── SCADA Connector Placeholders ────────────────────────────────
    const connectors = [
      { name: "AlsoEnergy", slug: "alsoenergy", description: "Enterprise-grade solar monitoring and asset management platform. Supports utility-scale and C&I portfolios.", status: "COMING_SOON", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
      { name: "Enphase", slug: "enphase", description: "Microinverter-based monitoring for residential and small commercial solar installations.", status: "COMING_SOON", supportedTechnologies: "SOLAR" },
      { name: "SolarEdge", slug: "solaredge", description: "Power optimizer and inverter monitoring platform for residential, C&I, and utility-scale systems.", status: "COMING_SOON", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
      { name: "Solcast Sky Oracle", slug: "solcast-sky-oracle", description: "Satellite-derived solar irradiance and estimated actuals from Solcast Advanced PV Power API for SGT verification.", status: "AVAILABLE", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
      { name: "Power Factors", slug: "power-factors", description: "Asset performance management for utility-scale renewables including solar, wind, and storage.", status: "COMING_SOON", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
    ];
    for (const c of connectors) {
      const cId = randomUUID();
      this.scadaConnectors.set(cId, {
        id: cId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        status: c.status,
        logoUrl: null,
        supportedTechnologies: c.supportedTechnologies,
        configSchema: null,
        createdAt: new Date(),
      });
    }

    const solcastConnector = Array.from(this.scadaConnectors.values()).find(c => c.slug === "solcast-sky-oracle");

    // ─── SCADA Data Sources per Project ──────────────────────────────
    const ds1Id = randomUUID();
    this.scadaDataSources.set(ds1Id, {
      id: ds1Id,
      projectId: proj1Id,
      sourceType: "CSV_UPLOAD",
      providerName: "SCADA Export",
      status: "ACTIVE",
      dataQuality: "HIGH",
      lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      recordCount: 8760,
      connectorId: null,
      configJson: JSON.stringify({ capacityKw: 12000, technology: "Mono-Si", trackingType: "Single-Axis", lat: 32.8476, lon: -115.5695 }),
      notes: "Hourly SCADA production data from inverter DAS export. 12 months of verified meter readings.",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    const ds2Id = randomUUID();
    this.scadaDataSources.set(ds2Id, {
      id: ds2Id,
      projectId: proj2Id,
      sourceType: "CSV_UPLOAD",
      providerName: "CSV Import",
      status: "PENDING",
      dataQuality: "UNKNOWN",
      lastSyncAt: null,
      recordCount: 0,
      connectorId: null,
      configJson: null,
      notes: "Awaiting initial production data upload. Project is pre-NTP.",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    });

    const ds3Id = randomUUID();
    this.scadaDataSources.set(ds3Id, {
      id: ds3Id,
      projectId: proj3Id,
      sourceType: "CSV_UPLOAD",
      providerName: "SCADA Export",
      status: "ACTIVE",
      dataQuality: "HIGH",
      lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      recordCount: 8760,
      connectorId: null,
      configJson: JSON.stringify({ capacityKw: 25000, technology: "Mono-Si", trackingType: "Single-Axis", lat: 34.6868, lon: -118.1542 }),
      notes: "Hourly SCADA production data from inverter DAS export. 12 months of verified meter readings.",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    this.seedOperatingPortfolio(devId, adminId);
    this.seedInterconnectionQueueDemo();
  }

  /** Demo solar queue rows + pre-computed analytics (no NREL call). */
  private seedInterconnectionQueueDemo() {
    const mk = (
      id: string,
      ext: string,
      iso: string,
      name: string,
      st: string,
      cty: string,
      mw: string,
      lat: string,
      lon: string,
    ) => {
      this.interconnectionQueueEntries.set(id, {
        id,
        externalId: ext,
        isoCode: iso,
        projectName: name,
        queueStatus: "Active",
        resourceType: "Solar PV",
        capacityMW: mw,
        state: st,
        county: cty,
        latitude: lat,
        longitude: lon,
        rawJson: null,
        syncedAt: new Date(),
      });
    };

    // Counties match each row's coordinates — these render on the public
    // marketplace as "<county>, <state>", so a placeholder shows up as a real
    // listing location.
    mk("iqe-demo-1", "GS-DEMO-1001", "CAISO", "Kern Sunfield South", "California", "Kern", "48.50", "35.37", "-119.02");
    mk("iqe-demo-2", "GS-DEMO-2002", "PJM", "Piedmont Queue Solar", "North Carolina", "Chatham", "55.00", "35.72", "-79.18");
    mk("iqe-demo-3", "GS-DEMO-3003", "SPP", "Plains Wind & Solar Hybrid", "Kansas", "Ford", "150.00", "37.75", "-99.64");

    // Production derives from capacity x a location-appropriate capacity
    // factor rather than being hardcoded. The previous figures implied ~33.4%
    // CF at every site, which fixed-tilt PV cannot reach anywhere in the US —
    // real-world fixed-tilt runs 15-22% depending on latitude and climate.
    const PPA_USD_PER_KWH = 0.06449;
    const OPEX_USD_PER_MW_YEAR = 18_000;
    const DEBT_SERVICE_RATE = 0.2; // share of gross revenue
    const RESERVE_RATE = 0.05; // share of gross revenue
    const PLATFORM_AUA_RATE = 0.005; // annual AUA fee on gross revenue

    const baseAnalytics = (
      entryId: string,
      capacityMw: number,
      capacityFactor: number,
    ): QueueEntryAnalytics => {
      const annualKwh = Math.round(capacityMw * 1000 * 8760 * capacityFactor);
      const annualGrossRevenueUsd = Math.round(annualKwh * PPA_USD_PER_KWH);
      const debtService = Math.round(annualGrossRevenueUsd * DEBT_SERVICE_RATE);
      const opexFund = Math.round(capacityMw * OPEX_USD_PER_MW_YEAR);
      const reserves = Math.round(annualGrossRevenueUsd * RESERVE_RATE);
      const platformFee = Math.round(annualGrossRevenueUsd * PLATFORM_AUA_RATE);
      const investorYield =
        annualGrossRevenueUsd - debtService - opexFund - reserves - platformFee;

      return {
        id: `iqa-${entryId}`,
        entryId,
        backtestSummary: {
          nsrdbAnnualKwh: annualKwh,
          capacityFactor,
          performanceRatio: 0.82,
          demo: true,
        },
        annualMwhModeled: (annualKwh / 1000).toFixed(3),
        annualKwhNsrdb: String(annualKwh),
        // Annual cash yield over capex, not an IRR — see marketplace-listings.
        irrProxyPct: "8.2500",
        moicProxy: "1.5775",
        ppaScenario: {
          source: "CAISO_SP15_SPOT_PROXY",
          usdPerKwh: PPA_USD_PER_KWH,
          benchmarkUsdPerMwh: PPA_USD_PER_KWH * 1000,
          annualGrossRevenueUsd,
        } as unknown as Record<string, unknown>,
        // Tiers sum to gross revenue exactly; the investor tier is the residual.
        waterfallSummary: {
          DEBT_SERVICE: debtService,
          OPEX_FUND: opexFund,
          RESERVES: reserves,
          PLATFORM_FEE: platformFee,
          INVESTOR_YIELD: investorYield,
        },
        monthlyWaterfallSeries: [],
        engineVersion: "queue-analytics-demo",
        computeStatus: "READY",
        errorMessage: null,
        computedAt: new Date(),
      };
    };

    // Capacity factors reflect fixed-tilt PV at each site's latitude/climate.
    this.queueEntryAnalytics.set("iqe-demo-1", baseAnalytics("iqe-demo-1", 48.5, 0.24)); // Kern, CA — high desert irradiance
    this.queueEntryAnalytics.set("iqe-demo-2", baseAnalytics("iqe-demo-2", 55.0, 0.18)); // Chatham, NC — humid subtropical
    this.queueEntryAnalytics.set("iqe-demo-3", baseAnalytics("iqe-demo-3", 150.0, 0.19)); // Ford, KS — high plains
  }

  /**
   * Marketplace inventory.
   *
   * Two tiers, because they answer different investor questions:
   *
   *  - OPERATING assets are acquisitions of built, metered, contracted plants.
   *    They are what a yield investor is actually buying, and their denominator
   *    is the acquisition price rather than greenfield capex. That is the whole
   *    reason they can clear a 9% cash yield: an operating plant bought at
   *    $0.68-1.50/W throws off 9-10% of purchase price in cash, whereas the same
   *    plant built new at $1.45/W does not.
   *
   *  - DEVELOPMENT projects are pre-COD. Their yield is modeled at COD, not
   *    distributed today, and the stage badge on the card says so.
   *
   * Every asset is underwritten from four inputs that are stated, not hidden:
   * capacity factor (region + mounting), net contracted price, O&M per kW-year,
   * and acquisition cost per watt. Names and locations are EcoXchange's own SPVs;
   * where an asset's production profile is modeled on a published reference
   * plant, that plant is named in `eiaReferencePlantName` and cited in
   * `externalLinks` rather than being passed off as the asset itself.
   *
   * Assets that do not clear the hurdle stay listed at their real number.
   * Hiding them would recreate exactly the credibility problem this replaced.
   */
  private seedOperatingPortfolio(devId: string, adminId: string) {
    type AssetRow = {
      id: string;
      name: string;
      state: string;
      county: string;
      lat: string;
      lon: string;
      mw: number;
      arrayType: "SINGLE_AXIS_TRACKER" | "FIXED_TILT" | "ROOFTOP";
      offtaker: "UTILITY" | "C_AND_I" | "COMMUNITY_SOLAR" | "MERCHANT";
      tech?: string;
      /** COD for operating assets; null while pre-construction. */
      cod: { y: number; m: number } | null;
      stage: string;
      status: "APPROVED" | "SUBMITTED" | "IN_REVIEW";
      contractYearsRemaining: number | null;
      /** Net price the SPV receives, $/kWh, after any subscriber discount. */
      ppaUsdPerKwh: number;
      /** All-in O&M, insurance, asset management and land, $/kW-year. */
      opexUsdPerKwYear: number;
      /** Acquisition cost (operating) or build cost (development), $/W. */
      costUsdPerW: number;
      /** Share of cost funded by investor equity. 1.0 is an unlevered SPV. */
      equityShare: number;
      /** ITC only applies to new build; an acquired plant's credit is spent. */
      itcEligible: boolean;
      referencePlant: string | null;
      links: MarketplaceExternalLink[] | null;
      summary: string;
    };

    const EIA_860: MarketplaceExternalLink = {
      label: "EIA-860 generator data",
      url: "https://www.eia.gov/electricity/data/eia860/",
      source: "EIA",
    };
    const NREL_ATB: MarketplaceExternalLink = {
      label: "NREL Annual Technology Baseline",
      url: "https://atb.nrel.gov/",
      source: "NREL",
    };

    const rows: AssetRow[] = [
      // ─── Operating tier ────────────────────────────────────────────────────
      {
        id: "asset-kern-ridge",
        name: "Kern Ridge C&I Portfolio",
        state: "California",
        county: "Kern",
        lat: "35.3733",
        lon: "-119.0187",
        mw: 6.4,
        arrayType: "ROOFTOP",
        offtaker: "C_AND_I",
        cod: { y: 2019, m: 6 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 13.5,
        // Behind-the-meter offtake prices against the host's retail bill, not
        // the wholesale hub, which is why C&I rooftop out-yields utility-scale.
        ppaUsdPerKwh: 0.115,
        opexUsdPerKwYear: 22,
        costUsdPerW: 1.2,
        equityShare: 0.65,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "Nine rooftop arrays across four industrial tenants in Bakersfield, operating since 2019 with 13.5 years remaining on behind-the-meter PPAs. Acquired at $1.20/W with a 35% senior facility. Yield is paid from host billing, not merchant energy prices.",
      },
      {
        id: "asset-greeley-9068",
        name: "Greeley Tracker One",
        state: "Colorado",
        county: "Weld",
        lat: "40.3864",
        lon: "-104.5512",
        mw: 4.738,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "UTILITY",
        cod: { y: 2018, m: 11 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 12.0,
        ppaUsdPerKwh: 0.0525,
        opexUsdPerKwYear: 15,
        costUsdPerW: 1.05,
        equityShare: 1.0,
        itcEligible: false,
        referencePlant: "NREL PVDAQ Site 9068 - Greeley, CO",
        links: [
          {
            label: "NREL PVDAQ public datasets (Site 9068)",
            url: "https://data.openei.org/submissions/4568",
            source: "NREL/OEDI",
          },
          {
            label: "PVDAQ v3 API documentation",
            url: "https://developer.nrel.gov/docs/solar/pvdaq-v3/",
            source: "NREL",
          },
        ],
        summary:
          "4.74 MW single-axis tracking array outside Greeley, modeled on NREL PVDAQ Site 9068 - the same public research dataset the platform's SGT backtest engine validates against, at 10-second resolution. Unlevered SPV: every dollar of cash flow after O&M and reserves goes to members.",
      },
      {
        id: "asset-hudson-valley",
        name: "Hudson Valley Community Solar II",
        state: "New York",
        county: "Ulster",
        lat: "41.9270",
        lon: "-74.0221",
        mw: 5.6,
        arrayType: "FIXED_TILT",
        offtaker: "COMMUNITY_SOLAR",
        cod: { y: 2020, m: 9 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 16.0,
        // NY VDER value stack net of the 10% subscriber discount and subscriber
        // management cost. Gross stack is higher; this is what the SPV keeps.
        ppaUsdPerKwh: 0.128,
        opexUsdPerKwYear: 30,
        costUsdPerW: 1.3,
        equityShare: 0.55,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "5.6 MW ground-mount community solar garden in the Hudson Valley with roughly 900 residential subscribers, compensated under NY's VDER value stack. The unlevered yield exceeds the senior debt constant, so the 45% facility is accretive to cash yield rather than dilutive.",
      },
      {
        id: "asset-pecos-mesa",
        name: "Pecos Mesa Tracker",
        state: "Texas",
        county: "Reeves",
        lat: "31.3005",
        lon: "-103.6890",
        mw: 22,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "UTILITY",
        cod: { y: 2018, m: 4 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 11.0,
        ppaUsdPerKwh: 0.0465,
        opexUsdPerKwYear: 14,
        costUsdPerW: 0.95,
        equityShare: 1.0,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860, NREL_ATB],
        summary:
          "22 MW single-axis tracker in the Permian with 11 years left on an investment-grade PPA. Acquired at $0.95/W - a discount to replacement cost that reflects the shorter contract tail, and the reason the cash yield clears the hurdle. Merchant exposure begins in year 12.",
      },
      {
        id: "asset-sonoran-mesa",
        name: "Sonoran Mesa I",
        state: "Arizona",
        county: "Pinal",
        lat: "32.8795",
        lon: "-111.7574",
        mw: 18,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "UTILITY",
        cod: { y: 2021, m: 3 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 19.0,
        ppaUsdPerKwh: 0.0435,
        opexUsdPerKwYear: 14,
        costUsdPerW: 1.05,
        equityShare: 1.0,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "18 MW in Pinal County on the best irradiance in the portfolio, with 19 years of contract left. It does not clear the 9% hurdle: the long, cheap PPA that makes it the lowest-risk asset here is exactly what caps its cash yield. Listed at its real number as the stability sleeve of a blended portfolio.",
      },
      {
        id: "asset-piedmont",
        name: "Piedmont Fixed-Tilt Portfolio",
        state: "North Carolina",
        county: "Chatham",
        lat: "35.7215",
        lon: "-79.1780",
        mw: 12,
        arrayType: "FIXED_TILT",
        offtaker: "UTILITY",
        cod: { y: 2016, m: 8 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 6.5,
        ppaUsdPerKwh: 0.051,
        opexUsdPerKwYear: 15,
        costUsdPerW: 0.68,
        equityShare: 1.0,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "Three fixed-tilt farms in the Carolinas, operating since 2016, with 6.5 years remaining under the utility's avoided-cost tariff. Acquired at $0.68/W. High current yield, short contract tail: the terminal value depends on a recontracting decision in 2032, which is the risk being paid for.",
      },
      {
        id: "asset-front-range",
        name: "Front Range Solar Garden",
        state: "Colorado",
        county: "Weld",
        lat: "40.4233",
        lon: "-104.7091",
        mw: 4.2,
        arrayType: "FIXED_TILT",
        offtaker: "COMMUNITY_SOLAR",
        cod: { y: 2019, m: 5 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 14.0,
        ppaUsdPerKwh: 0.085,
        opexUsdPerKwYear: 26,
        costUsdPerW: 1.3,
        equityShare: 1.0,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "4.2 MW community solar garden serving municipal and residential subscribers on the Front Range. Unlevered, 14 years of subscription term remaining, and geographically adjacent to Greeley Tracker One - which is a correlation the portfolio builder will flag rather than hide.",
      },
      {
        id: "asset-bay-state",
        name: "Bay State C&I Rooftop Portfolio",
        state: "Massachusetts",
        county: "Worcester",
        lat: "42.2626",
        lon: "-71.8023",
        mw: 3.8,
        arrayType: "ROOFTOP",
        offtaker: "C_AND_I",
        cod: { y: 2020, m: 2 },
        stage: "COD",
        status: "APPROVED",
        contractYearsRemaining: 14.5,
        // SMART tariff plus net metering credits against a high retail rate.
        ppaUsdPerKwh: 0.145,
        opexUsdPerKwYear: 28,
        costUsdPerW: 1.5,
        equityShare: 0.6,
        itcEligible: false,
        referencePlant: null,
        links: [EIA_860],
        summary:
          "3.8 MW across eleven commercial rooftops in central Massachusetts under the SMART tariff. The weakest resource in the portfolio at a 15% capacity factor, and the highest revenue per kWh - a useful demonstration that yield tracks price and structure, not sunshine.",
      },

      // ─── Development tier (pre-COD, modeled at COD) ────────────────────────
      {
        id: "asset-mojave-crest",
        name: "Mojave Crest Solar",
        state: "California",
        county: "San Bernardino",
        lat: "35.0123",
        lon: "-116.1024",
        mw: 18.5,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "UTILITY",
        cod: null,
        stage: "NTP",
        status: "APPROVED",
        contractYearsRemaining: 20,
        ppaUsdPerKwh: 0.0455,
        opexUsdPerKwYear: 15,
        costUsdPerW: 1.42,
        equityShare: 0.35,
        itcEligible: true,
        referencePlant: null,
        links: [NREL_ATB],
        summary:
          "18.5 MW at notice-to-proceed in San Bernardino County. Pre-COD: the figures below are modeled at commercial operation and are not being distributed today. Construction and completion risk are not priced into a cash-yield metric.",
      },
      {
        id: "asset-rio-grande",
        name: "Rio Grande PV East",
        state: "Texas",
        county: "El Paso",
        lat: "31.8200",
        lon: "-106.4200",
        mw: 14,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "COMMUNITY_SOLAR",
        cod: null,
        stage: "CONSTRUCTION",
        status: "APPROVED",
        contractYearsRemaining: 20,
        // ERCOT has no premium community solar programme; the subscription
        // price sits close to the wholesale index, not to a NY-style value stack.
        ppaUsdPerKwh: 0.0575,
        opexUsdPerKwYear: 18,
        costUsdPerW: 1.45,
        equityShare: 0.35,
        itcEligible: true,
        referencePlant: null,
        links: [NREL_ATB],
        summary:
          "14 MW under construction outside El Paso, contracted to a community solar programme. Pre-COD - modeled at commercial operation, targeting first distribution the quarter after energization.",
      },
      {
        id: "asset-ozark-ridge",
        name: "Ozark Ridge Solar",
        state: "Missouri",
        county: "Greene",
        lat: "37.2100",
        lon: "-93.2900",
        mw: 12,
        arrayType: "FIXED_TILT",
        offtaker: "C_AND_I",
        cod: null,
        stage: "PRE_NTP",
        status: "SUBMITTED",
        contractYearsRemaining: null,
        ppaUsdPerKwh: 0.0685,
        opexUsdPerKwYear: 17,
        costUsdPerW: 1.35,
        equityShare: 0.35,
        itcEligible: true,
        referencePlant: null,
        links: null,
        summary:
          "12 MW in southwest Missouri, pre-NTP with site control under option. Submitted for review, not yet listed to investors.",
      },
      {
        id: "asset-prairie-hybrid",
        name: "Prairie Wind & Sun Hybrid",
        state: "Kansas",
        county: "Ford",
        lat: "37.7500",
        lon: "-99.6400",
        mw: 150,
        arrayType: "SINGLE_AXIS_TRACKER",
        offtaker: "UTILITY",
        tech: "SOLAR_STORAGE",
        cod: null,
        stage: "PRE_NTP",
        status: "IN_REVIEW",
        contractYearsRemaining: null,
        ppaUsdPerKwh: 0.0415,
        opexUsdPerKwYear: 16,
        costUsdPerW: 1.55,
        equityShare: 0.35,
        itcEligible: true,
        referencePlant: null,
        links: null,
        summary:
          "150 MW solar-plus-storage in southwest Kansas, in review. Storage economics are not yet reflected in the energy-only figures below.",
      },
    ];

    let i = 0;
    for (const r of rows) {
      const capacityKw = Math.round(r.mw * 1000);
      const totalCost = Math.round(r.mw * 1_000_000 * r.costUsdPerW);
      const monthlyOpex = Math.round((capacityKw * r.opexUsdPerKwYear) / 12);
      const isOperating = r.cod != null;

      this.projects.set(r.id, {
        id: r.id,
        developerId: devId,
        spvId: null,
        name: r.name,
        technology: r.tech || "SOLAR",
        stage: r.stage as Project["stage"],
        country: "US",
        state: r.state,
        county: r.county,
        latitude: r.lat,
        longitude: r.lon,
        capacityMW: r.mw.toFixed(2),
        capacityKw: String(capacityKw),
        status: r.status,
        summary: r.summary,
        offtakerType: r.offtaker,
        interconnectionStatus: isOperating ? "IA_EXECUTED" : r.stage === "PRE_NTP" ? "STUDY" : "IA_EXECUTED",
        permittingStatus: r.stage === "PRE_NTP" ? "IN_PROGRESS" : "APPROVED",
        siteControlStatus: r.stage === "PRE_NTP" ? "OPTION" : isOperating ? "OWNED" : "LEASE",
        feocAttested: true,
        // A contracted price on the books resolves as KNOWN rather than falling
        // through to the wholesale index, which is what made every listing look
        // identical before.
        ppaRate: r.ppaUsdPerKwh.toFixed(4),
        // Debt is derived from the capital stack below, not asserted here.
        monthlyDebtService: "0",
        monthlyOpex: String(monthlyOpex),
        reserveRate: "0.05",
        sgtScoreNrel: isOperating ? String((0.78 + (i % 10) * 0.012).toFixed(4)) : null,
        eiaActualMwh: null,
        validationConfidence: isOperating ? String((84 + (i % 12)).toFixed(2)) : "70.00",
        eiaPlantCode: null,
        eiaGeneratorId: null,
        eiaReferencePlantName: r.referencePlant,
        queueEntryId: null,
        financialApyPct: null,
        marketPpaSource: "FIXED_PPA",
        marketPpaBenchmarkUsdPerMwh: "64.4900",
        externalLinks: r.links,
        imageUrl: null,
        imageAlt: null,
        imageCredit: null,
        imageLicense: null,
        arrayType: r.arrayType,
        commercialOperationDate: r.cod ? new Date(Date.UTC(r.cod.y, r.cod.m - 1, 1)) : null,
        contractTermRemainingYears:
          r.contractYearsRemaining != null ? r.contractYearsRemaining.toFixed(2) : null,
        createdAt: new Date(Date.now() - (30 + i) * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });

      const csId = randomUUID();
      this.capitalStacks.set(r.id, {
        id: csId,
        projectId: r.id,
        totalCapex: String(totalCost),
        taxCreditType: r.itcEligible ? "ITC" : "NONE",
        // An operating acquisition carries no credit: the original owner
        // claimed it at COD. Modeling one would overstate the yield.
        taxCreditEstimated: r.itcEligible ? String(Math.round(totalCost * 0.3)) : "0",
        taxCreditTransferabilityReady: r.itcEligible,
        equityNeeded: String(Math.round(totalCost * r.equityShare)),
        debtPlaceholder: String(Math.round(totalCost * (1 - r.equityShare))),
        notes: isOperating
          ? `Acquisition at $${r.costUsdPerW.toFixed(2)}/W. Investor equity ${(r.equityShare * 100).toFixed(0)}% of purchase price.`
          : `Build cost $${r.costUsdPerW.toFixed(2)}/W. Sponsor equity ${(r.equityShare * 100).toFixed(0)}% of capex, balance from senior debt and ITC transfer.`,
      });

      const checklistDef = generateChecklist(this.projects.get(r.id)!);
      for (const item of checklistDef) {
        const itemId = randomUUID();
        this.checklistItems.set(itemId, {
          id: itemId,
          projectId: r.id,
          key: item.key,
          label: item.label,
          required: item.required,
          status: "UPLOADED",
          notes: null,
        });
      }

      const docs = Array.from(this.documents.values()).filter((d) => d.projectId === r.id);
      const checklistRows = Array.from(this.checklistItems.values()).filter((c) => c.projectId === r.id);
      const scoreR = computeReadiness(this.projects.get(r.id)!, docs, checklistRows, this.capitalStacks.get(r.id));
      const rsId = randomUUID();
      this.readinessScores.set(r.id, {
        id: rsId,
        projectId: r.id,
        score: scoreR.score,
        rating: scoreR.rating,
        reasons: JSON.stringify(scoreR.reasons),
        flags: JSON.stringify(scoreR.flags),
        overriddenByAdmin: false,
        overrideNotes: null,
      });

      if (r.status === "APPROVED") {
        const logId = randomUUID();
        this.approvalLogs.set(logId, {
          id: logId,
          projectId: r.id,
          adminId,
          action: "APPROVE",
          notes: isOperating
            ? "Operating asset: production metered, contract diligenced."
            : "Development asset approved for pre-COD listing.",
          createdAt: new Date(Date.now() - (20 + i) * 24 * 60 * 60 * 1000),
        });
      }

      i++;
    }
  }

  private seedHourlyProductionAndRevenue(
    projectId: string,
    ppaId: string,
    capacityKw: number,
    latitude: number,
    longitude: number,
    months: string[],
    now: Date
  ) {
    const ppaRate = 72;
    const opexRatio = 0.15;

    function solarElev(dayOfYear: number, hour: number, lat: number): number {
      const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
      const decRad = declination * Math.PI / 180;
      const latRad = lat * Math.PI / 180;
      const hourAngle = (hour - 12) * 15 * Math.PI / 180;
      const sinElev = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle);
      return Math.asin(Math.max(-1, Math.min(1, sinElev))) * 180 / Math.PI;
    }

    const seedRng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    };
    const rng = seedRng(capacityKw * 1000 + Math.round(latitude * 100));

    const monthlyProdIds: string[] = [];
    const monthlyMwh: number[] = [];

    // Generate the *trailing* twelve months rather than the previous calendar
    // year. Consumers that ask for "last 12 months of production" (the
    // marketplace, the performance page) were only ever seeing the half of a
    // calendar year that happened to fall inside the window, which halved the
    // apparent capacity factor of every metered asset.
    for (let m = 0; m < 12; m++) {
      const monthAnchor = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - 12 + m,
        1,
      ));
      const year = monthAnchor.getUTCFullYear();
      const month = monthAnchor.getUTCMonth();
      const periodEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      const daysInMonth = periodEnd.getUTCDate();
      let totalMonthMwh = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const cloudFactor = 0.7 + 0.3 * rng();
        const tempDerate = 0.95 + 0.05 * rng();

        for (let h = 0; h < 24; h++) {
          const hourStart = new Date(Date.UTC(year, month, d, h, 0, 0));
          const hourEnd = new Date(Date.UTC(year, month, d, h + 1, 0, 0));
          const solarDate = new Date(
            hourStart.getTime() + (longitude / 15) * 60 * 60 * 1000,
          );
          const dayOfYear = Math.floor(
            (solarDate.getTime() - Date.UTC(solarDate.getUTCFullYear(), 0, 0)) / 86_400_000,
          );
          const solarHour = solarDate.getUTCHours() + 0.5;
          const elev = solarElev(dayOfYear, solarHour, latitude);
          let productionKw = 0;

          if (elev > 2) {
            const elevNorm = Math.sin(elev * Math.PI / 180);
            const hourVariation = 0.9 + 0.2 * rng();
            productionKw = capacityKw * elevNorm * cloudFactor * tempDerate * hourVariation;
            productionKw = Math.min(productionKw, capacityKw);
            productionKw = Math.max(0, productionKw);
          }

          const productionMwh = productionKw / 1000;
          totalMonthMwh += productionMwh;

          const cf = productionKw / capacityKw;

          const prodId = randomUUID();
          this.productionRecords.set(prodId, {
            id: prodId,
            projectId,
            periodStart: hourStart,
            periodEnd: hourEnd,
            productionMwh: productionMwh.toFixed(4),
            capacityFactor: cf.toFixed(6),
            source: "SCADA",
            createdAt: hourEnd,
          });

          const grossRevenue = productionMwh * ppaRate;
          const operatingExpenses = grossRevenue * opexRatio;
          const netRevenue = grossRevenue - operatingExpenses;

          const revId = randomUUID();
          this.revenueRecords.set(revId, {
            id: revId,
            projectId,
            ppaId,
            productionId: prodId,
            periodStart: hourStart,
            periodEnd: hourEnd,
            grossRevenue: grossRevenue.toFixed(2),
            operatingExpenses: operatingExpenses.toFixed(2),
            netRevenue: netRevenue.toFixed(2),
            createdAt: hourEnd,
          });
        }
      }

      monthlyMwh.push(totalMonthMwh);

      const dist = computeDistribution(totalMonthMwh * ppaRate * (1 - opexRatio));
      const distId = randomUUID();
      this.distributions.set(distId, {
        id: distId,
        projectId,
        periodLabel: `${months[month]} ${year}`,
        totalDistributable: dist.totalDistributable.toString(),
        investorShare: dist.investorShare.toString(),
        platformFee: dist.platformFee.toString(),
        status: m < 11 ? "DISTRIBUTED" : "APPROVED",
        distributedAt: m < 11 ? new Date(year, month + 1, 15) : null,
        createdAt: periodEnd,
      });
    }
  }

  // ─── Users ──────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async getUserByPersonaInquiryId(inquiryId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.personaInquiryId === inquiryId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: hashPassword(insertUser.passwordHash),
      role: insertUser.role || "DEVELOPER",
      name: insertUser.name,
      orgName: insertUser.orgName || null,
      personaInquiryId: null,
      personaStatus: "not_started",
      personaVerifiedAt: null,
      personaLastEventAt: null,
      personaPayload: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // ─── Projects ───────────────────────────────────────────────────

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByDeveloper(developerId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.developerId === developerId);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const newProject: Project = {
      id,
      developerId: project.developerId,
      spvId: null,
      name: project.name,
      technology: project.technology || "SOLAR",
      stage: project.stage || "PRE_NTP",
      country: project.country || "US",
      state: project.state,
      county: project.county,
      latitude: project.latitude || null,
      longitude: project.longitude || null,
      capacityMW: project.capacityMW || null,
      capacityKw: project.capacityKw || null,
      status: project.status || "DRAFT",
      summary: project.summary || null,
      offtakerType: project.offtakerType || "C_AND_I",
      interconnectionStatus: project.interconnectionStatus || "UNKNOWN",
      permittingStatus: project.permittingStatus || "UNKNOWN",
      siteControlStatus: project.siteControlStatus || "NONE",
      feocAttested: project.feocAttested || false,
      ppaRate: project.ppaRate || "0",
      monthlyDebtService: project.monthlyDebtService || "0",
      monthlyOpex: project.monthlyOpex || "0",
      reserveRate: project.reserveRate || "0",
      sgtScoreNrel: project.sgtScoreNrel || null,
      eiaActualMwh: project.eiaActualMwh || null,
      validationConfidence: project.validationConfidence || null,
      eiaPlantCode: project.eiaPlantCode || null,
      eiaGeneratorId: project.eiaGeneratorId || null,
      eiaReferencePlantName: project.eiaReferencePlantName || null,
      queueEntryId: project.queueEntryId || null,
      financialApyPct: project.financialApyPct || null,
      marketPpaSource: project.marketPpaSource || null,
      marketPpaBenchmarkUsdPerMwh: project.marketPpaBenchmarkUsdPerMwh || null,
      externalLinks: (project.externalLinks ?? null) as any,
      imageUrl: project.imageUrl || null,
      imageAlt: project.imageAlt || null,
      imageCredit: project.imageCredit || null,
      imageLicense: project.imageLicense || null,
      arrayType: project.arrayType || null,
      commercialOperationDate: project.commercialOperationDate || null,
      contractTermRemainingYears: project.contractTermRemainingYears || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsByStatus(...statuses: string[]): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => statuses.includes(p.status));
  }

  // ─── Capital Stack ──────────────────────────────────────────────

  async getCapitalStack(projectId: string): Promise<CapitalStack | undefined> {
    return this.capitalStacks.get(projectId);
  }

  async createCapitalStack(cs: InsertCapitalStack): Promise<CapitalStack> {
    const id = randomUUID();
    const newCS: CapitalStack = {
      id,
      projectId: cs.projectId,
      totalCapex: cs.totalCapex || null,
      taxCreditType: cs.taxCreditType || "UNKNOWN",
      taxCreditEstimated: cs.taxCreditEstimated || null,
      taxCreditTransferabilityReady: cs.taxCreditTransferabilityReady || false,
      equityNeeded: cs.equityNeeded || null,
      debtPlaceholder: cs.debtPlaceholder || "0",
      notes: cs.notes || null,
    };
    this.capitalStacks.set(cs.projectId, newCS);
    return newCS;
  }

  async updateCapitalStack(projectId: string, updates: Partial<CapitalStack>): Promise<CapitalStack | undefined> {
    const cs = this.capitalStacks.get(projectId);
    if (!cs) return undefined;
    const updated = { ...cs, ...updates };
    this.capitalStacks.set(projectId, updated);
    return updated;
  }

  // ─── Readiness Score ────────────────────────────────────────────

  async getReadinessScore(projectId: string): Promise<ReadinessScore | undefined> {
    return this.readinessScores.get(projectId);
  }

  async createReadinessScore(score: InsertReadinessScore): Promise<ReadinessScore> {
    const id = randomUUID();
    const newScore: ReadinessScore = {
      id,
      projectId: score.projectId,
      score: score.score || 0,
      rating: score.rating || "RED",
      reasons: score.reasons || null,
      flags: score.flags || null,
      overriddenByAdmin: score.overriddenByAdmin || false,
      overrideNotes: score.overrideNotes || null,
    };
    this.readinessScores.set(score.projectId, newScore);
    return newScore;
  }

  async updateReadinessScore(projectId: string, updates: Partial<ReadinessScore>): Promise<ReadinessScore | undefined> {
    const score = this.readinessScores.get(projectId);
    if (!score) return undefined;
    const updated = { ...score, ...updates };
    this.readinessScores.set(projectId, updated);
    return updated;
  }

  // ─── Documents ──────────────────────────────────────────────────

  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(d => d.projectId === projectId);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const newDoc: Document = {
      id,
      projectId: doc.projectId,
      type: doc.type,
      filename: doc.filename,
      filePath: doc.filePath,
      uploadedBy: doc.uploadedBy,
      createdAt: new Date(),
    };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  // ─── Checklist ──────────────────────────────────────────────────

  async getChecklistByProject(projectId: string): Promise<DataRoomChecklistItem[]> {
    return Array.from(this.checklistItems.values()).filter(c => c.projectId === projectId);
  }

  async createChecklistItem(item: InsertDataRoomChecklistItem): Promise<DataRoomChecklistItem> {
    const id = randomUUID();
    const newItem: DataRoomChecklistItem = {
      id,
      projectId: item.projectId,
      key: item.key,
      label: item.label,
      required: item.required !== undefined ? item.required : true,
      status: item.status || "MISSING",
      notes: item.notes || null,
    };
    this.checklistItems.set(id, newItem);
    return newItem;
  }

  async updateChecklistItem(id: string, updates: Partial<DataRoomChecklistItem>): Promise<DataRoomChecklistItem | undefined> {
    const item = this.checklistItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.checklistItems.set(id, updated);
    return updated;
  }

  // ─── Portfolios ─────────────────────────────────────────────────

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    return this.portfolios.get(id);
  }

  async getPortfolioByShareToken(token: string): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find((p) => p.shareToken === token);
  }

  async getPortfoliosByOwner(ownerId: string): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values())
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const now = new Date();
    const created: Portfolio = {
      id,
      ownerId: portfolio.ownerId ?? null,
      name: portfolio.name || "Untitled portfolio",
      targetCheckSizeUsd: portfolio.targetCheckSizeUsd ?? "100000",
      allocations: (portfolio.allocations ?? []) as PortfolioAllocation[],
      shareToken: randomUUID().replace(/-/g, ""),
      createdAt: now,
      updatedAt: now,
    };
    this.portfolios.set(id, created);
    return created;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const existing = this.portfolios.get(id);
    if (!existing) return undefined;
    // shareToken and id are immutable: a shared link must keep resolving.
    const { id: _id, shareToken: _token, ...safe } = updates;
    const updated = { ...existing, ...safe, updatedAt: new Date() };
    this.portfolios.set(id, updated);
    return updated;
  }

  async deletePortfolio(id: string): Promise<void> {
    this.portfolios.delete(id);
  }

  async createFundInterest(interest: InsertFundInterest): Promise<FundInterest> {
    const id = randomUUID();
    const created: FundInterest = {
      id,
      userId: interest.userId ?? null,
      email: interest.email,
      checkSizeUsd: interest.checkSizeUsd ?? null,
      accreditationStatus: interest.accreditationStatus || "UNKNOWN",
      riskPreference: interest.riskPreference || "BALANCED",
      message: interest.message ?? null,
      sourcePortfolioId: interest.sourcePortfolioId ?? null,
      status: interest.status || "SUBMITTED",
      createdAt: new Date(),
    };
    this.fundInterests.set(id, created);
    return created;
  }

  async getAllFundInterests(): Promise<FundInterest[]> {
    return Array.from(this.fundInterests.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  // ─── Investor Interest ──────────────────────────────────────────

  async getInterestsByProject(projectId: string): Promise<InvestorInterest[]> {
    return Array.from(this.interests.values()).filter(i => i.projectId === projectId);
  }

  async getInterestsByInvestor(investorId: string): Promise<InvestorInterest[]> {
    return Array.from(this.interests.values()).filter(i => i.investorId === investorId);
  }

  async createInterest(interest: InsertInvestorInterest): Promise<InvestorInterest> {
    const id = randomUUID();
    const newInterest: InvestorInterest = {
      id,
      projectId: interest.projectId,
      investorId: interest.investorId,
      amountIntent: interest.amountIntent || null,
      structurePreference: interest.structurePreference || "UNKNOWN",
      timeline: interest.timeline || "UNKNOWN",
      message: interest.message || null,
      status: interest.status || "SUBMITTED",
      createdAt: new Date(),
    };
    this.interests.set(id, newInterest);
    return newInterest;
  }

  async updateInterest(id: string, updates: Partial<InvestorInterest>): Promise<InvestorInterest | undefined> {
    const interest = this.interests.get(id);
    if (!interest) return undefined;
    const updated = { ...interest, ...updates };
    this.interests.set(id, updated);
    return updated;
  }

  async getAllInterests(): Promise<InvestorInterest[]> {
    return Array.from(this.interests.values());
  }

  // ─── Approval Logs ─────────────────────────────────────────────

  async getApprovalLogs(projectId: string): Promise<ProjectApprovalLog[]> {
    return Array.from(this.approvalLogs.values())
      .filter(l => l.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createApprovalLog(log: InsertProjectApprovalLog): Promise<ProjectApprovalLog> {
    const id = randomUUID();
    const newLog: ProjectApprovalLog = {
      id,
      projectId: log.projectId,
      adminId: log.adminId,
      action: log.action,
      notes: log.notes || null,
      createdAt: new Date(),
    };
    this.approvalLogs.set(id, newLog);
    return newLog;
  }
  // ─── PPAs ──────────────────────────────────────────────────────

  async getPpasByProject(projectId: string): Promise<Ppa[]> {
    return Array.from(this.ppas.values()).filter(p => p.projectId === projectId);
  }

  async createPpa(ppa: InsertPpa): Promise<Ppa> {
    const id = randomUUID();
    const newPpa: Ppa = {
      id,
      projectId: ppa.projectId,
      offtakerName: ppa.offtakerName,
      contractStartDate: ppa.contractStartDate,
      contractEndDate: ppa.contractEndDate,
      pricePerMwh: ppa.pricePerMwh,
      escalationType: ppa.escalationType || "FIXED",
      escalationRate: ppa.escalationRate || "0",
      contractedCapacityMW: ppa.contractedCapacityMW,
      createdAt: new Date(),
    };
    this.ppas.set(id, newPpa);
    return newPpa;
  }

  // ─── Energy Production ────────────────────────────────────────

  async getProductionByProject(projectId: string): Promise<EnergyProduction[]> {
    return Array.from(this.productionRecords.values())
      .filter(p => p.projectId === projectId)
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
  }

  async createProduction(prod: InsertEnergyProduction): Promise<EnergyProduction> {
    const id = randomUUID();
    const newProd: EnergyProduction = {
      id,
      projectId: prod.projectId,
      periodStart: prod.periodStart,
      periodEnd: prod.periodEnd,
      productionMwh: prod.productionMwh,
      capacityFactor: prod.capacityFactor || null,
      source: prod.source || "MANUAL",
      createdAt: new Date(),
    };
    this.productionRecords.set(id, newProd);
    return newProd;
  }

  async bulkCreateProduction(records: InsertEnergyProduction[]): Promise<EnergyProduction[]> {
    const results: EnergyProduction[] = [];
    for (const prod of records) {
      results.push(await this.createProduction(prod));
    }
    return results;
  }

  async deleteProductionByProject(projectId: string): Promise<number> {
    let count = 0;
    for (const [id, prod] of this.productionRecords) {
      if (prod.projectId === projectId) {
        this.productionRecords.delete(id);
        count++;
      }
    }
    return count;
  }

  // ─── Revenue Records ─────────────────────────────────────────

  async getRevenueByProject(projectId: string): Promise<RevenueRecord[]> {
    return Array.from(this.revenueRecords.values())
      .filter(r => r.projectId === projectId)
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
  }

  async createRevenue(rev: InsertRevenueRecord): Promise<RevenueRecord> {
    const id = randomUUID();
    const newRev: RevenueRecord = {
      id,
      projectId: rev.projectId,
      ppaId: rev.ppaId,
      productionId: rev.productionId,
      periodStart: rev.periodStart,
      periodEnd: rev.periodEnd,
      grossRevenue: rev.grossRevenue,
      operatingExpenses: rev.operatingExpenses || "0",
      netRevenue: rev.netRevenue,
      createdAt: new Date(),
    };
    this.revenueRecords.set(id, newRev);
    return newRev;
  }

  // ─── Distributions ────────────────────────────────────────────

  async getDistributionsByProject(projectId: string): Promise<Distribution[]> {
    return Array.from(this.distributions.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createDistribution(dist: InsertDistribution): Promise<Distribution> {
    const id = randomUUID();
    const newDist: Distribution = {
      id,
      projectId: dist.projectId,
      periodLabel: dist.periodLabel,
      totalDistributable: dist.totalDistributable,
      investorShare: dist.investorShare,
      platformFee: dist.platformFee,
      status: dist.status || "PENDING",
      distributedAt: dist.distributedAt || null,
      createdAt: new Date(),
    };
    this.distributions.set(id, newDist);
    return newDist;
  }

  async updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined> {
    const dist = this.distributions.get(id);
    if (!dist) return undefined;
    const updated = { ...dist, ...updates };
    this.distributions.set(id, updated);
    return updated;
  }

  // ─── SCADA Data Sources ────────────────────────────────────────

  async getScadaDataSourcesByProject(projectId: string): Promise<ScadaDataSource[]> {
    return Array.from(this.scadaDataSources.values()).filter(s => s.projectId === projectId);
  }

  async getScadaDataSource(id: string): Promise<ScadaDataSource | undefined> {
    return this.scadaDataSources.get(id);
  }

  async createScadaDataSource(source: InsertScadaDataSource): Promise<ScadaDataSource> {
    const id = randomUUID();
    const newSource: ScadaDataSource = {
      id,
      projectId: source.projectId,
      sourceType: source.sourceType || "MANUAL",
      providerName: source.providerName || null,
      status: source.status || "PENDING",
      dataQuality: source.dataQuality || "UNKNOWN",
      lastSyncAt: source.lastSyncAt || null,
      recordCount: source.recordCount || 0,
      connectorId: source.connectorId || null,
      configJson: source.configJson || null,
      notes: source.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scadaDataSources.set(id, newSource);
    return newSource;
  }

  async updateScadaDataSource(id: string, updates: Partial<ScadaDataSource>): Promise<ScadaDataSource | undefined> {
    const source = this.scadaDataSources.get(id);
    if (!source) return undefined;
    const updated = { ...source, ...updates, updatedAt: new Date() };
    this.scadaDataSources.set(id, updated);
    return updated;
  }

  // ─── SCADA Connectors ─────────────────────────────────────────

  async getAllScadaConnectors(): Promise<ScadaConnector[]> {
    return Array.from(this.scadaConnectors.values());
  }

  async getScadaConnector(id: string): Promise<ScadaConnector | undefined> {
    return this.scadaConnectors.get(id);
  }

  async createScadaConnector(connector: InsertScadaConnector): Promise<ScadaConnector> {
    const id = randomUUID();
    const newConnector: ScadaConnector = {
      id,
      name: connector.name,
      slug: connector.slug,
      description: connector.description || null,
      status: connector.status || "COMING_SOON",
      logoUrl: connector.logoUrl || null,
      supportedTechnologies: connector.supportedTechnologies || null,
      configSchema: connector.configSchema || null,
      createdAt: new Date(),
    };
    this.scadaConnectors.set(id, newConnector);
    return newConnector;
  }

  // ─── SGT: Meters ──────────────────────────────────────────────

  async getMetersByProject(projectId: string): Promise<Meter[]> {
    return Array.from(this.metersMap.values()).filter(m => m.projectId === projectId);
  }

  async getMeter(id: string): Promise<Meter | undefined> {
    return this.metersMap.get(id);
  }

  async createMeter(meter: InsertMeter): Promise<Meter> {
    const id = randomUUID();
    const newMeter: Meter = {
      id,
      projectId: meter.projectId,
      meterType: meter.meterType || "NET",
      provider: meter.provider || "MANUAL",
      providerUid: meter.providerUid || null,
      name: meter.name || null,
      timezone: meter.timezone || "UTC",
      isActive: meter.isActive !== undefined ? meter.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.metersMap.set(id, newMeter);
    return newMeter;
  }

  async updateMeter(id: string, updates: Partial<Meter>): Promise<Meter | undefined> {
    const meter = this.metersMap.get(id);
    if (!meter) return undefined;
    const updated = { ...meter, ...updates, updatedAt: new Date() };
    this.metersMap.set(id, updated);
    return updated;
  }

  // ─── SGT: Intervals ──────────────────────────────────────────

  async getSgtIntervalsByMeter(meterId: string): Promise<SgtInterval[]> {
    return Array.from(this.sgtIntervalsMap.values()).filter(i => i.meterId === meterId);
  }

  async createSgtInterval(interval: InsertSgtInterval): Promise<SgtInterval> {
    const id = this.sgtIntervalSeq++;
    const newInterval: SgtInterval = {
      id,
      meterId: interval.meterId,
      intervalStart: interval.intervalStart,
      intervalEnd: interval.intervalEnd,
      netWh: interval.netWh || null,
      expectedGrossWh: interval.expectedGrossWh || null,
      syntheticGrossWh: interval.syntheticGrossWh || null,
      irradianceWm2: interval.irradianceWm2 || null,
      source: interval.source || "CALCULATED",
      qualityFlag: interval.qualityFlag || null,
      settledAt: null,
      createdAt: new Date(),
    };
    this.sgtIntervalsMap.set(id, newInterval);
    return newInterval;
  }

  // ─── SGT: Accounts ───────────────────────────────────────────

  async getAccountsByProject(projectId: string): Promise<Account[]> {
    return Array.from(this.accountsMap.values()).filter(a => a.projectId === projectId);
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return this.accountsMap.get(id);
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const newAccount: Account = {
      id,
      projectId: account.projectId,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      denominatedIn: account.denominatedIn || "Wh",
      isActive: account.isActive !== undefined ? account.isActive : true,
      createdAt: new Date(),
    };
    this.accountsMap.set(id, newAccount);
    return newAccount;
  }

  // ─── SGT: Transactions ───────────────────────────────────────

  async getTransactionsByProject(projectId: string): Promise<Transaction[]> {
    return Array.from(this.transactionsMap.values()).filter(t => t.projectId === projectId);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactionsMap.get(id);
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const newTx: Transaction = {
      id,
      projectId: tx.projectId,
      intervalId: tx.intervalId || null,
      memo: tx.memo || null,
      status: tx.status || "PENDING",
      occurredAt: tx.occurredAt,
      createdAt: new Date(),
    };
    this.transactionsMap.set(id, newTx);
    return newTx;
  }

  // ─── SGT: Postings ───────────────────────────────────────────

  async getPostingsByTransaction(transactionId: string): Promise<Posting[]> {
    return Array.from(this.postingsMap.values()).filter(p => p.transactionId === transactionId);
  }

  async createPosting(posting: InsertPosting): Promise<Posting> {
    const id = this.postingSeq++;
    const newPosting: Posting = {
      id,
      transactionId: posting.transactionId,
      accountId: posting.accountId,
      amount: posting.amount,
      direction: posting.direction,
      createdAt: new Date(),
    };
    this.postingsMap.set(id, newPosting);
    return newPosting;
  }

  // ─── Interconnection queue (demo / MemStorage) ─────────────────────────────

  async getAllInterconnectionQueueEntries(): Promise<InterconnectionQueueEntry[]> {
    return Array.from(this.interconnectionQueueEntries.values());
  }

  async getInterconnectionQueueEntry(id: string): Promise<InterconnectionQueueEntry | undefined> {
    return this.interconnectionQueueEntries.get(id);
  }

  async getQueueEntryAnalyticsByEntryId(entryId: string): Promise<QueueEntryAnalytics | undefined> {
    return this.queueEntryAnalytics.get(entryId);
  }

  async getAllQueueEntryAnalytics(): Promise<QueueEntryAnalytics[]> {
    return Array.from(this.queueEntryAnalytics.values());
  }

  async upsertQueueEntryAnalytics(
    row: Partial<QueueEntryAnalytics> & { entryId: string },
  ): Promise<QueueEntryAnalytics> {
    const existing = this.queueEntryAnalytics.get(row.entryId);
    const id = existing?.id ?? randomUUID();
    const merged: QueueEntryAnalytics = {
      id,
      entryId: row.entryId,
      backtestSummary: (row.backtestSummary ?? existing?.backtestSummary ?? null) as any,
      annualMwhModeled: row.annualMwhModeled ?? existing?.annualMwhModeled ?? null,
      annualKwhNsrdb: row.annualKwhNsrdb ?? existing?.annualKwhNsrdb ?? null,
      irrProxyPct: row.irrProxyPct ?? existing?.irrProxyPct ?? null,
      moicProxy: row.moicProxy ?? existing?.moicProxy ?? null,
      ppaScenario: (row.ppaScenario ?? existing?.ppaScenario ?? null) as any,
      waterfallSummary: (row.waterfallSummary ?? existing?.waterfallSummary ?? null) as any,
      monthlyWaterfallSeries: (row.monthlyWaterfallSeries ?? existing?.monthlyWaterfallSeries ?? null) as any,
      engineVersion: row.engineVersion ?? existing?.engineVersion ?? "1",
      computeStatus: row.computeStatus ?? existing?.computeStatus ?? "PENDING",
      errorMessage: row.errorMessage !== undefined ? row.errorMessage : existing?.errorMessage ?? null,
      computedAt: row.computedAt ?? existing?.computedAt ?? null,
    };
    this.queueEntryAnalytics.set(row.entryId, merged);
    return merged;
  }

  // ── Verification engine ────────────────────────────────────────────────

  async createIrradianceSnapshot(snapshot: InsertIrradianceSnapshot): Promise<IrradianceSnapshot> {
    const key = `${snapshot.projectId}|${new Date(snapshot.intervalStart).toISOString()}|${snapshot.satelliteSource}`;
    for (const existing of this.irradianceSnapshotsMap.values()) {
      const ek = `${existing.projectId}|${new Date(existing.intervalStart).toISOString()}|${existing.satelliteSource}`;
      if (ek === key) return existing;
    }
    const id = this.irradianceSnapshotSeq++;
    const row: IrradianceSnapshot = {
      id,
      projectId: snapshot.projectId,
      meterId: snapshot.meterId ?? null,
      latitude: snapshot.latitude ?? null,
      longitude: snapshot.longitude ?? null,
      capacityKw: snapshot.capacityKw,
      pvEstimateKw: snapshot.pvEstimateKw,
      irradianceWm2: snapshot.irradianceWm2 ?? null,
      intervalStart: new Date(snapshot.intervalStart),
      intervalEnd: new Date(snapshot.intervalEnd),
      satelliteSource: snapshot.satelliteSource,
      fetchedAt: new Date(),
      rawResponseHash: snapshot.rawResponseHash,
      rawResponseJson: (snapshot.rawResponseJson ?? null) as any,
    };
    this.irradianceSnapshotsMap.set(id, row);
    return row;
  }

  async getIrradianceSnapshots(projectId: string, from?: Date, to?: Date): Promise<IrradianceSnapshot[]> {
    return Array.from(this.irradianceSnapshotsMap.values())
      .filter((s) => {
        if (s.projectId !== projectId) return false;
        if (from && s.intervalStart < from) return false;
        if (to && s.intervalStart > to) return false;
        return true;
      })
      .sort((a, b) => a.intervalStart.getTime() - b.intervalStart.getTime());
  }

  async getIrradianceSnapshotForInterval(projectId: string, intervalStart: Date): Promise<IrradianceSnapshot | undefined> {
    const ts = new Date(intervalStart).getTime();
    const sourceRank: Record<string, number> = {
      SOLCAST_HISTORICAL: 4,
      SOLCAST_LIVE: 3,
      SOLCAST_ESTIMATED_ACTUALS: 2,
      SYNTHETIC_FALLBACK: 1,
    };
    const candidates = Array.from(this.irradianceSnapshotsMap.values()).filter(
      (s) => s.projectId === projectId && new Date(s.intervalStart).getTime() === ts,
    );
    candidates.sort((a, b) => (sourceRank[b.satelliteSource] ?? 0) - (sourceRank[a.satelliteSource] ?? 0));
    return candidates[0];
  }

  async createVerificationRun(run: InsertVerificationRun): Promise<VerificationRun> {
    const periodStartIso = new Date(run.periodStart).toISOString();
    for (const existing of this.verificationRunsMap.values()) {
      if (
        existing.projectId === run.projectId &&
        existing.granularity === run.granularity &&
        existing.periodStart.toISOString() === periodStartIso
      ) {
        return existing;
      }
    }
    const id = randomUUID();
    const row: VerificationRun = {
      id,
      projectId: run.projectId,
      intervalId: run.intervalId ?? null,
      granularity: run.granularity,
      periodStart: new Date(run.periodStart),
      periodEnd: new Date(run.periodEnd),
      expectedKwh: run.expectedKwh,
      actualKwh: run.actualKwh,
      variancePct: run.variancePct,
      tolerancePct: run.tolerancePct,
      ppaRateUsdPerKwh: run.ppaRateUsdPerKwh,
      ppaSource: run.ppaSource,
      offtakerClass: run.offtakerClass,
      plantUse: run.plantUse,
      grossRevenueUsd: run.grossRevenueUsd,
      status: run.status ?? "PENDING",
      evidenceHash: run.evidenceHash,
      settledTransactionId: run.settledTransactionId ?? null,
      runAt: new Date(),
      clearedAt: null,
      settledAt: null,
      notes: run.notes ?? null,
    };
    this.verificationRunsMap.set(id, row);
    return row;
  }

  async getVerificationRun(id: string): Promise<VerificationRun | undefined> {
    return this.verificationRunsMap.get(id);
  }

  async getVerificationRuns(
    projectId: string,
    filters?: { from?: Date; to?: Date; status?: string; granularity?: string; limit?: number },
  ): Promise<VerificationRun[]> {
    const rows = Array.from(this.verificationRunsMap.values())
      .filter((r) => {
        if (r.projectId !== projectId) return false;
        if (filters?.from && r.periodStart < filters.from) return false;
        if (filters?.to && r.periodStart > filters.to) return false;
        if (filters?.status && r.status !== filters.status) return false;
        if (filters?.granularity && r.granularity !== filters.granularity) return false;
        return true;
      })
      .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime());
    return filters?.limit ? rows.slice(0, filters.limit) : rows;
  }

  async getVerificationRunByInterval(intervalId: number): Promise<VerificationRun | undefined> {
    for (const r of this.verificationRunsMap.values()) {
      if (r.intervalId === intervalId) return r;
    }
    return undefined;
  }

  async updateVerificationRun(id: string, updates: Partial<VerificationRun>): Promise<VerificationRun | undefined> {
    const existing = this.verificationRunsMap.get(id);
    if (!existing) return undefined;
    const merged: VerificationRun = { ...existing, ...updates };
    this.verificationRunsMap.set(id, merged);
    return merged;
  }

  async createAnomalyFlag(flag: InsertAnomalyFlag): Promise<AnomalyFlag> {
    // Hard guard: ML scorer flags can never be BLOCK severity.
    if (flag.ruleCode === "ML_SCORER" && flag.severity === "BLOCK") {
      throw new Error("ML_SCORER flags cannot have BLOCK severity (advisory only)");
    }
    const id = this.anomalyFlagSeq++;
    const row: AnomalyFlag = {
      id,
      verificationRunId: flag.verificationRunId,
      ruleCode: flag.ruleCode,
      severity: flag.severity,
      detail: flag.detail as any,
      raisedAt: new Date(),
      clearedAt: null,
      clearedBy: flag.clearedBy ?? null,
      clearedReason: flag.clearedReason ?? null,
    };
    this.anomalyFlagsMap.set(id, row);
    return row;
  }

  async getAnomalyFlagsByRun(runId: string): Promise<AnomalyFlag[]> {
    return Array.from(this.anomalyFlagsMap.values())
      .filter((f) => f.verificationRunId === runId)
      .sort((a, b) => a.raisedAt.getTime() - b.raisedAt.getTime());
  }

  async updateAnomalyFlag(id: number, updates: Partial<AnomalyFlag>): Promise<AnomalyFlag | undefined> {
    const existing = this.anomalyFlagsMap.get(id);
    if (!existing) return undefined;
    const merged: AnomalyFlag = { ...existing, ...updates };
    this.anomalyFlagsMap.set(id, merged);
    return merged;
  }

  async getOpenAnomalies(projectId: string): Promise<AnomalyFlag[]> {
    const projectRunIds = new Set(
      Array.from(this.verificationRunsMap.values())
        .filter((r) => r.projectId === projectId)
        .map((r) => r.id),
    );
    return Array.from(this.anomalyFlagsMap.values())
      .filter((f) => projectRunIds.has(f.verificationRunId) && f.clearedAt == null)
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime());
  }

  // ── Marketplace meta ───────────────────────────────────────────────────

  async getMarketplaceMeta(key: string): Promise<MarketplaceMeta | undefined> {
    return this.marketplaceMetaMap.get(key);
  }

  async upsertMarketplaceMeta(row: InsertMarketplaceMeta): Promise<MarketplaceMeta> {
    const existing = this.marketplaceMetaMap.get(row.key);
    const merged: MarketplaceMeta = {
      id: existing?.id ?? this.marketplaceMetaSeq++,
      key: row.key,
      refreshedAt: row.refreshedAt ?? existing?.refreshedAt ?? null,
      listingCount: row.listingCount ?? existing?.listingCount ?? 0,
      lastRunStatus: row.lastRunStatus ?? existing?.lastRunStatus ?? null,
      lastRunError: row.lastRunError ?? existing?.lastRunError ?? null,
      computedAt: new Date(),
    };
    this.marketplaceMetaMap.set(row.key, merged);
    return merged;
  }
}

export const storage = new MemStorage();
