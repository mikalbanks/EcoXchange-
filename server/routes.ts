import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { storage, verifyPassword, hashPassword, computeReadiness, generateChecklist, computeCapitalStack } from "./storage";
import { loginSchema, signupSchema, projectWizardStep1Schema, projectWizardStep2Schema, projectWizardStep3Schema, investorInterestFormSchema } from "@shared/schema";
import { z } from "zod";
import pool from "./db";
import { buildSeasonalForecast } from "./lib/yieldForecast";
import { generateROIPrediction, type ProjectFinancialData } from "./lib/ai-predictions";
import * as scadaService from "./lib/scada-service";

const SessionStore = MemoryStore(session);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; }
  catch { return fallback; }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.set("trust proxy", 1);
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({ checkPeriod: 86400000 }),
      cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: "lax" },
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
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName, personaStatus: user.personaStatus } });
  });

  app.post("/api/auth/login", authLimiter, async (req: any, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !verifyPassword(data.password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName, personaStatus: user.personaStatus } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/signup", authLimiter, async (req: any, res) => {
    try {
      const data = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) return res.status(400).json({ message: "Email already registered" });
      const user = await storage.createUser({
        email: data.email,
        passwordHash: hashPassword(data.password),
        role: data.role,
        name: data.email.split("@")[0],
        orgName: null,
      });
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, orgName: user.orgName, personaStatus: user.personaStatus } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy(() => { res.json({ message: "Logged out" }); });
  });

  // ═══ Persona Verification Routes ═══

  app.post("/api/persona/inquiry", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.role === "ADMIN") {
        return res.status(403).json({ message: "Admin users do not require verification" });
      }

      if (user.personaStatus === "completed") {
        return res.json({ status: "completed", message: "Already verified" });
      }

      const PERSONA_API_KEY = process.env.PERSONA_API_KEY;
      const PERSONA_TEMPLATE_ID = process.env.PERSONA_TEMPLATE_ID;

      if (!PERSONA_API_KEY) {
        await storage.updateUser(user.id, {
          personaStatus: "completed",
          personaVerifiedAt: new Date(),
        });
        return res.json({ status: "completed", message: "Identity verified (demo mode)" });
      }

      if (!PERSONA_TEMPLATE_ID) {
        return res.status(500).json({ message: "Persona template not configured. Contact administrator." });
      }

      const personaRes = await fetch("https://withpersona.com/api/v1/inquiries", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERSONA_API_KEY}`,
          "Content-Type": "application/json",
          "Persona-Version": "2023-01-05",
          "Key-Inflection": "camel",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              inquiryTemplateId: PERSONA_TEMPLATE_ID,
              referenceId: user.id,
              fields: {
                nameFirst: { type: "string", value: user.name.split(" ")[0] || "" },
                nameLast: { type: "string", value: user.name.split(" ").slice(1).join(" ") || "" },
                emailAddress: { type: "string", value: user.email },
              },
            },
          },
        }),
      });

      if (!personaRes.ok) {
        const errorText = await personaRes.text();
        console.error("Persona API error (falling back to demo mode):", errorText);
        await storage.updateUser(user.id, {
          personaStatus: "completed",
          personaVerifiedAt: new Date(),
        });
        return res.json({ status: "completed", message: "Identity verified (demo mode)" });
      }

      const personaData = await personaRes.json();
      const inquiryId = personaData.data?.id;
      const sessionToken = personaData.data?.attributes?.sessionToken || personaData.meta?.sessionToken;

      if (!inquiryId) {
        return res.status(500).json({ message: "Invalid response from verification provider" });
      }

      await storage.updateUser(user.id, {
        personaInquiryId: inquiryId,
        personaStatus: "pending",
      });

      res.json({ inquiryId, sessionToken });
    } catch (error: any) {
      console.error("Persona inquiry error (falling back to demo mode):", error);
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          await storage.updateUser(user.id, {
            personaStatus: "completed",
            personaVerifiedAt: new Date(),
          });
          return res.json({ status: "completed", message: "Identity verified (demo mode)" });
        }
      } catch {}
      res.status(500).json({ message: "Failed to create verification inquiry" });
    }
  });

  app.get("/api/persona/status", requireAuth, async (req: any, res) => {
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    res.json({
      personaStatus: user.personaStatus,
      personaVerifiedAt: user.personaVerifiedAt,
      personaInquiryId: user.personaInquiryId,
    });
  });

  app.post("/api/persona/webhook", async (req: any, res) => {
    try {
      const PERSONA_WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET;

      // [SECURITY RISK] In production, PERSONA_WEBHOOK_SECRET must be set to validate webhook
      // signatures. Without it, any caller can forge identity verification events.
      // Demo mode is intentionally permissive — do NOT deploy to production without this secret.
      if (!PERSONA_WEBHOOK_SECRET) {
        console.warn("[SECURITY RISK] Persona webhook: PERSONA_WEBHOOK_SECRET not set — accepting unverified webhooks. Demo mode only. Set this env var before production.");
      }
      if (PERSONA_WEBHOOK_SECRET) {
        const signature = req.headers["persona-signature"] || "";
        const rawBody = JSON.stringify(req.body);

        const expectedSig = crypto
          .createHmac("sha256", PERSONA_WEBHOOK_SECRET)
          .update(rawBody)
          .digest("hex");

        const sigParts = signature.split(",");
        const receivedSig = sigParts.find((p: string) => p.startsWith("v1="))?.replace("v1=", "") || "";

        if (receivedSig && receivedSig !== expectedSig) {
          console.warn("Persona webhook: invalid signature");
          return res.status(401).json({ message: "Invalid signature" });
        }
      }

      const event = req.body;
      const eventType = event?.data?.attributes?.name || event?.data?.attributes?.status || "";
      const inquiryId = event?.data?.relationships?.inquiry?.data?.id || event?.data?.id;
      const referenceId = event?.data?.attributes?.referenceId || event?.data?.attributes?.payload?.data?.attributes?.referenceId;

      console.log(`Persona webhook received: event=${eventType}, inquiryId=${inquiryId}, referenceId=${referenceId}`);

      let user;
      if (referenceId) {
        user = await storage.getUser(referenceId);
      }
      if (!user && inquiryId) {
        user = await storage.getUserByPersonaInquiryId(inquiryId);
      }

      if (!user) {
        console.warn("Persona webhook: no user found for inquiry", inquiryId);
        return res.status(200).json({ received: true });
      }

      const status = event?.data?.attributes?.status;
      const now = new Date();

      const updates: Record<string, any> = {
        personaLastEventAt: now,
        personaPayload: JSON.stringify({ eventType, status, inquiryId, receivedAt: now.toISOString() }),
      };

      if (status === "completed" || status === "approved") {
        updates.personaStatus = "completed";
        updates.personaVerifiedAt = now;
      } else if (status === "failed" || status === "declined") {
        updates.personaStatus = "failed";
      } else if (status === "pending" || status === "created") {
        updates.personaStatus = "pending";
      }

      await storage.updateUser(user.id, updates);
      console.log(`Persona webhook: updated user ${user.id} status to ${updates.personaStatus || "unchanged"}`);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Persona webhook error:", error);
      res.status(200).json({ received: true });
    }
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
      if (req.user.personaStatus !== "completed") {
        return res.status(403).json({ message: "Identity verification required before submitting projects" });
      }

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
        reasons: safeJsonParse(score.reasons, []),
        flags: safeJsonParse(score.flags, {}),
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
        reasons: safeJsonParse(score.reasons, []),
        flags: safeJsonParse(score.flags, {}),
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
      if (req.user.personaStatus !== "completed") {
        return res.status(403).json({ message: "Identity verification required before submitting interest" });
      }

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
        reasons: safeJsonParse(score.reasons, []),
        flags: safeJsonParse(score.flags, {}),
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
      personaStatus: u.personaStatus,
      personaInquiryId: u.personaInquiryId,
      personaVerifiedAt: u.personaVerifiedAt,
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
        reasons: safeJsonParse(score.reasons, []),
        flags: safeJsonParse(score.flags, {}),
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

  // ─── Yield Pipeline Routes ────────────────────────────────────────────────

  app.get("/api/projects/:id/yield", requireAuth, async (req: any, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const [ppas, production, revenue, distributions] = await Promise.all([
      storage.getPpasByProject(project.id),
      storage.getProductionByProject(project.id),
      storage.getRevenueByProject(project.id),
      storage.getDistributionsByProject(project.id),
    ]);

    const totalProduction = production.reduce((s, p) => s + parseFloat(p.productionMwh), 0);
    const totalGrossRevenue = revenue.reduce((s, r) => s + parseFloat(r.grossRevenue), 0);
    const totalNetRevenue = revenue.reduce((s, r) => s + parseFloat(r.netRevenue), 0);
    const totalDistributed = distributions
      .filter(d => d.status === "DISTRIBUTED")
      .reduce((s, d) => s + parseFloat(d.investorShare), 0);
    const avgCapacityFactor = production.length > 0
      ? production.reduce((s, p) => s + parseFloat(p.capacityFactor || "0"), 0) / production.length
      : 0;

    res.json({
      ppas,
      production,
      revenue,
      distributions,
      summary: {
        totalProductionMwh: Math.round(totalProduction * 100) / 100,
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        totalDistributed: Math.round(totalDistributed * 100) / 100,
        avgCapacityFactor: Math.round(avgCapacityFactor * 10000) / 10000,
        periodsReported: production.length,
      },
    });
  });

  // ═══ PVDAQ Telemetry Routes ═══

  app.get("/api/pvdaq/systems/:systemId/monthly", async (req, res) => {
    try {
      const systemId = Number(req.params.systemId);
      if (isNaN(systemId)) return res.status(400).json({ message: "Invalid system ID" });

      const result = await pool.query(
        `SELECT to_char(month, 'YYYY-MM') AS month,
                monthly_energy_kwh,
                avg_power_kw,
                peak_power_kw,
                sample_count,
                days_in_month,
                capacity_factor,
                assumed_ppa_usd_per_kwh,
                estimated_revenue_usd
           FROM pv_monthly_metrics
          WHERE system_id = $1
          ORDER BY month`,
        [systemId],
      );
      res.json(result.rows);
    } catch (err) {
      console.error("PVDAQ monthly error:", err);
      res.status(500).json({ message: "Failed to fetch monthly metrics" });
    }
  });

  app.get("/api/pvdaq/systems/:systemId/kpis", async (req, res) => {
    try {
      const systemId = Number(req.params.systemId);
      if (isNaN(systemId)) return res.status(400).json({ message: "Invalid system ID" });

      const systemResult = await pool.query(
        `SELECT * FROM pv_systems WHERE system_id = $1`,
        [systemId],
      );
      const system = systemResult.rows[0];
      if (!system) return res.status(404).json({ message: "System not found" });

      const metricsResult = await pool.query(
        `SELECT
            COUNT(*) AS total_months,
            MIN(month) AS start_month,
            MAX(month) AS end_month,
            COALESCE(SUM(monthly_energy_kwh) / 1000.0, 0) AS total_mwh,
            COALESCE(AVG(monthly_energy_kwh) / 30.0 / 1000.0, 0) AS avg_daily_mwh,
            COALESCE(SUM(estimated_revenue_usd), 0) AS total_revenue_usd
         FROM pv_monthly_metrics
         WHERE system_id = $1`,
        [systemId],
      );
      const metrics = metricsResult.rows[0];

      const trailing12Result = await pool.query(
        `SELECT COALESCE(SUM(estimated_revenue_usd), 0) AS trailing_12mo_revenue
         FROM (
           SELECT estimated_revenue_usd
           FROM pv_monthly_metrics
           WHERE system_id = $1
           ORDER BY month DESC
           LIMIT 12
         ) sub`,
        [systemId],
      );

      res.json({
        system_id: system.system_id,
        public_name: system.public_name,
        capacity_kw: system.capacity_kw,
        technology: system.technology,
        tracking_type: system.tracking_type,
        location_state: system.location_state,
        total_mwh: Number(Number(metrics.total_mwh).toFixed(2)),
        avg_daily_mwh: Number(Number(metrics.avg_daily_mwh).toFixed(2)),
        total_revenue_usd: Number(Number(metrics.total_revenue_usd).toFixed(2)),
        trailing_12mo_revenue: Number(Number(trailing12Result.rows[0].trailing_12mo_revenue).toFixed(2)),
        start_month: metrics.start_month,
        end_month: metrics.end_month,
        total_months: Number(metrics.total_months),
      });
    } catch (err) {
      console.error("PVDAQ KPIs error:", err);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get("/api/pvdaq/systems/:systemId/forecast", async (req, res) => {
    try {
      const systemId = Number(req.params.systemId);
      if (isNaN(systemId)) return res.status(400).json({ message: "Invalid system ID" });

      const ppa = Number(req.query.ppa ?? 0.085);
      const degradation = Number(req.query.degradation ?? 0.005);

      if (isNaN(ppa) || ppa <= 0 || ppa > 1) return res.status(400).json({ message: "PPA rate must be between 0 and 1" });
      if (isNaN(degradation) || degradation < 0 || degradation > 0.1) return res.status(400).json({ message: "Degradation rate must be between 0 and 0.1" });

      const history = await pool.query(
        `SELECT to_char(month, 'YYYY-MM') AS month,
                monthly_energy_kwh
           FROM pv_monthly_metrics
          WHERE system_id = $1
          ORDER BY month`,
        [systemId],
      );

      if (history.rows.length === 0) {
        return res.status(404).json({ message: "No historical data found" });
      }

      const forecast = buildSeasonalForecast(history.rows, ppa, degradation, 12);
      res.json(forecast);
    } catch (err) {
      console.error("PVDAQ forecast error:", err);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  app.get("/api/pvdaq/systems", async (_req, res) => {
    try {
      const result = await pool.query("SELECT * FROM pv_systems ORDER BY system_id");
      res.json(result.rows);
    } catch (err) {
      console.error("PVDAQ systems error:", err);
      res.status(500).json({ message: "Failed to fetch systems" });
    }
  });

  // ─── SCADA Project-Level Routes ─────────────────────────────────────

  const requireProjectAccess = async (req: any, res: any, next: any) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (user.role === "ADMIN") {
      req.project = project;
      return next();
    }
    if (user.role === "DEVELOPER" && project.developerId === user.id) {
      req.project = project;
      return next();
    }
    if (user.role === "INVESTOR" && project.status === "APPROVED") {
      req.project = project;
      return next();
    }
    return res.status(403).json({ message: "Access denied" });
  };

  const FEATURED_PROJECT_IDS = new Set(["proj3"]);

  app.get("/api/public/projects/:id/scada/summary", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getProjectSummary(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/public/projects/:id/scada/health", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getHealthStatus(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/public/projects/:id/scada/monthly", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getMonthlyHistory(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/public/projects/:id/scada/forecast", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getForecast(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/public/projects/:id/scada/revenue-bridge", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getRevenueBridge(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/public/projects/:id/scada/distributions", async (req: any, res) => {
    try {
      if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
      const result = await scadaService.getDistributions(req.params.id);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch" });
    }
  });

  app.get("/api/projects/:id/scada/summary", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getProjectSummary(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA summary error:", err);
      res.status(500).json({ message: "Failed to fetch SCADA summary" });
    }
  });

  app.get("/api/projects/:id/scada/monthly", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getMonthlyHistory(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA monthly error:", err);
      res.status(500).json({ message: "Failed to fetch monthly history" });
    }
  });

  app.get("/api/projects/:id/scada/forecast", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const ppaRateRaw = req.query.ppaRate as string | undefined;
      const degradationRaw = req.query.degradation as string | undefined;
      const monthsRaw = req.query.months as string | undefined;

      let ppaRate: number | undefined;
      let degradation: number | undefined;
      let months: number | undefined;

      if (ppaRateRaw !== undefined) {
        ppaRate = parseFloat(ppaRateRaw);
        if (isNaN(ppaRate) || ppaRate < 0 || ppaRate > 1) return res.status(400).json({ message: "ppaRate must be a number between 0 and 1" });
      }
      if (degradationRaw !== undefined) {
        degradation = parseFloat(degradationRaw);
        if (isNaN(degradation) || degradation < 0 || degradation > 0.1) return res.status(400).json({ message: "degradation must be a number between 0 and 0.1" });
      }
      if (monthsRaw !== undefined) {
        months = parseInt(monthsRaw);
        if (isNaN(months) || months < 1 || months > 60) return res.status(400).json({ message: "months must be an integer between 1 and 60" });
      }

      const result = await scadaService.getForecast(req.params.id, ppaRate, degradation, months);
      if (!result) return res.status(404).json({ message: "Project not found or no production data" });
      res.json(result);
    } catch (err) {
      console.error("SCADA forecast error:", err);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  app.get("/api/projects/:id/scada/health", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getHealthStatus(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA health error:", err);
      res.status(500).json({ message: "Failed to fetch health status" });
    }
  });

  app.get("/api/projects/:id/scada/ingestion", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getIngestionStatus(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA ingestion error:", err);
      res.status(500).json({ message: "Failed to fetch ingestion status" });
    }
  });

  app.get("/api/projects/:id/scada/revenue-bridge", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getRevenueBridge(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA revenue bridge error:", err);
      res.status(500).json({ message: "Failed to fetch revenue bridge" });
    }
  });

  app.get("/api/projects/:id/scada/distributions", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const result = await scadaService.getDistributions(req.params.id);
      if (!result) return res.status(404).json({ message: "Project not found" });
      res.json(result);
    } catch (err) {
      console.error("SCADA distributions error:", err);
      res.status(500).json({ message: "Failed to fetch distributions" });
    }
  });

  app.get("/api/scada/connectors", requireAuth, async (_req: any, res) => {
    try {
      const connectors = await storage.getAllScadaConnectors();
      res.json(connectors);
    } catch (err) {
      console.error("SCADA connectors error:", err);
      res.status(500).json({ message: "Failed to fetch connectors" });
    }
  });

  app.get("/api/projects/:id/scada/data-sources", requireAuth, requireProjectAccess, async (req: any, res) => {
    try {
      const sources = await storage.getScadaDataSourcesByProject(req.params.id);
      res.json(sources);
    } catch (err) {
      console.error("SCADA data sources error:", err);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  app.get("/api/operations/data-sources", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || (user.role !== "ADMIN" && user.role !== "DEVELOPER")) {
        return res.status(403).json({ message: "Not authorized" });
      }

      let projects: any[];
      if (user.role === "ADMIN") {
        projects = await storage.getAllProjects();
      } else {
        projects = await storage.getProjectsByDeveloper(user.id);
      }

      const result: Array<{ project: { id: string; name: string; technology: string; capacityMW: string | null }; sources: any[] }> = [];
      for (const p of projects) {
        const sources = await storage.getScadaDataSourcesByProject(p.id);
        if (sources.length > 0) {
          result.push({
            project: { id: p.id, name: p.name, technology: p.technology, capacityMW: p.capacityMW },
            sources,
          });
        }
      }
      res.json(result);
    } catch (err) {
      console.error("Operations data sources error:", err);
      res.status(500).json({ message: "Failed to fetch operations data" });
    }
  });

  // ─── AI Financial Prediction ──────────────────────────────────────
  app.post("/api/projects/:id/ai-prediction", requireAuth, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      if (user.role === "INVESTOR" && project.status !== "APPROVED") {
        return res.status(403).json({ message: "Project not available" });
      }
      if (user.role === "DEVELOPER" && project.developerId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const capitalStack = await storage.getCapitalStack(projectId);
      const ppas = await storage.getPpasByProject(projectId);
      const production = await storage.getProductionByProject(projectId);
      const revenue = await storage.getRevenueByProject(projectId);
      const distributions = await storage.getDistributionsByProject(projectId);

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyProduction = production.map((p) => ({
        month: `${months[p.periodStart.getMonth()]} ${p.periodStart.getFullYear()}`,
        mwh: Number(p.productionMwh),
      }));

      const totalGross = revenue.reduce((sum, r) => sum + Number(r.grossRevenue), 0);
      const totalNet = revenue.reduce((sum, r) => sum + Number(r.netRevenue), 0);
      const totalDistributed = distributions.reduce((sum, d) => sum + Number(d.investorShare), 0);

      const totalMwh = production.reduce((sum, p) => sum + Number(p.productionMwh), 0);
      const hoursInYear = 8760;
      const capacityFactor = totalMwh > 0 ? totalMwh / (Number(project.capacityMW) * hoursInYear) : undefined;

      const ppa = ppas[0];
      const contractYears = ppa
        ? Math.round((ppa.contractEndDate.getTime() - ppa.contractStartDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined;

      const financialData: ProjectFinancialData = {
        projectName: project.name,
        capacityMW: project.capacityMW || "0",
        technology: project.technology || "SOLAR",
        stage: project.stage || "PRE_NTP",
        state: project.state,
        totalCapex: capitalStack?.totalCapex || undefined,
        taxCreditEstimated: capitalStack?.taxCreditEstimated || undefined,
        equityNeeded: capitalStack?.equityNeeded || undefined,
        ppaRate: ppa?.pricePerMwh || undefined,
        ppaEscalation: ppa?.escalationRate || undefined,
        offtakerName: ppa?.offtakerName || undefined,
        contractYears,
        monthlyProduction: monthlyProduction.length > 0 ? monthlyProduction : undefined,
        annualRevenue: totalGross > 0 ? { gross: totalGross, net: totalNet } : undefined,
        totalDistributed: totalDistributed > 0 ? totalDistributed : undefined,
        capacityFactor,
      };

      const prediction = await generateROIPrediction(financialData);
      res.json(prediction);
    } catch (error: any) {
      console.error("AI prediction error:", error);
      res.status(500).json({ message: "Failed to generate AI prediction" });
    }
  });

  return httpServer;
}
