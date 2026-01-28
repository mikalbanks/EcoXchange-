import { randomUUID } from "crypto";
import {
  type User, type InsertUser,
  type InvestorProfile, type InsertInvestorProfile,
  type IssuerProfile, type InsertIssuerProfile,
  type Project, type InsertProject,
  type Offering, type InsertOffering,
  type Commitment, type InsertCommitment,
  type Tokenization, type InsertTokenization,
  type TokenAllocation, type InsertTokenAllocation,
  type Distribution, type InsertDistribution,
  type DistributionPayout, type InsertDistributionPayout,
  type LedgerAccount, type InsertLedgerAccount,
  type LedgerEntry, type InsertLedgerEntry,
} from "@shared/schema";

// Utility for password hashing (simple for demo)
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Investor Profiles
  getInvestorProfile(userId: string): Promise<InvestorProfile | undefined>;
  createInvestorProfile(profile: InsertInvestorProfile): Promise<InvestorProfile>;
  updateInvestorProfile(userId: string, updates: Partial<InvestorProfile>): Promise<InvestorProfile | undefined>;
  getAllInvestorProfiles(): Promise<Array<{ user: User; profile: InvestorProfile }>>;

  // Issuer Profiles
  getIssuerProfile(userId: string): Promise<IssuerProfile | undefined>;
  createIssuerProfile(profile: InsertIssuerProfile): Promise<IssuerProfile>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByIssuer(issuerId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(): Promise<Project[]>;

  // Offerings
  getOffering(id: string): Promise<Offering | undefined>;
  getOfferingsByIssuer(issuerId: string): Promise<Offering[]>;
  getOfferingsByProject(projectId: string): Promise<Offering[]>;
  getOpenOfferings(): Promise<Offering[]>;
  createOffering(offering: InsertOffering): Promise<Offering>;
  updateOffering(id: string, updates: Partial<Offering>): Promise<Offering | undefined>;
  getAllOfferings(): Promise<Offering[]>;

  // Commitments
  getCommitment(id: string): Promise<Commitment | undefined>;
  getCommitmentsByOffering(offeringId: string): Promise<Commitment[]>;
  getCommitmentsByInvestor(investorId: string): Promise<Commitment[]>;
  createCommitment(commitment: InsertCommitment): Promise<Commitment>;
  updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment | undefined>;

  // Tokenization
  getTokenization(offeringId: string): Promise<Tokenization | undefined>;
  createTokenization(tokenization: InsertTokenization): Promise<Tokenization>;

  // Token Allocations
  getTokenAllocationsByInvestor(investorId: string): Promise<TokenAllocation[]>;
  getTokenAllocationsByTokenization(tokenizationId: string): Promise<TokenAllocation[]>;
  createTokenAllocation(allocation: InsertTokenAllocation): Promise<TokenAllocation>;

  // Distributions
  getDistributionsByOffering(offeringId: string): Promise<Distribution[]>;
  createDistribution(distribution: InsertDistribution): Promise<Distribution>;
  updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined>;

  // Distribution Payouts
  getPayoutsByDistribution(distributionId: string): Promise<DistributionPayout[]>;
  getPayoutsByInvestor(investorId: string): Promise<DistributionPayout[]>;
  createDistributionPayout(payout: InsertDistributionPayout): Promise<DistributionPayout>;
  updateDistributionPayout(id: string, updates: Partial<DistributionPayout>): Promise<DistributionPayout | undefined>;

  // Ledger
  getLedgerAccount(userId: string): Promise<LedgerAccount | undefined>;
  createLedgerAccount(account: InsertLedgerAccount): Promise<LedgerAccount>;
  getLedgerEntries(accountId: string): Promise<LedgerEntry[]>;
  createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry>;
  getLedgerBalance(userId: string): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private investorProfiles: Map<string, InvestorProfile> = new Map();
  private issuerProfiles: Map<string, IssuerProfile> = new Map();
  private projects: Map<string, Project> = new Map();
  private offerings: Map<string, Offering> = new Map();
  private commitments: Map<string, Commitment> = new Map();
  private tokenizations: Map<string, Tokenization> = new Map();
  private tokenAllocations: Map<string, TokenAllocation> = new Map();
  private distributions: Map<string, Distribution> = new Map();
  private distributionPayouts: Map<string, DistributionPayout> = new Map();
  private ledgerAccounts: Map<string, LedgerAccount> = new Map();
  private ledgerEntries: Map<string, LedgerEntry> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      email: "admin@ecoxchange.demo",
      passwordHash: hashPassword("Admin123!"),
      role: "ADMIN",
      createdAt: new Date(),
    });

    // Create issuer user
    const issuerId = randomUUID();
    this.users.set(issuerId, {
      id: issuerId,
      email: "issuer@ecoxchange.demo",
      passwordHash: hashPassword("Issuer123!"),
      role: "ISSUER",
      createdAt: new Date(),
    });
    this.issuerProfiles.set(issuerId, {
      id: randomUUID(),
      userId: issuerId,
      companyName: "Green Energy Partners",
      website: "https://greenenergypartners.demo",
    });

    // Create investor user
    const investorId = randomUUID();
    this.users.set(investorId, {
      id: investorId,
      email: "investor@ecoxchange.demo",
      passwordHash: hashPassword("Investor123!"),
      role: "INVESTOR",
      createdAt: new Date(),
    });
    const investorProfileId = randomUUID();
    this.investorProfiles.set(investorId, {
      id: investorProfileId,
      userId: investorId,
      kycStatus: "APPROVED",
      accredited: true,
      accreditedAt: new Date(),
      fullName: "Jane Doe",
      entityName: null,
    });

    // Create ledger account for investor with 250,000 USDC Demo
    const ledgerAccountId = randomUUID();
    this.ledgerAccounts.set(investorId, {
      id: ledgerAccountId,
      userId: investorId,
      label: "USDC Demo Wallet",
      currency: "USDC_DEMO",
      createdAt: new Date(),
    });
    const depositEntryId = randomUUID();
    this.ledgerEntries.set(depositEntryId, {
      id: depositEntryId,
      accountId: ledgerAccountId,
      type: "DEPOSIT",
      amount: "250000",
      referenceType: null,
      referenceId: null,
      memo: "Initial demo balance",
      createdAt: new Date(),
    });

    // Create sample project
    const projectId = randomUUID();
    this.projects.set(projectId, {
      id: projectId,
      issuerId: issuerId,
      name: "Solar Farm Alpha",
      assetType: "SOLAR",
      location: "Texas, USA",
      capacityMW: "50.00",
      status: "APPROVED",
      ppaCounterparty: "Texas Utilities Corp",
      ppaTenorYears: 20,
      ppaPrice: "35.00",
      description: "A 50MW utility-scale solar project with a 20-year PPA",
      createdAt: new Date(),
    });

    // Create second project
    const project2Id = randomUUID();
    this.projects.set(project2Id, {
      id: project2Id,
      issuerId: issuerId,
      name: "Wind Farm Beta",
      assetType: "WIND",
      location: "Oklahoma, USA",
      capacityMW: "100.00",
      status: "APPROVED",
      ppaCounterparty: "Midwest Power Co",
      ppaTenorYears: 15,
      ppaPrice: "28.50",
      description: "A 100MW onshore wind farm with stable cash flows",
      createdAt: new Date(),
    });

    // Create open offering
    const offeringId = randomUUID();
    this.offerings.set(offeringId, {
      id: offeringId,
      projectId: projectId,
      issuerId: issuerId,
      name: "Solar Alpha Series A",
      status: "OPEN",
      targetRaise: "5000000",
      minInvestment: "25000",
      securityType: "EQUITY",
      distributionFrequency: "QUARTERLY",
      expectedIrr: "8.5",
      openDate: new Date(),
      closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      jurisdiction: "US",
      createdAt: new Date(),
    });

    // Create a sample commitment
    const commitmentId = randomUUID();
    this.commitments.set(commitmentId, {
      id: commitmentId,
      offeringId: offeringId,
      investorId: investorId,
      amount: "50000",
      status: "CONFIRMED",
      createdAt: new Date(),
    });

    // Create reserve ledger entry for the commitment
    const reserveEntryId = randomUUID();
    this.ledgerEntries.set(reserveEntryId, {
      id: reserveEntryId,
      accountId: ledgerAccountId,
      type: "RESERVE",
      amount: "50000",
      referenceType: "COMMITMENT",
      referenceId: commitmentId,
      memo: "Reserved for Solar Alpha Series A",
      createdAt: new Date(),
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      passwordHash: hashPassword(insertUser.passwordHash),
      role: insertUser.role || "INVESTOR",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Investor Profiles
  async getInvestorProfile(userId: string): Promise<InvestorProfile | undefined> {
    return this.investorProfiles.get(userId);
  }

  async createInvestorProfile(profile: InsertInvestorProfile): Promise<InvestorProfile> {
    const id = randomUUID();
    const newProfile: InvestorProfile = {
      id,
      userId: profile.userId,
      kycStatus: profile.kycStatus || "NOT_STARTED",
      accredited: profile.accredited || false,
      accreditedAt: profile.accreditedAt || null,
      fullName: profile.fullName || null,
      entityName: profile.entityName || null,
    };
    this.investorProfiles.set(profile.userId, newProfile);
    return newProfile;
  }

  async updateInvestorProfile(userId: string, updates: Partial<InvestorProfile>): Promise<InvestorProfile | undefined> {
    const profile = this.investorProfiles.get(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates };
    this.investorProfiles.set(userId, updated);
    return updated;
  }

  async getAllInvestorProfiles(): Promise<Array<{ user: User; profile: InvestorProfile }>> {
    const result: Array<{ user: User; profile: InvestorProfile }> = [];
    for (const [userId, profile] of this.investorProfiles) {
      const user = this.users.get(userId);
      if (user) {
        result.push({ user, profile });
      }
    }
    return result;
  }

  // Issuer Profiles
  async getIssuerProfile(userId: string): Promise<IssuerProfile | undefined> {
    return this.issuerProfiles.get(userId);
  }

  async createIssuerProfile(profile: InsertIssuerProfile): Promise<IssuerProfile> {
    const id = randomUUID();
    const newProfile: IssuerProfile = {
      id,
      userId: profile.userId,
      companyName: profile.companyName,
      website: profile.website || null,
    };
    this.issuerProfiles.set(profile.userId, newProfile);
    return newProfile;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByIssuer(issuerId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.issuerId === issuerId);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const newProject: Project = {
      id,
      issuerId: project.issuerId,
      name: project.name,
      assetType: project.assetType,
      location: project.location,
      capacityMW: project.capacityMW || null,
      status: project.status || "INTAKE",
      ppaCounterparty: project.ppaCounterparty || null,
      ppaTenorYears: project.ppaTenorYears || null,
      ppaPrice: project.ppaPrice || null,
      description: project.description || null,
      createdAt: new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  // Offerings
  async getOffering(id: string): Promise<Offering | undefined> {
    return this.offerings.get(id);
  }

  async getOfferingsByIssuer(issuerId: string): Promise<Offering[]> {
    return Array.from(this.offerings.values()).filter(o => o.issuerId === issuerId);
  }

  async getOfferingsByProject(projectId: string): Promise<Offering[]> {
    return Array.from(this.offerings.values()).filter(o => o.projectId === projectId);
  }

  async getOpenOfferings(): Promise<Offering[]> {
    return Array.from(this.offerings.values()).filter(o => o.status === "OPEN");
  }

  async createOffering(offering: InsertOffering): Promise<Offering> {
    const id = randomUUID();
    const newOffering: Offering = {
      id,
      projectId: offering.projectId,
      issuerId: offering.issuerId,
      name: offering.name,
      status: offering.status || "DRAFT",
      targetRaise: offering.targetRaise,
      minInvestment: offering.minInvestment,
      securityType: offering.securityType,
      distributionFrequency: offering.distributionFrequency || "QUARTERLY",
      expectedIrr: offering.expectedIrr || null,
      openDate: offering.openDate || null,
      closeDate: offering.closeDate || null,
      jurisdiction: offering.jurisdiction || "US",
      createdAt: new Date(),
    };
    this.offerings.set(id, newOffering);
    return newOffering;
  }

  async updateOffering(id: string, updates: Partial<Offering>): Promise<Offering | undefined> {
    const offering = this.offerings.get(id);
    if (!offering) return undefined;
    const updated = { ...offering, ...updates };
    this.offerings.set(id, updated);
    return updated;
  }

  async getAllOfferings(): Promise<Offering[]> {
    return Array.from(this.offerings.values());
  }

  // Commitments
  async getCommitment(id: string): Promise<Commitment | undefined> {
    return this.commitments.get(id);
  }

  async getCommitmentsByOffering(offeringId: string): Promise<Commitment[]> {
    return Array.from(this.commitments.values()).filter(c => c.offeringId === offeringId);
  }

  async getCommitmentsByInvestor(investorId: string): Promise<Commitment[]> {
    return Array.from(this.commitments.values()).filter(c => c.investorId === investorId);
  }

  async createCommitment(commitment: InsertCommitment): Promise<Commitment> {
    const id = randomUUID();
    const newCommitment: Commitment = {
      id,
      offeringId: commitment.offeringId,
      investorId: commitment.investorId,
      amount: commitment.amount,
      status: commitment.status || "SUBMITTED",
      createdAt: new Date(),
    };
    this.commitments.set(id, newCommitment);
    return newCommitment;
  }

  async updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment | undefined> {
    const commitment = this.commitments.get(id);
    if (!commitment) return undefined;
    const updated = { ...commitment, ...updates };
    this.commitments.set(id, updated);
    return updated;
  }

  // Tokenization
  async getTokenization(offeringId: string): Promise<Tokenization | undefined> {
    return Array.from(this.tokenizations.values()).find(t => t.offeringId === offeringId);
  }

  async createTokenization(tokenization: InsertTokenization): Promise<Tokenization> {
    const id = randomUUID();
    const newTokenization: Tokenization = {
      id,
      offeringId: tokenization.offeringId,
      tokenStandard: tokenization.tokenStandard || "ERC3643_SIM",
      tokenSymbol: tokenization.tokenSymbol,
      tokenName: tokenization.tokenName,
      tokenContractAddress: tokenization.tokenContractAddress || `0x${randomUUID().replace(/-/g, "").slice(0, 40)}`,
      mintedAt: new Date(),
    };
    this.tokenizations.set(id, newTokenization);
    return newTokenization;
  }

  // Token Allocations
  async getTokenAllocationsByInvestor(investorId: string): Promise<TokenAllocation[]> {
    return Array.from(this.tokenAllocations.values()).filter(a => a.investorId === investorId);
  }

  async getTokenAllocationsByTokenization(tokenizationId: string): Promise<TokenAllocation[]> {
    return Array.from(this.tokenAllocations.values()).filter(a => a.tokenizationId === tokenizationId);
  }

  async createTokenAllocation(allocation: InsertTokenAllocation): Promise<TokenAllocation> {
    const id = randomUUID();
    const newAllocation: TokenAllocation = {
      id,
      tokenizationId: allocation.tokenizationId,
      investorId: allocation.investorId,
      tokens: allocation.tokens,
      createdAt: new Date(),
    };
    this.tokenAllocations.set(id, newAllocation);
    return newAllocation;
  }

  // Distributions
  async getDistributionsByOffering(offeringId: string): Promise<Distribution[]> {
    return Array.from(this.distributions.values()).filter(d => d.offeringId === offeringId);
  }

  async createDistribution(distribution: InsertDistribution): Promise<Distribution> {
    const id = randomUUID();
    const newDistribution: Distribution = {
      id,
      offeringId: distribution.offeringId,
      periodStart: distribution.periodStart,
      periodEnd: distribution.periodEnd,
      totalAmount: distribution.totalAmount,
      status: distribution.status || "PENDING",
      paidAt: null,
    };
    this.distributions.set(id, newDistribution);
    return newDistribution;
  }

  async updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined> {
    const distribution = this.distributions.get(id);
    if (!distribution) return undefined;
    const updated = { ...distribution, ...updates };
    this.distributions.set(id, updated);
    return updated;
  }

  // Distribution Payouts
  async getPayoutsByDistribution(distributionId: string): Promise<DistributionPayout[]> {
    return Array.from(this.distributionPayouts.values()).filter(p => p.distributionId === distributionId);
  }

  async getPayoutsByInvestor(investorId: string): Promise<DistributionPayout[]> {
    return Array.from(this.distributionPayouts.values()).filter(p => p.investorId === investorId);
  }

  async createDistributionPayout(payout: InsertDistributionPayout): Promise<DistributionPayout> {
    const id = randomUUID();
    const newPayout: DistributionPayout = {
      id,
      distributionId: payout.distributionId,
      investorId: payout.investorId,
      amount: payout.amount,
      status: payout.status || "PENDING",
      paidAt: null,
    };
    this.distributionPayouts.set(id, newPayout);
    return newPayout;
  }

  async updateDistributionPayout(id: string, updates: Partial<DistributionPayout>): Promise<DistributionPayout | undefined> {
    const payout = this.distributionPayouts.get(id);
    if (!payout) return undefined;
    const updated = { ...payout, ...updates };
    this.distributionPayouts.set(id, updated);
    return updated;
  }

  // Ledger
  async getLedgerAccount(userId: string): Promise<LedgerAccount | undefined> {
    return this.ledgerAccounts.get(userId);
  }

  async createLedgerAccount(account: InsertLedgerAccount): Promise<LedgerAccount> {
    const id = randomUUID();
    const newAccount: LedgerAccount = {
      id,
      userId: account.userId,
      label: account.label,
      currency: account.currency,
      createdAt: new Date(),
    };
    this.ledgerAccounts.set(account.userId, newAccount);
    return newAccount;
  }

  async getLedgerEntries(accountId: string): Promise<LedgerEntry[]> {
    return Array.from(this.ledgerEntries.values())
      .filter(e => e.accountId === accountId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry> {
    const id = randomUUID();
    const newEntry: LedgerEntry = {
      id,
      accountId: entry.accountId,
      type: entry.type,
      amount: entry.amount,
      referenceType: entry.referenceType || null,
      referenceId: entry.referenceId || null,
      memo: entry.memo || null,
      createdAt: new Date(),
    };
    this.ledgerEntries.set(id, newEntry);
    return newEntry;
  }

  async getLedgerBalance(userId: string): Promise<number> {
    const account = await this.getLedgerAccount(userId);
    if (!account) return 0;

    const entries = await this.getLedgerEntries(account.id);
    let balance = 0;
    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (entry.type === "DEPOSIT" || entry.type === "RELEASE" || entry.type === "PAYOUT") {
        balance += amount;
      } else if (entry.type === "WITHDRAWAL" || entry.type === "RESERVE") {
        balance -= amount;
      }
    }
    return balance;
  }
}

export const storage = new MemStorage();
