import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage, verifyPassword } from "./storage";
import { z } from "zod";
import { loginSchema, signupSchema, projectFormSchema, offeringFormSchema, investmentFormSchema } from "@shared/schema";
import { randomUUID } from "crypto";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ecoxchange-demo-secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Middleware to get current user
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireRole = (...roles: string[]) => {
    return async (req: any, res: any, next: any) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = user;
      next();
    };
  };

  // ===================
  // Auth Routes
  // ===================

  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !verifyPassword(data.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/signup", async (req: any, res) => {
    try {
      const data = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        email: data.email,
        passwordHash: data.password,
        role: data.role,
      });

      // Create profile
      if (data.role === "INVESTOR") {
        await storage.createInvestorProfile({
          userId: user.id,
          kycStatus: "PENDING",
          accredited: false,
          accreditedAt: null,
          fullName: null,
          entityName: null,
        });
        // Create demo ledger account
        const account = await storage.createLedgerAccount({
          userId: user.id,
          label: "USDC Demo Wallet",
          currency: "USDC_DEMO",
        });
        // Seed with demo balance
        await storage.createLedgerEntry({
          accountId: account.id,
          type: "DEPOSIT",
          amount: "100000",
          referenceType: null,
          referenceId: null,
          memo: "Initial demo balance",
        });
      } else if (data.role === "ISSUER") {
        await storage.createIssuerProfile({
          userId: user.id,
          companyName: data.email.split("@")[0] + " Company",
          website: null,
        });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // ===================
  // Issuer Routes
  // ===================

  app.get("/api/issuer/stats", requireRole("ISSUER"), async (req: any, res) => {
    const issuerId = req.user.id;
    const projects = await storage.getProjectsByIssuer(issuerId);
    const offerings = await storage.getOfferingsByIssuer(issuerId);
    
    let totalRaised = 0;
    let totalInvestors = new Set<string>();
    
    for (const offering of offerings) {
      const commitments = await storage.getCommitmentsByOffering(offering.id);
      for (const c of commitments) {
        if (c.status === "CONFIRMED") {
          totalRaised += Number(c.amount);
          totalInvestors.add(c.investorId);
        }
      }
    }

    res.json({
      totalProjects: projects.length,
      totalOfferings: offerings.length,
      totalRaised,
      totalInvestors: totalInvestors.size,
    });
  });

  app.get("/api/issuer/projects", requireRole("ISSUER"), async (req: any, res) => {
    const projects = await storage.getProjectsByIssuer(req.user.id);
    res.json(projects);
  });

  app.get("/api/issuer/projects/:id", requireRole("ISSUER"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project || project.issuerId !== req.user.id) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });

  app.get("/api/issuer/projects/:id/offerings", requireRole("ISSUER"), async (req: any, res) => {
    const offerings = await storage.getOfferingsByProject(req.params.id);
    res.json(offerings);
  });

  app.post("/api/issuer/projects", requireRole("ISSUER"), async (req: any, res) => {
    try {
      const data = projectFormSchema.parse(req.body);
      const project = await storage.createProject({
        issuerId: req.user.id,
        name: data.name,
        assetType: data.assetType,
        location: data.location,
        capacityMW: data.capacityMW || null,
        status: "INTAKE",
        ppaCounterparty: data.ppaCounterparty || null,
        ppaTenorYears: data.ppaTenorYears || null,
        ppaPrice: data.ppaPrice || null,
        description: data.description || null,
      });
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/issuer/offerings", requireRole("ISSUER"), async (req: any, res) => {
    const offerings = await storage.getOfferingsByIssuer(req.user.id);
    const result = await Promise.all(
      offerings.map(async (o) => {
        const project = await storage.getProject(o.projectId);
        return { ...o, projectName: project?.name || "Unknown" };
      })
    );
    res.json(result);
  });

  app.get("/api/issuer/offerings/recent", requireRole("ISSUER"), async (req: any, res) => {
    const offerings = await storage.getOfferingsByIssuer(req.user.id);
    const result = await Promise.all(
      offerings.slice(0, 5).map(async (o) => {
        const project = await storage.getProject(o.projectId);
        return { 
          id: o.id,
          name: o.name,
          status: o.status,
          targetRaise: o.targetRaise,
          projectName: project?.name || "Unknown"
        };
      })
    );
    res.json(result);
  });

  app.get("/api/issuer/offerings/:id", requireRole("ISSUER"), async (req: any, res) => {
    const offering = await storage.getOffering(req.params.id);
    if (!offering || offering.issuerId !== req.user.id) {
      return res.status(404).json({ message: "Offering not found" });
    }
    const project = await storage.getProject(offering.projectId);
    res.json({ ...offering, projectName: project?.name || "Unknown" });
  });

  app.get("/api/issuer/offerings/:id/commitments", requireRole("ISSUER"), async (req: any, res) => {
    const commitments = await storage.getCommitmentsByOffering(req.params.id);
    const result = await Promise.all(
      commitments.map(async (c) => {
        const user = await storage.getUser(c.investorId);
        return { ...c, investorEmail: user?.email || "Unknown" };
      })
    );
    res.json(result);
  });

  app.get("/api/issuer/offerings/:id/tokenization", requireRole("ISSUER"), async (req: any, res) => {
    const tokenization = await storage.getTokenization(req.params.id);
    res.json(tokenization || null);
  });

  app.get("/api/issuer/offerings/:id/distributions", requireRole("ISSUER"), async (req: any, res) => {
    const distributions = await storage.getDistributionsByOffering(req.params.id);
    res.json(distributions);
  });

  app.post("/api/issuer/offerings", requireRole("ISSUER"), async (req: any, res) => {
    try {
      const data = offeringFormSchema.parse(req.body);
      const project = await storage.getProject(data.projectId);
      if (!project || project.issuerId !== req.user.id) {
        return res.status(404).json({ message: "Project not found" });
      }

      const offering = await storage.createOffering({
        projectId: data.projectId,
        issuerId: req.user.id,
        name: data.name,
        status: "DRAFT",
        targetRaise: data.targetRaise,
        minInvestment: data.minInvestment,
        securityType: data.securityType,
        distributionFrequency: data.distributionFrequency,
        expectedIrr: data.expectedIrr || null,
        openDate: data.openDate ? new Date(data.openDate) : null,
        closeDate: data.closeDate ? new Date(data.closeDate) : null,
        jurisdiction: data.jurisdiction,
      });
      res.json(offering);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/issuer/offerings/:id/publish", requireRole("ISSUER"), async (req: any, res) => {
    const offering = await storage.getOffering(req.params.id);
    if (!offering || offering.issuerId !== req.user.id) {
      return res.status(404).json({ message: "Offering not found" });
    }
    if (offering.status !== "DRAFT") {
      return res.status(400).json({ message: "Only draft offerings can be published" });
    }
    const updated = await storage.updateOffering(req.params.id, { status: "OPEN", openDate: new Date() });
    res.json(updated);
  });

  app.post("/api/issuer/offerings/:id/close", requireRole("ISSUER"), async (req: any, res) => {
    const offering = await storage.getOffering(req.params.id);
    if (!offering || offering.issuerId !== req.user.id) {
      return res.status(404).json({ message: "Offering not found" });
    }
    if (offering.status !== "OPEN") {
      return res.status(400).json({ message: "Only open offerings can be closed" });
    }
    const updated = await storage.updateOffering(req.params.id, { status: "CLOSED", closeDate: new Date() });
    res.json(updated);
  });

  app.post("/api/issuer/offerings/:id/mint", requireRole("ISSUER"), async (req: any, res) => {
    const offering = await storage.getOffering(req.params.id);
    if (!offering || offering.issuerId !== req.user.id) {
      return res.status(404).json({ message: "Offering not found" });
    }
    if (offering.status !== "CLOSED") {
      return res.status(400).json({ message: "Offering must be closed before minting" });
    }

    const existingToken = await storage.getTokenization(req.params.id);
    if (existingToken) {
      return res.status(400).json({ message: "Tokens already minted" });
    }

    // Create tokenization
    const symbol = offering.name.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 6);
    const tokenization = await storage.createTokenization({
      offeringId: offering.id,
      tokenStandard: "ERC3643_SIM",
      tokenSymbol: symbol,
      tokenName: `${offering.name} Token`,
      tokenContractAddress: null,
    });

    // Get confirmed commitments and allocate tokens proportionally
    const commitments = await storage.getCommitmentsByOffering(offering.id);
    const confirmedCommitments = commitments.filter(c => c.status === "CONFIRMED");
    const totalCommitted = confirmedCommitments.reduce((sum, c) => sum + Number(c.amount), 0);

    for (const commitment of confirmedCommitments) {
      const proportion = Number(commitment.amount) / totalCommitted;
      const tokens = proportion * 1000000; // 1M total tokens
      await storage.createTokenAllocation({
        tokenizationId: tokenization.id,
        investorId: commitment.investorId,
        tokens: tokens.toFixed(8),
      });
    }

    res.json(tokenization);
  });

  // ===================
  // Investor Routes
  // ===================

  app.get("/api/investor/stats", requireRole("INVESTOR"), async (req: any, res) => {
    const profile = await storage.getInvestorProfile(req.user.id);
    const balance = await storage.getLedgerBalance(req.user.id);
    const commitments = await storage.getCommitmentsByInvestor(req.user.id);
    const tokens = await storage.getTokenAllocationsByInvestor(req.user.id);
    const payouts = await storage.getPayoutsByInvestor(req.user.id);

    const totalInvested = commitments
      .filter(c => c.status === "CONFIRMED")
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const totalTokens = tokens.reduce((sum, t) => sum + Number(t.tokens), 0);
    const totalDistributions = payouts
      .filter(p => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      balance,
      totalInvested,
      totalTokens,
      totalDistributions,
      kycStatus: profile?.kycStatus || "NOT_STARTED",
      accredited: profile?.accredited || false,
    });
  });

  app.get("/api/investor/status", requireRole("INVESTOR"), async (req: any, res) => {
    const profile = await storage.getInvestorProfile(req.user.id);
    const balance = await storage.getLedgerBalance(req.user.id);
    res.json({
      kycStatus: profile?.kycStatus || "NOT_STARTED",
      accredited: profile?.accredited || false,
      balance,
    });
  });

  app.get("/api/investor/commitments", requireRole("INVESTOR"), async (req: any, res) => {
    const commitments = await storage.getCommitmentsByInvestor(req.user.id);
    const result = await Promise.all(
      commitments.map(async (c) => {
        const offering = await storage.getOffering(c.offeringId);
        const project = offering ? await storage.getProject(offering.projectId) : null;
        return {
          ...c,
          offeringName: offering?.name || "Unknown",
          projectName: project?.name || "Unknown",
        };
      })
    );
    res.json(result);
  });

  app.get("/api/investor/commitments/recent", requireRole("INVESTOR"), async (req: any, res) => {
    const commitments = await storage.getCommitmentsByInvestor(req.user.id);
    const result = await Promise.all(
      commitments.slice(0, 5).map(async (c) => {
        const offering = await storage.getOffering(c.offeringId);
        return {
          id: c.id,
          offeringName: offering?.name || "Unknown",
          amount: c.amount,
          status: c.status,
        };
      })
    );
    res.json(result);
  });

  app.get("/api/investor/tokens", requireRole("INVESTOR"), async (req: any, res) => {
    const tokens = await storage.getTokenAllocationsByInvestor(req.user.id);
    const result = await Promise.all(
      tokens.map(async (t) => {
        const allocations = await storage.getTokenAllocationsByTokenization(t.tokenizationId);
        // Find tokenization info - we need to iterate through offerings
        const offerings = await storage.getAllOfferings();
        let tokenInfo = null;
        for (const o of offerings) {
          const tok = await storage.getTokenization(o.id);
          if (tok && tok.id === t.tokenizationId) {
            tokenInfo = { ...tok, offeringName: o.name };
            break;
          }
        }
        return {
          ...t,
          tokenSymbol: tokenInfo?.tokenSymbol || "UNK",
          tokenName: tokenInfo?.tokenName || "Unknown",
          offeringName: tokenInfo?.offeringName || "Unknown",
        };
      })
    );
    res.json(result);
  });

  app.get("/api/investor/payouts", requireRole("INVESTOR"), async (req: any, res) => {
    const payouts = await storage.getPayoutsByInvestor(req.user.id);
    const result = await Promise.all(
      payouts.map(async (p) => {
        // Find distribution and offering info
        const offerings = await storage.getAllOfferings();
        let distInfo = null;
        for (const o of offerings) {
          const dists = await storage.getDistributionsByOffering(o.id);
          const dist = dists.find(d => d.id === p.distributionId);
          if (dist) {
            distInfo = { ...dist, offeringName: o.name };
            break;
          }
        }
        return {
          ...p,
          offeringName: distInfo?.offeringName || "Unknown",
          periodStart: distInfo?.periodStart || "",
          periodEnd: distInfo?.periodEnd || "",
        };
      })
    );
    res.json(result);
  });

  app.get("/api/investor/wallet/stats", requireRole("INVESTOR"), async (req: any, res) => {
    const account = await storage.getLedgerAccount(req.user.id);
    if (!account) {
      return res.json({ balance: 0, totalDeposits: 0, totalReserved: 0, totalPayouts: 0 });
    }

    const entries = await storage.getLedgerEntries(account.id);
    let totalDeposits = 0;
    let totalReserved = 0;
    let totalPayouts = 0;

    for (const entry of entries) {
      const amount = Number(entry.amount);
      if (entry.type === "DEPOSIT") totalDeposits += amount;
      if (entry.type === "RESERVE") totalReserved += amount;
      if (entry.type === "PAYOUT") totalPayouts += amount;
    }

    const balance = await storage.getLedgerBalance(req.user.id);

    res.json({
      balance,
      totalDeposits,
      totalReserved,
      totalPayouts,
    });
  });

  app.get("/api/investor/wallet/entries", requireRole("INVESTOR"), async (req: any, res) => {
    const account = await storage.getLedgerAccount(req.user.id);
    if (!account) {
      return res.json([]);
    }
    const entries = await storage.getLedgerEntries(account.id);
    res.json(entries);
  });

  app.post("/api/investor/offerings/:id/invest", requireRole("INVESTOR"), async (req: any, res) => {
    try {
      const data = investmentFormSchema.parse(req.body);
      const offering = await storage.getOffering(req.params.id);
      if (!offering || offering.status !== "OPEN") {
        return res.status(404).json({ message: "Offering not available" });
      }

      const profile = await storage.getInvestorProfile(req.user.id);
      if (!profile || profile.kycStatus !== "APPROVED" || !profile.accredited) {
        return res.status(403).json({ message: "KYC and accreditation required" });
      }

      const amount = Number(data.amount);
      if (amount < Number(offering.minInvestment)) {
        return res.status(400).json({ message: `Minimum investment is $${offering.minInvestment}` });
      }

      const balance = await storage.getLedgerBalance(req.user.id);
      if (balance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create commitment
      const commitment = await storage.createCommitment({
        offeringId: offering.id,
        investorId: req.user.id,
        amount: data.amount,
        status: "CONFIRMED",
      });

      // Create reserve ledger entry
      const account = await storage.getLedgerAccount(req.user.id);
      if (account) {
        await storage.createLedgerEntry({
          accountId: account.id,
          type: "RESERVE",
          amount: data.amount,
          referenceType: "COMMITMENT",
          referenceId: commitment.id,
          memo: `Reserved for ${offering.name}`,
        });
      }

      res.json(commitment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===================
  // Public/Marketplace Routes
  // ===================

  app.get("/api/offerings/marketplace", async (req, res) => {
    const offerings = await storage.getOpenOfferings();
    const result = await Promise.all(
      offerings.map(async (o) => {
        const project = await storage.getProject(o.projectId);
        return {
          ...o,
          projectName: project?.name || "Unknown",
          assetType: project?.assetType || "OTHER",
        };
      })
    );
    res.json(result);
  });

  app.get("/api/offerings/:id", async (req, res) => {
    const offering = await storage.getOffering(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: "Offering not found" });
    }
    const project = await storage.getProject(offering.projectId);
    res.json({
      ...offering,
      projectName: project?.name || "Unknown",
      assetType: project?.assetType || "OTHER",
      location: project?.location || "",
      capacityMW: project?.capacityMW || null,
    });
  });

  // ===================
  // Admin Routes
  // ===================

  app.get("/api/admin/stats", requireRole("ADMIN"), async (req: any, res) => {
    const users = await storage.getAllUsers();
    const offerings = await storage.getAllOfferings();
    const profiles = await storage.getAllInvestorProfiles();

    let totalRaised = 0;
    for (const offering of offerings) {
      const commitments = await storage.getCommitmentsByOffering(offering.id);
      for (const c of commitments) {
        if (c.status === "CONFIRMED") {
          totalRaised += Number(c.amount);
        }
      }
    }

    const pendingKyc = profiles.filter(p => p.profile.kycStatus === "PENDING").length;

    res.json({
      totalUsers: users.length,
      totalOfferings: offerings.length,
      totalRaised,
      pendingKyc,
    });
  });

  app.get("/api/admin/investors", requireRole("ADMIN"), async (req: any, res) => {
    const profiles = await storage.getAllInvestorProfiles();
    res.json(profiles);
  });

  app.get("/api/admin/offerings", requireRole("ADMIN"), async (req: any, res) => {
    const offerings = await storage.getAllOfferings();
    const result = await Promise.all(
      offerings.map(async (o) => {
        const project = await storage.getProject(o.projectId);
        const issuer = await storage.getUser(o.issuerId);
        const commitments = await storage.getCommitmentsByOffering(o.id);
        return {
          ...o,
          projectName: project?.name || "Unknown",
          issuerEmail: issuer?.email || "Unknown",
          totalCommitments: commitments.length,
        };
      })
    );
    res.json(result);
  });

  app.post("/api/admin/users/:userId/approve-kyc", requireRole("ADMIN"), async (req: any, res) => {
    const profile = await storage.getInvestorProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const updated = await storage.updateInvestorProfile(req.params.userId, { kycStatus: "APPROVED" });
    res.json(updated);
  });

  app.post("/api/admin/users/:userId/reject-kyc", requireRole("ADMIN"), async (req: any, res) => {
    const profile = await storage.getInvestorProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const updated = await storage.updateInvestorProfile(req.params.userId, { kycStatus: "REJECTED" });
    res.json(updated);
  });

  app.post("/api/admin/users/:userId/set-accredited", requireRole("ADMIN"), async (req: any, res) => {
    const { accredited } = req.body;
    const profile = await storage.getInvestorProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const updated = await storage.updateInvestorProfile(req.params.userId, {
      accredited,
      accreditedAt: accredited ? new Date() : null,
    });
    res.json(updated);
  });

  return httpServer;
}
