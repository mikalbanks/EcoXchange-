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
}

import { computeReadiness, generateChecklist, computeCapitalStack, computeRevenue, computeDistribution } from "./scoring-engine";
import { catalogProjectsAtLeast1Mw, catalogOfferings } from "@shared/catalog-projects";
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

    const offeringSlugs = new Set(catalogOfferings(25).map((r) => r.slug));
    const catalogRows = catalogProjectsAtLeast1Mw();
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (const row of catalogRows) {
      const projectId = row.slug;
      const capacityMwNum = parseFloat(row.capacityMW || "0");
      const capacityKwStr = (capacityMwNum * 1000).toFixed(0);
      const isApprovedOffering = offeringSlugs.has(projectId);

      this.projects.set(projectId, {
        id: projectId,
        developerId: devId,
        name: row.name,
        technology: row.technology,
        stage: row.stage,
        country: "US",
        state: row.state,
        county: row.county,
        latitude: row.latitude,
        longitude: row.longitude,
        capacityMW: row.capacityMW,
        capacityKw: capacityKwStr,
        status: isApprovedOffering ? "APPROVED" : "SUBMITTED",
        summary: row.summary,
        offtakerType: row.offtakerType,
        interconnectionStatus: row.interconnectionStatus,
        permittingStatus: row.permittingStatus,
        siteControlStatus: row.siteControlStatus,
        feocAttested: row.feocAttested,
        ppaRate: row.ppaRate,
        monthlyDebtService: row.monthlyDebtService,
        monthlyOpex: row.monthlyOpex,
        reserveRate: row.reserveRate,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });

      const csId = randomUUID();
      this.capitalStacks.set(projectId, {
        id: csId,
        projectId,
        totalCapex: row.totalCapex,
        taxCreditType: row.taxCreditType,
        taxCreditEstimated: row.taxCreditEstimated,
        taxCreditTransferabilityReady: row.taxCreditTransferabilityReady,
        equityNeeded: row.equityNeeded,
        debtPlaceholder: "0",
        notes: row.capitalNotes,
      });

      const checklistDefs = generateChecklist(this.projects.get(projectId)!);
      const uploadedKeys = isApprovedOffering
        ? checklistDefs.map((c) => c.key)
        : ["interconnection", "financial_model", "site_control"];

      for (const item of checklistDefs) {
        const itemId = randomUUID();
        this.checklistItems.set(itemId, {
          id: itemId,
          projectId,
          key: item.key,
          label: item.label,
          required: item.required,
          status: uploadedKeys.includes(item.key) ? "UPLOADED" : "MISSING",
          notes: null,
        });
      }

      if (isApprovedOffering) {
        const docTypes = ["SITE_CONTROL", "INTERCONNECTION", "PERMITS", "FINANCIAL_MODEL", "FEOC_ATTESTATION", "EPC", "PPA"];
        const docNames = docTypes.map((t) => `${projectId}_${t.toLowerCase()}.pdf`);
        for (let i = 0; i < docTypes.length; i++) {
          const docId = randomUUID();
          this.documents.set(docId, {
            id: docId,
            projectId,
            type: docTypes[i],
            filename: docNames[i],
            filePath: `/uploads/${projectId}/${docNames[i]}`,
            uploadedBy: devId,
            createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
          });
        }
      } else {
        const docA = randomUUID();
        this.documents.set(docA, {
          id: docA,
          projectId,
          type: "INTERCONNECTION",
          filename: `${projectId}_interconnection.pdf`,
          filePath: `/uploads/${projectId}/interconnection.pdf`,
          uploadedBy: devId,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
      }

      const score = computeReadiness(
        this.projects.get(projectId)!,
        Array.from(this.documents.values()).filter((d) => d.projectId === projectId),
        Array.from(this.checklistItems.values()).filter((c) => c.projectId === projectId),
        this.capitalStacks.get(projectId),
      );
      const rsId = randomUUID();
      this.readinessScores.set(projectId, {
        id: rsId,
        projectId,
        score: score.score,
        rating: score.rating,
        reasons: JSON.stringify(score.reasons),
        flags: JSON.stringify(score.flags),
        overriddenByAdmin: false,
        overrideNotes: null,
      });

      const meterId = randomUUID();
      this.metersMap.set(meterId, {
        id: meterId,
        projectId,
        meterType: "NET",
        provider: "UTILITY_API",
        providerUid: `METER_${projectId.toUpperCase().replace(/-/g, "_")}`,
        name: "Main revenue meter",
        timezone: "America/Los_Angeles",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (isApprovedOffering) {
        const logId = randomUUID();
        this.approvalLogs.set(logId, {
          id: logId,
          projectId,
          adminId,
          action: "APPROVE",
          notes: "Listed offering — data room complete for investor visibility.",
          createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        });

        const ppaId = `ppa-${projectId}-default`;
        const modeledOfftakerLabel =
          row.offtakerName.trim().length > 0 ? row.offtakerName : "Modeled energy revenue (SGT)";
        this.ppas.set(ppaId, {
          id: ppaId,
          projectId,
          offtakerName: modeledOfftakerLabel,
          contractStartDate: new Date(now.getFullYear() - 1, 0, 1),
          contractEndDate: new Date(now.getFullYear() + 19, 11, 31),
          pricePerMwh: row.pricePerMwh,
          escalationType: row.escalationType,
          escalationRate: row.escalationRate,
          contractedCapacityMW: row.capacityMW,
          createdAt: new Date(now.getFullYear() - 1, 0, 1),
        });

        const capacityKw = parseFloat(capacityKwStr);
        const lat = parseFloat(row.latitude);
        this.seedHourlyProductionAndRevenue(
          projectId,
          ppaId,
          capacityKw,
          lat,
          months,
          now,
          parseFloat(row.pricePerMwh),
        );

        const dsId = randomUUID();
        this.scadaDataSources.set(dsId, {
          id: dsId,
          projectId,
          sourceType: "CSV_UPLOAD",
          providerName: "SCADA Export",
          status: "ACTIVE",
          dataQuality: "HIGH",
          lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          recordCount: 8760,
          connectorId: null,
          configJson: JSON.stringify({
            capacityKw,
            technology: row.technology,
            lat: parseFloat(row.latitude),
            lon: parseFloat(row.longitude),
          }),
          notes: "Hourly production from site SCADA export — used for SGT settlement views.",
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        });
      } else {
        const dsId = randomUUID();
        this.scadaDataSources.set(dsId, {
          id: dsId,
          projectId,
          sourceType: "CSV_UPLOAD",
          providerName: "CSV Import",
          status: "PENDING",
          dataQuality: "UNKNOWN",
          lastSyncAt: null,
          recordCount: 0,
          connectorId: null,
          configJson: null,
          notes: "Awaiting production upload.",
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        });
      }
    }

    const firstOffering = catalogOfferings(25)[0];
    if (firstOffering) {
      const intId = randomUUID();
      this.interests.set(intId, {
        id: intId,
        projectId: firstOffering.slug,
        investorId,
        amountIntent: "500000",
        structurePreference: "EQUITY",
        timeline: "IMMEDIATE",
        message: "Interested in allocation on this offering.",
        status: "SUBMITTED",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      });
    }
  }

  private seedHourlyProductionAndRevenue(
    projectId: string,
    ppaId: string,
    capacityKw: number,
    latitude: number,
    months: string[],
    now: Date,
    ppaRatePerMwh: number,
  ) {
    const ppaRate = ppaRatePerMwh;
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

    for (let m = 0; m < 12; m++) {
      const periodStart = new Date(now.getFullYear() - 1, m, 1);
      const periodEnd = new Date(now.getFullYear() - 1, m + 1, 0);
      const daysInMonth = periodEnd.getDate();
      let totalMonthMwh = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(now.getFullYear() - 1, m, d);
        const dayOfYear = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000);
        const cloudFactor = 0.7 + 0.3 * rng();
        const tempDerate = 0.95 + 0.05 * rng();

        for (let h = 0; h < 24; h++) {
          const elev = solarElev(dayOfYear, h + 0.5, latitude);
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

          const hourStart = new Date(Date.UTC(now.getFullYear() - 1, m, d, h, 0, 0));
          const hourEnd = new Date(Date.UTC(now.getFullYear() - 1, m, d, h + 1, 0, 0));
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
        periodLabel: `${months[m]} ${now.getFullYear() - 1}`,
        totalDistributable: dist.totalDistributable.toString(),
        investorShare: dist.investorShare.toString(),
        platformFee: dist.platformFee.toString(),
        status: m < 11 ? "DISTRIBUTED" : "APPROVED",
        distributedAt: m < 11 ? new Date(now.getFullYear() - 1, m + 1, 15) : null,
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

  async bulkCreateProduction(records: InsertEnergyProduction[]): Promise<EnergyProduction[]> {
    const results: EnergyProduction[] = [];
    for (const prod of records) {
      results.push(await this.createProduction(prod));
    }
    return results;
  }

  async deleteProductionByProject(projectId: string): Promise<number> {
    let count = 0;
    for (const [id, prod] of Array.from(this.productionRecords.entries())) {
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
}

export const storage = new MemStorage();
