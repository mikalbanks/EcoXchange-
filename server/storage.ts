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
} from "@shared/schema";

function hashPassword(password: string): string {
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
}

// ─── Readiness Scoring Engine ────────────────────────────────────────────────

export function computeReadiness(
  project: Project,
  documents: Document[],
  checklist: DataRoomChecklistItem[],
  capitalStack: CapitalStack | undefined
): { score: number; rating: string; reasons: string[]; flags: Record<string, boolean> } {
  let score = 100;
  const reasons: string[] = [];
  const flags: Record<string, boolean> = {
    feocRisk: false,
    missingDocs: false,
    interconnectionRisk: false,
    permittingRisk: false,
    siteControlRisk: false,
    offtakerRisk: false,
  };

  // Site control deductions
  switch (project.siteControlStatus) {
    case "NONE": score -= 25; reasons.push("No site control (-25): Obtain at minimum a LOI or Option agreement"); flags.siteControlRisk = true; break;
    case "LOI": score -= 15; reasons.push("Site control is LOI only (-15): Upgrade to Option or Lease"); break;
    case "OPTION": score -= 8; reasons.push("Site control is Option (-8): Consider upgrading to Lease"); break;
  }

  // Interconnection deductions
  switch (project.interconnectionStatus) {
    case "UNKNOWN": score -= 20; reasons.push("Interconnection status unknown (-20): Submit interconnection application"); flags.interconnectionRisk = true; break;
    case "APPLIED": score -= 15; reasons.push("Interconnection application submitted (-15): Await study results"); break;
    case "STUDY": score -= 10; reasons.push("Interconnection in study phase (-10): Work toward IA execution"); break;
    case "IA_EXECUTED": score -= 3; reasons.push("IA executed (-3): Proceed to construction readiness"); break;
  }

  // Permitting deductions
  switch (project.permittingStatus) {
    case "UNKNOWN": score -= 15; reasons.push("Permitting status unknown (-15): Begin permitting process"); flags.permittingRisk = true; break;
    case "IN_PROGRESS": score -= 10; reasons.push("Permitting in progress (-10): Complete and submit permit applications"); break;
    case "SUBMITTED": score -= 5; reasons.push("Permits submitted (-5): Await approval"); break;
  }

  // Offtaker deductions
  switch (project.offtakerType) {
    case "MERCHANT": score -= 12; reasons.push("Merchant offtaker (-12): Higher revenue risk without contracted buyer"); flags.offtakerRisk = true; break;
    case "COMMUNITY_SOLAR": score -= 6; reasons.push("Community solar offtaker (-6): Moderate subscriber acquisition risk"); break;
    case "C_AND_I": score -= 4; reasons.push("C&I offtaker (-4): Verify creditworthiness of counterparty"); break;
    case "UTILITY": score -= 2; reasons.push("Utility offtaker (-2): Strong counterparty, minimal risk"); break;
  }

  // Document completeness
  const missingRequired = checklist.filter(item => item.required && item.status === "MISSING");
  const docDeduction = Math.min(missingRequired.length * 3, 24);
  if (docDeduction > 0) {
    score -= docDeduction;
    reasons.push(`${missingRequired.length} required documents missing (-${docDeduction}): Upload outstanding items`);
    flags.missingDocs = true;
  }

  // Tax credit readiness
  if (capitalStack) {
    const taxCreditEst = Number(capitalStack.taxCreditEstimated) || 0;
    if (taxCreditEst <= 0) {
      score -= 8;
      reasons.push("Tax credit estimate missing (-8): Provide estimated tax credit value");
    }
    if (!capitalStack.taxCreditTransferabilityReady) {
      score -= 6;
      reasons.push("Tax credit transferability not ready (-6): Confirm transferability eligibility");
    }
  } else {
    score -= 14;
    reasons.push("No capital stack defined (-14): Complete financial information");
  }

  // FEOC risk
  if (!project.feocAttested) {
    score -= 8;
    reasons.push("FEOC attestation not provided (-8): Complete FEOC compliance attestation");
    flags.feocRisk = true;
  }

  score = Math.max(0, score);

  // Determine rating
  const hasFatalFlag = project.siteControlStatus === "NONE" ||
    (project.interconnectionStatus === "UNKNOWN" && (project.stage === "NTP" || project.stage === "CONSTRUCTION"));

  let rating: string;
  if (score >= 75 && !hasFatalFlag) {
    rating = "GREEN";
  } else if (score < 50 || hasFatalFlag) {
    rating = "RED";
  } else {
    rating = "YELLOW";
  }

  // Sort reasons by deduction size (largest first) and take top 5
  const topReasons = reasons.slice(0, 5);

  return { score, rating, reasons: topReasons, flags };
}

// ─── Checklist Generation ────────────────────────────────────────────────────

export function generateChecklist(project: Project): Array<{ key: string; label: string; required: boolean }> {
  const items: Array<{ key: string; label: string; required: boolean }> = [
    { key: "site_control", label: "Site Control Documentation (LOI/Option/Lease)", required: true },
    { key: "interconnection", label: "Interconnection Application / Status Evidence", required: true },
    { key: "permitting", label: "Permitting Evidence", required: true },
    { key: "financial_model", label: "Basic Financial Model", required: true },
    { key: "feoc_attestation", label: "FEOC Compliance Attestation", required: true },
  ];

  const stage = project.stage;
  if (stage === "NTP" || stage === "CONSTRUCTION" || stage === "COD") {
    items.push({ key: "epc_contract", label: "EPC Contract or Term Sheet", required: true });
    items.push({ key: "insurance", label: "Insurance Evidence", required: false });
  }

  return items;
}

// ─── Capital Stack Engine ────────────────────────────────────────────────────

export function computeCapitalStack(totalCapex: number, taxCreditEstimated: number): { equityNeeded: number; debtPlaceholder: number } {
  return {
    equityNeeded: Math.max(totalCapex - taxCreditEstimated, 0),
    debtPlaceholder: 0,
  };
}

// ─── Yield Computation Engine ─────────────────────────────────────────────────

export function computeRevenue(
  production: EnergyProduction,
  ppa: Ppa
): { grossRevenue: number; netRevenue: number; operatingExpenses: number } {
  const mwh = parseFloat(production.productionMwh);
  const pricePerMwh = parseFloat(ppa.pricePerMwh);
  const grossRevenue = mwh * pricePerMwh;
  const opexRate = 0.15;
  const operatingExpenses = grossRevenue * opexRate;
  const netRevenue = grossRevenue - operatingExpenses;
  return { grossRevenue: Math.round(grossRevenue * 100) / 100, netRevenue: Math.round(netRevenue * 100) / 100, operatingExpenses: Math.round(operatingExpenses * 100) / 100 };
}

export function computeDistribution(
  netRevenue: number,
  platformFeeRate: number = 0.0075
): { totalDistributable: number; investorShare: number; platformFee: number } {
  const platformFee = Math.round(netRevenue * platformFeeRate * 100) / 100;
  const investorShare = Math.round((netRevenue - platformFee) * 100) / 100;
  return { totalDistributable: netRevenue, investorShare, platformFee };
}

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
    const proj1Id = randomUUID();
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
    const proj2Id = randomUUID();
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
}

export const storage = new MemStorage();
