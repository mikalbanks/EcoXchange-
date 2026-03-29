import { randomUUID } from "crypto";
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
  private postingSeq: number = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    const adminId = randomUUID();
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

    const devId = randomUUID();
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

    const investorId = randomUUID();
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
      name: "Sunfield Solar I",
      technology: "SOLAR",
      stage: "NTP",
      country: "US",
      state: "Texas",
      county: "Travis",
      latitude: "30.2672",
      longitude: "-97.7431",
      capacityMW: "4.50",
      capacityKw: "4500",
      status: "APPROVED",
      summary: "A 4.5MW community solar project in Central Texas with executed IA and approved permits. Ready for construction financing.",
      offtakerType: "UTILITY",
      interconnectionStatus: "IA_EXECUTED",
      permittingStatus: "APPROVED",
      siteControlStatus: "LEASE",
      feocAttested: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs1Id = randomUUID();
    this.capitalStacks.set(proj1Id, {
      id: cs1Id,
      projectId: proj1Id,
      totalCapex: "5200000",
      taxCreditType: "ITC",
      taxCreditEstimated: "1560000",
      taxCreditTransferabilityReady: true,
      equityNeeded: "3640000",
      debtPlaceholder: "0",
      notes: "30% ITC eligible. Transferability confirmed.",
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
      name: "Desert Sun Community Solar",
      technology: "SOLAR_STORAGE",
      stage: "PRE_NTP",
      country: "US",
      state: "Arizona",
      county: "Maricopa",
      latitude: "33.4484",
      longitude: "-112.0740",
      capacityMW: "2.80",
      capacityKw: "2800",
      status: "SUBMITTED",
      summary: "A 2.8MW community solar + storage project in suburban Phoenix. Early stage, seeking development partners.",
      offtakerType: "COMMUNITY_SOLAR",
      interconnectionStatus: "APPLIED",
      permittingStatus: "IN_PROGRESS",
      siteControlStatus: "LOI",
      feocAttested: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs2Id = randomUUID();
    this.capitalStacks.set(proj2Id, {
      id: cs2Id,
      projectId: proj2Id,
      totalCapex: "3100000",
      taxCreditType: "ITC",
      taxCreditEstimated: "930000",
      taxCreditTransferabilityReady: false,
      equityNeeded: "2170000",
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
    const ppaId = randomUUID();
    const now = new Date();
    this.ppas.set(ppaId, {
      id: ppaId,
      projectId: proj1Id,
      offtakerName: "Austin Energy",
      contractStartDate: new Date(now.getFullYear() - 1, 0, 1),
      contractEndDate: new Date(now.getFullYear() + 19, 11, 31),
      pricePerMwh: "42.50",
      escalationType: "ESCALATING",
      escalationRate: "2.00",
      contractedCapacityMW: "4.50",
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMwh = [420, 480, 600, 720, 810, 850, 870, 830, 690, 560, 440, 390];

    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(now.getFullYear() - 1, i, 1);
      const periodEnd = new Date(now.getFullYear() - 1, i + 1, 0);
      const prodId = randomUUID();
      const mwh = monthlyMwh[i];
      const capacityFactor = (mwh / (4.5 * periodEnd.getDate() * 24)).toFixed(4);

      this.productionRecords.set(prodId, {
        id: prodId,
        projectId: proj1Id,
        periodStart,
        periodEnd,
        productionMwh: mwh.toString(),
        capacityFactor,
        source: "SCADA",
        createdAt: periodEnd,
      });

      const rev = computeRevenue(
        this.productionRecords.get(prodId)!,
        this.ppas.get(ppaId)!
      );
      const revId = randomUUID();
      this.revenueRecords.set(revId, {
        id: revId,
        projectId: proj1Id,
        ppaId: ppaId,
        productionId: prodId,
        periodStart,
        periodEnd,
        grossRevenue: rev.grossRevenue.toString(),
        operatingExpenses: rev.operatingExpenses.toString(),
        netRevenue: rev.netRevenue.toString(),
        createdAt: periodEnd,
      });

      const dist = computeDistribution(rev.netRevenue);
      const distId = randomUUID();
      this.distributions.set(distId, {
        id: distId,
        projectId: proj1Id,
        periodLabel: `${months[i]} ${now.getFullYear() - 1}`,
        totalDistributable: dist.totalDistributable.toString(),
        investorShare: dist.investorShare.toString(),
        platformFee: dist.platformFee.toString(),
        status: i < 11 ? "DISTRIBUTED" : "APPROVED",
        distributedAt: i < 11 ? new Date(now.getFullYear() - 1, i + 1, 15) : null,
        createdAt: periodEnd,
      });
    }

    // ─── Project 3: Colorado Sun CdTe I (PVDAQ-backed, real data) ────
    const proj3Id = "proj3";
    this.projects.set(proj3Id, {
      id: proj3Id,
      developerId: devId,
      name: "Colorado Sun CdTe I",
      technology: "SOLAR",
      stage: "COD",
      country: "US",
      state: "Colorado",
      county: "Adams",
      latitude: "39.8561",
      longitude: "-104.6737",
      capacityMW: "4.70",
      capacityKw: "4700",
      status: "APPROVED",
      summary: "A 4.7MW cadmium telluride (CdTe) thin-film solar facility in eastern Colorado with 6+ years of verified SCADA production history. Single-axis tracking, utility PPA with Xcel Energy. Returns derived from actual NREL PVDAQ telemetry data.",
      offtakerType: "UTILITY",
      interconnectionStatus: "IA_EXECUTED",
      permittingStatus: "APPROVED",
      siteControlStatus: "OWNED",
      feocAttested: true,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const cs3Id = randomUUID();
    this.capitalStacks.set(proj3Id, {
      id: cs3Id,
      projectId: proj3Id,
      totalCapex: "5875000",
      taxCreditType: "ITC",
      taxCreditEstimated: "1762500",
      taxCreditTransferabilityReady: true,
      equityNeeded: "4112500",
      debtPlaceholder: "0",
      notes: "30% ITC eligible. Operational asset with verified production history. Transferability confirmed.",
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
    const doc3Names = ["deed_of_trust.pdf", "ia_executed_xcel.pdf", "adams_county_permit.pdf", "financial_model_v4.xlsx", "feoc_attestation_signed.pdf", "epc_completion_cert.pdf", "ppa_xcel_energy.pdf"];
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
      notes: "Operational asset with verified PVDAQ production data. Approved for investor visibility.",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    // ─── Yield Pipeline for Project 3 (PVDAQ-derived actuals) ────
    const ppa3Id = randomUUID();
    this.ppas.set(ppa3Id, {
      id: ppa3Id,
      projectId: proj3Id,
      offtakerName: "Xcel Energy",
      contractStartDate: new Date(now.getFullYear() - 1, 0, 1),
      contractEndDate: new Date(now.getFullYear() + 19, 11, 31),
      pricePerMwh: "85.00",
      escalationType: "ESCALATING",
      escalationRate: "1.50",
      contractedCapacityMW: "4.70",
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    });

    // Monthly production from NREL PVDAQ system 9068 averages (6+ years of real data)
    const pvdaqMonthlyMwh = [388, 493, 669, 813, 807, 869, 956, 790, 714, 592, 398, 372];

    for (let i = 0; i < 12; i++) {
      const p3Start = new Date(now.getFullYear() - 1, i, 1);
      const p3End = new Date(now.getFullYear() - 1, i + 1, 0);
      const p3ProdId = randomUUID();
      const p3Mwh = pvdaqMonthlyMwh[i];
      const p3Cf = (p3Mwh / (4.7 * p3End.getDate() * 24)).toFixed(4);

      this.productionRecords.set(p3ProdId, {
        id: p3ProdId,
        projectId: proj3Id,
        periodStart: p3Start,
        periodEnd: p3End,
        productionMwh: p3Mwh.toString(),
        capacityFactor: p3Cf,
        source: "SCADA",
        createdAt: p3End,
      });

      const rev3 = computeRevenue(
        this.productionRecords.get(p3ProdId)!,
        this.ppas.get(ppa3Id)!
      );
      const rev3Id = randomUUID();
      this.revenueRecords.set(rev3Id, {
        id: rev3Id,
        projectId: proj3Id,
        ppaId: ppa3Id,
        productionId: p3ProdId,
        periodStart: p3Start,
        periodEnd: p3End,
        grossRevenue: rev3.grossRevenue.toString(),
        operatingExpenses: rev3.operatingExpenses.toString(),
        netRevenue: rev3.netRevenue.toString(),
        createdAt: p3End,
      });

      const dist3 = computeDistribution(rev3.netRevenue);
      const dist3Id = randomUUID();
      this.distributions.set(dist3Id, {
        id: dist3Id,
        projectId: proj3Id,
        periodLabel: `${months[i]} ${now.getFullYear() - 1}`,
        totalDistributable: dist3.totalDistributable.toString(),
        investorShare: dist3.investorShare.toString(),
        platformFee: dist3.platformFee.toString(),
        status: i < 11 ? "DISTRIBUTED" : "APPROVED",
        distributedAt: i < 11 ? new Date(now.getFullYear() - 1, i + 1, 15) : null,
        createdAt: p3End,
      });
    }

    // Investor interest on project 3
    const int3Id = randomUUID();
    this.interests.set(int3Id, {
      id: int3Id,
      projectId: proj3Id,
      investorId: investorId,
      amountIntent: "750000",
      structurePreference: "EQUITY",
      timeline: "IMMEDIATE",
      message: "Strong interest in the verified production profile. 6 years of PVDAQ data gives us confidence in the yield projections. Requesting data room access.",
      status: "SUBMITTED",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    // ─── SCADA Connector Placeholders ────────────────────────────────
    const connectors = [
      { name: "AlsoEnergy", slug: "alsoenergy", description: "Enterprise-grade solar monitoring and asset management platform. Supports utility-scale and C&I portfolios.", status: "COMING_SOON", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
      { name: "Enphase", slug: "enphase", description: "Microinverter-based monitoring for residential and small commercial solar installations.", status: "COMING_SOON", supportedTechnologies: "SOLAR" },
      { name: "SolarEdge", slug: "solaredge", description: "Power optimizer and inverter monitoring platform for residential, C&I, and utility-scale systems.", status: "COMING_SOON", supportedTechnologies: "SOLAR,SOLAR_STORAGE" },
      { name: "NREL PVDAQ", slug: "pvdaq", description: "NREL Photovoltaic Data Acquisition system providing verified historical telemetry from research-grade installations.", status: "AVAILABLE", supportedTechnologies: "SOLAR" },
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

    const pvdaqConnector = Array.from(this.scadaConnectors.values()).find(c => c.slug === "pvdaq");

    // ─── SCADA Data Sources per Project ──────────────────────────────
    const ds1Id = randomUUID();
    this.scadaDataSources.set(ds1Id, {
      id: ds1Id,
      projectId: proj1Id,
      sourceType: "MANUAL",
      providerName: "Manual Entry",
      status: "ACTIVE",
      dataQuality: "MEDIUM",
      lastSyncAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      recordCount: 12,
      connectorId: null,
      configJson: null,
      notes: "Monthly production data entered manually from inverter reports.",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
      sourceType: "PVDAQ_VERIFIED",
      providerName: "NREL PVDAQ (System 9068)",
      status: "ACTIVE",
      dataQuality: "HIGH",
      lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      recordCount: 12,
      connectorId: pvdaqConnector?.id || null,
      configJson: JSON.stringify({ systemId: 9068, capacityKw: 4700, technology: "CdTe", trackingType: "Single-Axis" }),
      notes: "Verified telemetry from NREL PVDAQ system 9068. 6+ years of research-grade production data.",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });
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
}

export const storage = new MemStorage();
