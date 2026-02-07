import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage, verifyPassword, computeReadiness, generateChecklist, computeCapitalStack } from "./storage";
import { loginSchema, signupSchema, projectWizardStep1Schema, projectWizardStep2Schema, projectWizardStep3Schema, investorInterestFormSchema } from "@shared/schema";
import { z } from "zod";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware (same as existing)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ecoxchange-demo-secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({ checkPeriod: 86400000 }),
      cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    next();
  };

  const requireRole = (...roles: string[]) => {
    return async (req: any, res: any, next: any) => {
      if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.session.userId);
      if (!user || !roles.includes(user.role)) return res.status(403).json({ message: "Forbidden" });
      req.user = user;
      next();
    };
  };

  // ═══ Auth Routes ═══

  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName } });
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !verifyPassword(data.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/signup", async (req: any, res) => {
    try {
      const data = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const user = await storage.createUser({
        email: data.email,
        passwordHash: data.password,
        role: data.role,
        name: data.email.split("@")[0],
        orgName: null,
      });
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy(() => { res.json({ message: "Logged out" }); });
  });

  // ═══ Developer Routes ═══

  // Developer stats
  app.get("/api/developer/stats", requireRole("DEVELOPER"), async (req: any, res) => {
    const projects = await storage.getProjectsByDeveloper(req.user.id);
    let totalInterestAmount = 0;
    let totalInterests = 0;
    let missingItems = 0;
    for (const p of projects) {
      const interests = await storage.getInterestsByProject(p.id);
      totalInterests += interests.length;
      totalInterestAmount += interests.reduce((sum, i) => sum + (Number(i.amountIntent) || 0), 0);
      const checklist = await storage.getChecklistByProject(p.id);
      missingItems += checklist.filter(c => c.required && c.status === "MISSING").length;
    }
    res.json({
      totalProjects: projects.length,
      submitted: projects.filter(p => p.status === "SUBMITTED" || p.status === "IN_REVIEW").length,
      approved: projects.filter(p => p.status === "APPROVED").length,
      totalInterestAmount,
      totalInterests,
      missingItems,
    });
  });

  // Developer project list
  app.get("/api/developer/projects", requireRole("DEVELOPER"), async (req: any, res) => {
    const projects = await storage.getProjectsByDeveloper(req.user.id);
    const result = await Promise.all(
      projects.map(async (p) => {
        const score = await storage.getReadinessScore(p.id);
        const checklist = await storage.getChecklistByProject(p.id);
        const interests = await storage.getInterestsByProject(p.id);
        const missingCount = checklist.filter(c => c.required && c.status === "MISSING").length;
        return {
          ...p,
          readinessScore: score ? { score: score.score, rating: score.rating } : null,
          missingCount,
          interestCount: interests.length,
        };
      })
    );
    res.json(result);
  });

  // Create project (full wizard submit)
  app.post("/api/developer/projects", requireRole("DEVELOPER"), async (req: any, res) => {
    try {
      const { step1, step2, step3 } = req.body;
      const s1 = projectWizardStep1Schema.parse(step1);
      const s2 = projectWizardStep2Schema.parse(step2);
      const s3 = projectWizardStep3Schema.parse(step3);

      const project = await storage.createProject({
        developerId: req.user.id,
        name: s1.name,
        technology: s1.technology,
        stage: s1.stage,
        country: "US",
        state: s1.state,
        county: s1.county,
        capacityMW: s1.capacityMW,
        status: "SUBMITTED",
        summary: null,
        offtakerType: s2.offtakerType,
        interconnectionStatus: s2.interconnectionStatus,
        permittingStatus: s2.permittingStatus,
        siteControlStatus: s2.siteControlStatus,
        feocAttested: s2.feocAttested,
        latitude: null,
        longitude: null,
      });

      // Create capital stack
      const totalCapex = Number(s3.totalCapex) || 0;
      const taxCreditEstimated = Number(s3.taxCreditEstimated) || 0;
      const computed = computeCapitalStack(totalCapex, taxCreditEstimated);
      await storage.createCapitalStack({
        projectId: project.id,
        totalCapex: s3.totalCapex,
        taxCreditType: s3.taxCreditType,
        taxCreditEstimated: s3.taxCreditEstimated,
        taxCreditTransferabilityReady: s3.taxCreditTransferabilityReady,
        equityNeeded: computed.equityNeeded.toString(),
        debtPlaceholder: "0",
        notes: null,
      });

      // Generate checklist
      const checklistDefs = generateChecklist(project);
      for (const item of checklistDefs) {
        await storage.createChecklistItem({
          projectId: project.id,
          key: item.key,
          label: item.label,
          required: item.required,
          status: "MISSING",
          notes: null,
        });
      }

      // Compute readiness score
      const documents = await storage.getDocumentsByProject(project.id);
      const checklist = await storage.getChecklistByProject(project.id);
      const capitalStack = await storage.getCapitalStack(project.id);
      const scoreResult = computeReadiness(project, documents, checklist, capitalStack);
      await storage.createReadinessScore({
        projectId: project.id,
        score: scoreResult.score,
        rating: scoreResult.rating,
        reasons: JSON.stringify(scoreResult.reasons),
        flags: JSON.stringify(scoreResult.flags),
        overriddenByAdmin: false,
        overrideNotes: null,
      });

      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get project detail
  app.get("/api/developer/projects/:id", requireRole("DEVELOPER"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project || project.developerId !== req.user.id) {
      return res.status(404).json({ message: "Project not found" });
    }
    const score = await storage.getReadinessScore(project.id);
    const capitalStack = await storage.getCapitalStack(project.id);
    const checklist = await storage.getChecklistByProject(project.id);
    const documents = await storage.getDocumentsByProject(project.id);
    const interests = await storage.getInterestsByProject(project.id);

    // Enrich interests with investor info
    const enrichedInterests = await Promise.all(
      interests.map(async (i) => {
        const investor = await storage.getUser(i.investorId);
        return { ...i, investorName: investor?.name || "Unknown", investorOrg: investor?.orgName || "" };
      })
    );

    res.json({
      project,
      readinessScore: score ? {
        ...score,
        reasons: score.reasons ? JSON.parse(score.reasons) : [],
        flags: score.flags ? JSON.parse(score.flags) : {},
      } : null,
      capitalStack,
      checklist,
      documents,
      interests: enrichedInterests,
    });
  });

  // Upload document (simulated - store metadata only)
  app.post("/api/developer/projects/:id/documents", requireRole("DEVELOPER"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project || project.developerId !== req.user.id) {
      return res.status(404).json({ message: "Project not found" });
    }
    const { type, filename } = req.body;
    if (!type || !filename) return res.status(400).json({ message: "type and filename required" });

    const doc = await storage.createDocument({
      projectId: project.id,
      type,
      filename,
      filePath: `/uploads/${project.id}/${filename}`,
      uploadedBy: req.user.id,
    });

    // Update checklist items based on doc type
    const keyMap: Record<string, string> = {
      SITE_CONTROL: "site_control",
      INTERCONNECTION: "interconnection",
      PERMITS: "permitting",
      FINANCIAL_MODEL: "financial_model",
      FEOC_ATTESTATION: "feoc_attestation",
      EPC: "epc_contract",
      INSURANCE: "insurance",
    };
    const checklistKey = keyMap[type];
    if (checklistKey) {
      const checklist = await storage.getChecklistByProject(project.id);
      const item = checklist.find(c => c.key === checklistKey);
      if (item) {
        await storage.updateChecklistItem(item.id, { status: "UPLOADED" });
      }
    }

    // Recompute readiness
    const documents = await storage.getDocumentsByProject(project.id);
    const checklist = await storage.getChecklistByProject(project.id);
    const capitalStack = await storage.getCapitalStack(project.id);
    const updatedProject = await storage.getProject(project.id);
    if (updatedProject) {
      const scoreResult = computeReadiness(updatedProject, documents, checklist, capitalStack);
      await storage.updateReadinessScore(project.id, {
        score: scoreResult.score,
        rating: scoreResult.rating,
        reasons: JSON.stringify(scoreResult.reasons),
        flags: JSON.stringify(scoreResult.flags),
      });
    }

    res.json(doc);
  });

  // Update interest status (accept/decline)
  app.patch("/api/developer/interests/:id", requireRole("DEVELOPER"), async (req: any, res) => {
    const { status } = req.body;
    if (!["ACCEPTED_BY_DEV", "DECLINED_BY_DEV"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateInterest(req.params.id, { status });
    if (!updated) return res.status(404).json({ message: "Interest not found" });
    res.json(updated);
  });

  // ═══ Investor Routes ═══

  // Browse approved projects (deal list)
  app.get("/api/investor/deals", requireRole("INVESTOR"), async (req: any, res) => {
    const projects = await storage.getProjectsByStatus("APPROVED");
    const result = await Promise.all(
      projects.map(async (p) => {
        const score = await storage.getReadinessScore(p.id);
        const capitalStack = await storage.getCapitalStack(p.id);
        const interests = await storage.getInterestsByProject(p.id);
        const totalInterest = interests.reduce((sum, i) => sum + (Number(i.amountIntent) || 0), 0);
        return {
          ...p,
          readinessScore: score ? { score: score.score, rating: score.rating } : null,
          capitalStack: capitalStack ? {
            totalCapex: capitalStack.totalCapex,
            equityNeeded: capitalStack.equityNeeded,
            taxCreditEstimated: capitalStack.taxCreditEstimated,
            taxCreditType: capitalStack.taxCreditType,
          } : null,
          totalInterest,
          interestCount: interests.length,
        };
      })
    );
    res.json(result);
  });

  // Deal room detail
  app.get("/api/investor/deals/:id", requireRole("INVESTOR"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project || project.status !== "APPROVED") {
      return res.status(404).json({ message: "Deal not found" });
    }
    const score = await storage.getReadinessScore(project.id);
    const capitalStack = await storage.getCapitalStack(project.id);
    const documents = await storage.getDocumentsByProject(project.id);
    const checklist = await storage.getChecklistByProject(project.id);
    const developer = await storage.getUser(project.developerId);

    const myInterests = await storage.getInterestsByInvestor(req.user.id);
    const myInterest = myInterests.find(i => i.projectId === project.id);

    res.json({
      project,
      readinessScore: score ? {
        ...score,
        reasons: score.reasons ? JSON.parse(score.reasons) : [],
        flags: score.flags ? JSON.parse(score.flags) : {},
      } : null,
      capitalStack,
      documents,
      checklist,
      developer: developer ? { name: developer.name, orgName: developer.orgName } : null,
      myInterest: myInterest || null,
    });
  });

  // Submit interest
  app.post("/api/investor/deals/:id/interest", requireRole("INVESTOR"), async (req: any, res) => {
    try {
      const data = investorInterestFormSchema.parse(req.body);
      const project = await storage.getProject(req.params.id);
      if (!project || project.status !== "APPROVED") {
        return res.status(404).json({ message: "Deal not found" });
      }

      // Check if already submitted
      const existing = await storage.getInterestsByInvestor(req.user.id);
      const alreadySubmitted = existing.find(i => i.projectId === project.id && i.status === "SUBMITTED");
      if (alreadySubmitted) {
        return res.status(400).json({ message: "You already have an active interest submission for this project" });
      }

      const interest = await storage.createInterest({
        projectId: project.id,
        investorId: req.user.id,
        amountIntent: data.amountIntent,
        structurePreference: data.structurePreference,
        timeline: data.timeline,
        message: data.message || null,
        status: "SUBMITTED",
      });

      res.json(interest);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // My interests
  app.get("/api/investor/interests", requireRole("INVESTOR"), async (req: any, res) => {
    const interests = await storage.getInterestsByInvestor(req.user.id);
    const result = await Promise.all(
      interests.map(async (i) => {
        const project = await storage.getProject(i.projectId);
        return { ...i, projectName: project?.name || "Unknown", projectState: project?.state || "" };
      })
    );
    res.json(result);
  });

  // ═══ Admin Routes ═══

  // Admin stats
  app.get("/api/admin/stats", requireRole("ADMIN"), async (req: any, res) => {
    const allProjects = await storage.getAllProjects();
    const allInterests = await storage.getAllInterests();
    const totalIntentAmount = allInterests.reduce((sum, i) => sum + (Number(i.amountIntent) || 0), 0);

    const scores = await Promise.all(allProjects.map(p => storage.getReadinessScore(p.id)));
    const validScores = scores.filter(Boolean) as any[];
    const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length) : 0;

    res.json({
      totalProjects: allProjects.length,
      submitted: allProjects.filter(p => p.status === "SUBMITTED").length,
      inReview: allProjects.filter(p => p.status === "IN_REVIEW").length,
      approved: allProjects.filter(p => p.status === "APPROVED").length,
      rejected: allProjects.filter(p => p.status === "REJECTED").length,
      avgReadinessScore: avgScore,
      totalIntentAmount,
      totalInterests: allInterests.length,
    });
  });

  // Admin project list (review queue)
  app.get("/api/admin/projects", requireRole("ADMIN"), async (req: any, res) => {
    const allProjects = await storage.getAllProjects();
    const result = await Promise.all(
      allProjects.map(async (p) => {
        const score = await storage.getReadinessScore(p.id);
        const developer = await storage.getUser(p.developerId);
        return {
          ...p,
          readinessScore: score ? { score: score.score, rating: score.rating } : null,
          developerName: developer?.name || "Unknown",
          developerOrg: developer?.orgName || "",
        };
      })
    );
    res.json(result);
  });

  // Admin project detail (full data room view)
  app.get("/api/admin/projects/:id", requireRole("ADMIN"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const score = await storage.getReadinessScore(project.id);
    const capitalStack = await storage.getCapitalStack(project.id);
    const checklist = await storage.getChecklistByProject(project.id);
    const documents = await storage.getDocumentsByProject(project.id);
    const interests = await storage.getInterestsByProject(project.id);
    const logs = await storage.getApprovalLogs(project.id);
    const developer = await storage.getUser(project.developerId);

    const enrichedInterests = await Promise.all(
      interests.map(async (i) => {
        const investor = await storage.getUser(i.investorId);
        return { ...i, investorName: investor?.name || "Unknown", investorOrg: investor?.orgName || "" };
      })
    );

    const enrichedLogs = await Promise.all(
      logs.map(async (l) => {
        const admin = await storage.getUser(l.adminId);
        return { ...l, adminName: admin?.name || "Unknown" };
      })
    );

    res.json({
      project,
      readinessScore: score ? {
        ...score,
        reasons: score.reasons ? JSON.parse(score.reasons) : [],
        flags: score.flags ? JSON.parse(score.flags) : {},
      } : null,
      capitalStack,
      checklist,
      documents,
      interests: enrichedInterests,
      logs: enrichedLogs,
      developer: developer ? { name: developer.name, orgName: developer.orgName, email: developer.email } : null,
    });
  });

  // Admin actions: approve/reject/request-changes
  app.post("/api/admin/projects/:id/action", requireRole("ADMIN"), async (req: any, res) => {
    const { action, notes } = req.body;
    if (!["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const statusMap: Record<string, string> = {
      APPROVE: "APPROVED",
      REJECT: "REJECTED",
      REQUEST_CHANGES: "DRAFT",
    };

    await storage.updateProject(project.id, { status: statusMap[action] });
    await storage.createApprovalLog({
      projectId: project.id,
      adminId: req.user.id,
      action,
      notes: notes || null,
    });

    const updated = await storage.getProject(project.id);
    res.json(updated);
  });

  // Admin score override
  app.post("/api/admin/projects/:id/override-score", requireRole("ADMIN"), async (req: any, res) => {
    const { score, notes } = req.body;
    if (typeof score !== "number" || score < 0 || score > 100) {
      return res.status(400).json({ message: "Score must be between 0 and 100" });
    }
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    let rating = "YELLOW";
    if (score >= 75) rating = "GREEN";
    else if (score < 50) rating = "RED";

    await storage.updateReadinessScore(project.id, {
      score,
      rating,
      overriddenByAdmin: true,
      overrideNotes: notes || null,
    });

    await storage.createApprovalLog({
      projectId: project.id,
      adminId: req.user.id,
      action: "OVERRIDE_SCORE",
      notes: `Score overridden to ${score} (${rating}). ${notes || ""}`,
    });

    const updatedScore = await storage.getReadinessScore(project.id);
    res.json(updatedScore);
  });

  // Admin users list
  app.get("/api/admin/users", requireRole("ADMIN"), async (req: any, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
      orgName: u.orgName,
      createdAt: u.createdAt,
    })));
  });

  // Export packet data (JSON for the frontend to render as printable HTML)
  app.get("/api/admin/projects/:id/export", requireRole("ADMIN"), async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const score = await storage.getReadinessScore(project.id);
    const capitalStack = await storage.getCapitalStack(project.id);
    const checklist = await storage.getChecklistByProject(project.id);
    const documents = await storage.getDocumentsByProject(project.id);
    const developer = await storage.getUser(project.developerId);
    const interests = await storage.getInterestsByProject(project.id);

    res.json({
      project,
      readinessScore: score ? {
        ...score,
        reasons: score.reasons ? JSON.parse(score.reasons) : [],
        flags: score.flags ? JSON.parse(score.flags) : {},
      } : null,
      capitalStack,
      checklist,
      documents,
      developer: developer ? { name: developer.name, orgName: developer.orgName } : null,
      totalInterest: interests.reduce((sum, i) => sum + (Number(i.amountIntent) || 0), 0),
      interestCount: interests.length,
      generatedAt: new Date().toISOString(),
    });
  });

  return httpServer;
}
