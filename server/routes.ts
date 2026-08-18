import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { storage, verifyPassword, hashPassword, computeReadiness, generateChecklist, computeCapitalStack } from "./storage";
import { pool, isDatabaseConfigured, probeDatabase } from "./db";
import { createSessionStore, getSessionStoreKind } from "./session-store";
import { loginSchema, signupSchema, projectWizardStep1Schema, projectWizardStep2Schema, projectWizardStep3Schema, investorInterestFormSchema } from "@shared/schema";
import { z } from "zod";
import { generateROIPrediction, type ProjectFinancialData } from "./lib/ai-predictions";
import * as scadaService from "./lib/scada-service";
import { settleProject } from "./services/settle-project";
import { runSgtHandshake } from "./services/sgt-handshake";
import {
  runVerification,
  clearAnomalies,
  rejectVerificationRun,
} from "./services/verification-engine";
import { VerificationApprovalAction } from "@shared/schema";
import { csvConnector } from "./services/scada-connector";
import { validateProjectAgainstEia923, type ValidationResult } from "./lib/validator";
import { internalAgentRegistry } from "./services/internal-agents";
import { db } from "./db";
import { accounts as accountsTable, transactions as txTable, postings as postingsTable } from "@shared/schema";
import { eq, sql as dsql } from "drizzle-orm";
import {
  listQueueEntries,
  getQueueEntryDetail,
  computeAndPersistQueueAnalytics,
  runBatchQueueAnalytics,
} from "./queue-data";
import multer from "multer";
import { registerDeveloperBacktestRoutes } from "./routes/developer-backtest";
import { isSupabaseConfigured, probeSupabase } from "./services/backtest-supabase-writer";
import { registerDeveloperReportRoutes } from "./routes/developer-report";
import { registerDistributionRoutes } from "./routes/distributions";
import { registerPolymeshRoutes } from "./routes/polymesh";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { runtimeConfig } from "./runtime-config";
import { audit } from "./audit";

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

const backtestRunLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many backtest runs; try again later" },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await internalAgentRegistry.bootstrapDefaultAgents();

  app.set("trust proxy", 2);
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: await createSessionStore(),
      cookie: { secure: IS_PRODUCTION, httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: "lax" },
    })
  );

  app.get("/api/health", async (_req, res) => {
    const pvlibUrl = process.env.PVLIB_SERVICE_URL ?? "http://localhost:3004";
    const irradianceUrl =
      process.env.IRRADIANCE_MCP_URL ?? "http://localhost:3002/mcp";
    // The MCP server exposes /health alongside its /mcp transport endpoint.
    const irradianceHealth = irradianceUrl.replace(/\/mcp\/?$/, "") + "/health";

    const probe = async (url: string): Promise<"ok" | "unreachable"> => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
        return r.ok ? "ok" : "unreachable";
      } catch {
        return "unreachable";
      }
    };

    // The database is probed here on purpose: when DATABASE_URL pointed at a
    // paused Supabase project, sign-in was completely broken while this endpoint
    // still reported ok — every other route reads MemStorage. `sessionStore`
    // tells you whether sessions currently survive a restart.
    const probeDb = async (): Promise<"ok" | "unreachable" | "not_configured"> => {
      if (!isDatabaseConfigured()) return "not_configured";
      return (await probeDatabase(2000)) ? "ok" : "unreachable";
    };

    const [pvlib, irradiance, supabase, database] = await Promise.all([
      probe(`${pvlibUrl}/health`),
      probe(irradianceHealth),
      isSupabaseConfigured() ? probeSupabase() : Promise.resolve("not_configured"),
      probeDb(),
    ]);

    res.json({
      ok: true,
      uptime: process.uptime(),
      readiness: {
        personaConfigured: runtimeConfig.personaConfigured,
        persistentArtifacts: runtimeConfig.persistentArtifacts,
      },
      services: {
        pvlib,
        irradiance,
        supabase,
        database,
        sessionStore: getSessionStoreKind(),
      },
    });
  });

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

  // ═══ Internal Agent Routes ═══

  app.get("/api/internal-agents", requireAuth, async (_req: any, res) => {
    const agents = internalAgentRegistry.listAgents();
    res.json(agents);
  });

  app.get("/api/internal-agents/:id", requireAuth, async (req: any, res) => {
    const agent = internalAgentRegistry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Internal agent not found" });
    const runs = internalAgentRegistry.listRunsForAgent(agent.id);
    res.json({ agent, runs });
  });

  app.post("/api/internal-agents/:id/run", requireAuth, async (req: any, res) => {
    const context = req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>)
      : {};
    try {
      const run = await internalAgentRegistry.runAgent(req.params.id, req.session.userId || null, context);
      res.json(run);
    } catch (error: any) {
      if (error.message === "Agent not found") {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: "Failed to run internal agent" });
    }
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
        return res.status(503).json({
          status: "not_configured",
          message: "Identity verification is not configured. Verification has not been completed.",
        });
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
        console.error("Persona API request failed", { status: personaRes.status });
        return res.status(502).json({
          status: "provider_unavailable",
          message: "Identity verification provider is unavailable. Verification has not been completed.",
        });
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
      console.error("Persona inquiry error", error);
      res.status(502).json({
        status: "provider_unavailable",
        message: "Failed to create verification inquiry. Verification has not been completed.",
      });
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

      if (!PERSONA_WEBHOOK_SECRET) {
        console.error("Persona webhook rejected: PERSONA_WEBHOOK_SECRET is not configured");
        return res.status(503).json({ message: "Webhook verification is not configured" });
      }

      const signatureHeader = req.headers["persona-signature"];
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader || "";
      const receivedSig = signature
        .split(",")
        .map((part: string) => part.trim())
        .find((part: string) => part.startsWith("v1="))
        ?.slice(3) || "";
      const webhookBody = Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(JSON.stringify(req.body));
      const expectedSig = crypto
        .createHmac("sha256", PERSONA_WEBHOOK_SECRET)
        .update(webhookBody)
        .digest("hex");
      const received = Buffer.from(receivedSig, "hex");
      const expected = Buffer.from(expectedSig, "hex");

      if (
        !receivedSig
        || received.length !== expected.length
        || !crypto.timingSafeEqual(received, expected)
      ) {
        console.warn("Persona webhook rejected: invalid or missing signature");
        audit("persona_webhook_rejected", { reason: "invalid_signature" });
        return res.status(401).json({ message: "Invalid signature" });
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
      audit("persona_status_updated", {
        userId: user.id,
        inquiryId,
        status: updates.personaStatus || "unchanged",
      });
      console.log(`Persona webhook: updated user ${user.id} status to ${updates.personaStatus || "unchanged"}`);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Persona webhook error:", error);
      res.status(500).json({ received: false });
    }
  });

  // ═══ Developer Routes ═══

  // Developer Portal: project-intake backtest (SSE) — see routes/developer-backtest.ts
  registerDeveloperBacktestRoutes(app, requireRole);

  // Developer Portal: Production Verification Report (PDF) — see routes/developer-report.ts
  registerDeveloperReportRoutes(app, requireRole);

  // Spec 17: distribution waterfall, capital accounts and tax allocation.
  // Mounted under /api/v1/spv/... per the specification — the only versioned
  // prefix in this app. See routes/distributions.ts.
  registerDistributionRoutes(app, requireRole, requireAuth);

  // Spec 18 Layer A: Polymesh public chain reads. Reads are public — the data
  // is already on a public ledger and the transparency claim depends on anyone
  // being able to check it. See routes/polymesh.ts.
  registerPolymeshRoutes(app, requireRole);

  // Spec 22: performance analytics (RdTools degradation, soiling, availability).
  // Reads are public because the three reports they back are documents an owner
  // hands to a third party, and a report gated behind the reporting party's
  // login is not obviously independent of it. See routes/analytics.ts.
  registerAnalyticsRoutes(app);

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

  // Interconnection queue (GridStatus solar) — precomputed analytics
  app.get("/api/investor/queue-entries", requireRole("INVESTOR"), async (req: any, res) => {
    try {
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      const isoCode = typeof req.query.iso === "string" ? req.query.iso : undefined;
      const minMw = req.query.minMw != null ? Number(req.query.minMw) : undefined;
      const status = req.query.status === "READY" ? "READY" : "ALL";
      const limit = req.query.limit != null ? Number(req.query.limit) : 50;
      const offset = req.query.offset != null ? Number(req.query.offset) : 0;
      const { items, total } = await listQueueEntries({
        state,
        isoCode,
        minMw: Number.isFinite(minMw) ? minMw : undefined,
        status,
        limit,
        offset,
      });
      res.json({ items, total });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to list queue entries" });
    }
  });

  app.get("/api/investor/queue-entries/:id", requireRole("INVESTOR"), async (req: any, res) => {
    try {
      const row = await getQueueEntryDetail(req.params.id);
      if (!row) return res.status(404).json({ message: "Queue entry not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Failed to load queue entry" });
    }
  });

  const queueRecomputeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post(
    "/api/investor/queue-entries/:id/recompute",
    requireRole("INVESTOR"),
    queueRecomputeLimiter,
    async (req: any, res) => {
      try {
        const result = await computeAndPersistQueueAnalytics(req.params.id);
        res.json({ ok: true, result });
      } catch (e: any) {
        res.status(500).json({ message: e?.message || "Recompute failed" });
      }
    },
  );

  // ═══ Admin Routes ═══

  app.post("/api/admin/queue-analytics/batch", requireRole("ADMIN"), async (req: any, res) => {
    try {
      const limit = req.body?.limit != null ? Number(req.body.limit) : 20;
      const out = await runBatchQueueAnalytics(Number.isFinite(limit) ? limit : 20);
      res.json(out);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Batch failed" });
    }
  });

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

  // ─── Institutional Validation (Admin) ─────────────────────────────────────

  app.post("/api/admin/projects/:id/validate", requireRole("ADMIN"), async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const lat = project.latitude ? Number(project.latitude) : null;
      const lon = project.longitude ? Number(project.longitude) : null;
      const capacityKw = Number(project.capacityKw || 0);
      const capacityMw = Number(project.capacityMW || 0);
      const hasCapacity =
        (Number.isFinite(capacityKw) && capacityKw > 0) || (Number.isFinite(capacityMw) && capacityMw > 0);

      if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon)) {
        return res.status(400).json({ message: "Project is missing valid latitude/longitude" });
      }
      if (!hasCapacity) {
        return res.status(400).json({ message: "Project is missing valid capacity (kW or MW)" });
      }

      const result: ValidationResult = await validateProjectAgainstEia923(project.id);

      const updated = await storage.getProject(project.id);

      res.json({
        projectName: project.name,
        ...result,
        validationConfidence: result.validationConfidencePct,
        dataFidelity: "4km (NLR)",
        eiaPlantCode: updated?.eiaPlantCode ?? null,
        eiaGeneratorId: updated?.eiaGeneratorId ?? null,
        eiaReferencePlantName: result.eiaReferencePlantName ?? updated?.eiaReferencePlantName ?? null,
      });
    } catch (error: any) {
      console.error("Institutional validation error:", error);
      res.status(500).json({ message: error.message || "Validation failed" });
    }
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

  // Admin view of project-level investor commitments. /api/admin/stats only
  // exposes the aggregate; the admin console needs the individual rows to link
  // through to the project and the investor.
  app.get("/api/admin/interests", requireRole("ADMIN"), async (_req: any, res) => {
    const interests = await storage.getAllInterests();
    const rows = await Promise.all(
      interests.map(async (i) => {
        const [project, investor] = await Promise.all([
          storage.getProject(i.projectId),
          storage.getUser(i.investorId),
        ]);
        return {
          id: i.id,
          projectId: i.projectId,
          projectName: project?.name ?? "Unknown project",
          investorName: investor?.name ?? "Unknown investor",
          investorOrg: investor?.orgName ?? "",
          amountIntent: i.amountIntent,
          structurePreference: i.structurePreference,
          timeline: i.timeline,
          status: i.status,
          createdAt: i.createdAt,
        };
      })
    );
    // Largest commitments first — that is the order an admin triages in.
    rows.sort((a, b) => Number(b.amountIntent ?? 0) - Number(a.amountIntent ?? 0));
    res.json(rows);
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

  const FEATURED_PROJECT_IDS = new Set(["proj1", "proj3"]);

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

  app.get("/api/scada/connectors", requireRole("ADMIN", "DEVELOPER"), async (_req: any, res) => {
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

  app.get("/api/operations/data-sources", requireRole("ADMIN", "DEVELOPER"), async (req: any, res) => {
    try {
      const user = req.user;
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

  // ─── CSV Upload ──────────────────────────────────────────────────

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.post("/api/operations/csv-upload/preview", requireRole("ADMIN", "DEVELOPER"), upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = csvConnector.parseUpload(req.file.buffer, req.file.originalname);
      res.json({
        success: result.success,
        fieldMapping: result.fieldMapping,
        validation: result.validation,
        errors: result.errors,
        detectedGranularity: result.detectedGranularity,
        detectedFormat: result.detectedFormat,
        formatLabel: result.formatLabel,
        sampleRows: result.records.slice(0, 5).map(r => ({
          timestamp: r.timestamp.toISOString(),
          productionKwh: r.productionKwh,
          capacityFactor: r.capacityFactor,
        })),
      });
    } catch (err: unknown) {
      console.error("CSV preview error:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse CSV";
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/operations/csv-upload/ingest", requireRole("ADMIN", "DEVELOPER"), upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const projectId = req.body.projectId;
      if (!projectId) return res.status(400).json({ message: "projectId is required" });

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      if (req.user.role === "DEVELOPER" && project.developerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = csvConnector.parseUpload(req.file.buffer, req.file.originalname);
      if (!result.success || result.records.length === 0) {
        return res.status(400).json({ message: "CSV parse failed", errors: result.errors });
      }

      const replaceExisting = req.body.replaceExisting === "true";
      if (replaceExisting) {
        await storage.deleteProductionByProject(projectId);
      }

      const capacityMw = parseFloat(project.capacityMW || "0");

      const normalized = csvConnector.normalizeToSchema(
        result.records,
        result.detectedGranularity,
        capacityMw,
        "CSV_UPLOAD"
      );

      let deduped = normalized;
      if (!replaceExisting) {
        const existing = await storage.getProductionByProject(projectId);
        const existingKeys = new Set(existing.map(e =>
          `${new Date(e.periodStart).toISOString()}|${e.source}`
        ));
        deduped = normalized.filter(n =>
          !existingKeys.has(`${n.periodStart.toISOString()}|CSV_UPLOAD`)
        );
      }

      const insertRecords = deduped.map(n => ({
        projectId,
        periodStart: n.periodStart,
        periodEnd: n.periodEnd,
        productionMwh: n.productionMwh.toFixed(6),
        capacityFactor: n.capacityFactor?.toFixed(6) || null,
        source: "CSV_UPLOAD",
      }));

      const created = await storage.bulkCreateProduction(insertRecords);
      const skippedDupes = normalized.length - deduped.length;

      const PPA_RATE_PER_MWH = 72;
      const OPEX_RATIO = 0.15;
      for (const prod of created) {
        const mwh = parseFloat(prod.productionMwh);
        const gross = mwh * PPA_RATE_PER_MWH;
        const opex = gross * OPEX_RATIO;
        const net = gross - opex;
        await storage.createRevenue({
          projectId,
          ppaId: `ppa-${projectId}-default`,
          productionId: prod.id,
          periodStart: prod.periodStart,
          periodEnd: prod.periodEnd,
          grossRevenue: gross.toFixed(2),
          operatingExpenses: opex.toFixed(2),
          netRevenue: net.toFixed(2),
        });
      }

      const assessedQuality = csvConnector.assessDataQuality(result.validation);

      const allProjectProduction = await storage.getProductionByProject(projectId);
      const csvRecordCount = allProjectProduction.filter(p => p.source === "CSV_UPLOAD").length;

      const dataSources = await storage.getScadaDataSourcesByProject(projectId);
      const csvSource = dataSources.find(s => s.sourceType === "CSV_UPLOAD");
      if (csvSource) {
        await storage.updateScadaDataSource(csvSource.id, {
          status: "ACTIVE",
          dataQuality: assessedQuality,
          lastSyncAt: new Date(),
          recordCount: csvRecordCount,
        });
      } else {
        await storage.createScadaDataSource({
          projectId,
          sourceType: "CSV_UPLOAD",
          providerName: "CSV Import",
          status: "ACTIVE",
          dataQuality: assessedQuality,
          lastSyncAt: new Date(),
          recordCount: csvRecordCount,
          connectorId: null,
          configJson: null,
          notes: `Uploaded from ${req.file.originalname} (${result.detectedGranularity} granularity, ${result.validation.coveragePercent}% coverage)`,
        });
      }

      res.json({
        success: true,
        recordsIngested: created.length,
        skippedDuplicates: skippedDupes,
        validation: result.validation,
        projectId,
      });
    } catch (err: unknown) {
      console.error("CSV ingest error:", err);
      const msg = err instanceof Error ? err.message : "Failed to ingest CSV";
      res.status(500).json({ message: msg });
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

  // ═══ SGT Pipeline Status (Public) ═══

  app.get("/api/public/sgt-pipeline-status", async (_req, res) => {
    try {
      const allProjects = await storage.getAllProjects();
      const approvedProjects = allProjects.filter(p => p.status === "APPROVED");

      const projectStatuses = [];
      for (const project of approvedProjects) {
        const capacityKw = Number(project.capacityKw || 0);
        const hasSolcastKey = !!process.env.SOLCAST_API_KEY;
        const hasCoords = !!(project.latitude && project.longitude);

        const projectAccounts = await db
          .select()
          .from(accountsTable)
          .where(eq(accountsTable.projectId, project.id));

        const hasWaterfallAccounts = projectAccounts.length >= 5;

        projectStatuses.push({
          projectId: project.id,
          projectName: project.name,
          capacityMW: project.capacityMW,
          state: project.state,
          latitude: project.latitude,
          longitude: project.longitude,
          pipeline: {
            skyOracle: { status: hasSolcastKey && hasCoords ? "CONNECTED" : "STANDBY", provider: "Solcast Satellite API" },
            utilityShadow: { status: "ACTIVE", provider: "Utility Shadow v2026.1" },
            sgtHandshake: { status: hasSolcastKey ? "READY" : "FALLBACK_MODE", provider: "SGT Handshake Orchestrator" },
            waterfallEngine: { status: hasWaterfallAccounts ? "CONFIGURED" : "PENDING_SETUP", provider: "Double-Entry Waterfall Engine" },
            securitizeBridge: { status: "MOCK", provider: "Securitize RWA Protocol (Mock)" },
          },
        });
      }

      res.json({
        pipelineVersion: "v2026.1",
        totalProjects: approvedProjects.length,
        solcastConnected: !!process.env.SOLCAST_API_KEY,
        utilityShadowActive: true,
        projects: projectStatuses,
      });
    } catch (err: any) {
      console.error("Pipeline status error:", err);
      res.status(500).json({ message: "Failed to fetch pipeline status" });
    }
  });

  // ═══ SGT Handshake Route ═══

  app.post("/api/projects/:id/sgt-handshake", requireRole("ADMIN"), async (req: any, res) => {
    try {
      const projectId = req.params.id;
      console.log(`🤝 [SGT Handshake] Admin ${req.user.id} triggered handshake for project ${projectId}`);

      const result = await runSgtHandshake(projectId);

      res.json(result);
    } catch (error: any) {
      console.error("SGT Handshake error:", error);
      res.status(500).json({ message: error.message || "SGT Handshake failed" });
    }
  });

  // ═══ SGT Waterfall Settlement Routes ═══

  app.post("/api/projects/:id/settle", requireRole("ADMIN"), async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { fromDate, toDate } = req.body || {};

      let from: Date | undefined;
      let to: Date | undefined;

      if (fromDate) {
        from = new Date(fromDate);
        if (isNaN(from.getTime())) return res.status(400).json({ message: "Invalid fromDate" });
      }
      if (toDate) {
        to = new Date(toDate);
        if (isNaN(to.getTime())) return res.status(400).json({ message: "Invalid toDate" });
      }

      console.log(`🔄 [Settlement] Admin ${req.user.id} triggered settlement for project ${projectId}`);

      const result = await settleProject(projectId, from, to);

      console.log(`✅ [Settlement] Project ${projectId}: ${result.settlement.daysSettled} days settled, $${result.settlement.totalRevenueUsd.toFixed(2)} total revenue`);

      res.json(result);
    } catch (error: any) {
      console.error("Settlement error:", error);
      res.status(500).json({ message: error.message || "Settlement failed" });
    }
  });

  app.get("/api/projects/:id/waterfall-summary", requireRole("ADMIN", "DEVELOPER", "INVESTOR"), async (req: any, res) => {
    try {
      const projectId = req.params.id;

      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      if (req.user.role === "DEVELOPER" && project.developerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const projectAccounts = await db
        .select()
        .from(accountsTable)
        .where(eq(accountsTable.projectId, projectId));

      if (projectAccounts.length === 0) {
        return res.json({ accounts: [], totals: {}, recentTransactions: [] });
      }

      const accountIds = projectAccounts.map((a) => a.id);

      const balanceRows = await db.execute(dsql`
        SELECT p.account_id, p.direction, SUM(CAST(p.amount AS numeric)) as total
        FROM postings p
        WHERE p.account_id IN (${dsql.join(accountIds.map((id) => dsql`${id}`), dsql`, `)})
        GROUP BY p.account_id, p.direction
      `);

      const balanceMap = new Map<string, number>();
      for (const row of balanceRows.rows as any[]) {
        const acctId = row.account_id as string;
        const amount = Number(row.total || 0);
        const sign = row.direction === "CREDIT" ? 1 : -1;
        balanceMap.set(acctId, (balanceMap.get(acctId) || 0) + sign * amount);
      }

      const accountSummaries = projectAccounts.map((acct) => ({
        id: acct.id,
        code: acct.code,
        name: acct.name,
        accountType: acct.accountType,
        denominatedIn: acct.denominatedIn,
        balance: balanceMap.get(acct.id) || 0,
      }));

      const totals: Record<string, number> = {};
      for (const acct of accountSummaries) {
        totals[acct.accountType] = acct.balance;
      }

      const recentTxRows = await db
        .select()
        .from(txTable)
        .where(eq(txTable.projectId, projectId))
        .orderBy(dsql`${txTable.occurredAt} DESC`)
        .limit(30);

      res.json({
        accounts: accountSummaries,
        totals,
        recentTransactions: recentTxRows,
      });
    } catch (error: any) {
      console.error("Waterfall summary error:", error);
      res.status(500).json({ message: error.message || "Failed to get waterfall summary" });
    }
  });

  // ═══ Verification Engine Routes ═══

  app.get("/api/projects/:id/verification/runs", requireAuth, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (user.role === "DEVELOPER" && project.developerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { from, to, status, granularity, limit } = req.query as any;
      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);
      if (status) filters.status = status;
      if (granularity) filters.granularity = granularity;
      filters.limit = limit ? Math.min(500, Number(limit)) : 100;

      const runs = await storage.getVerificationRuns(projectId, filters);
      res.json({ runs });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load verification runs" });
    }
  });

  app.get("/api/projects/:id/verification/runs/:runId", requireAuth, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const run = await storage.getVerificationRun(req.params.runId);
      if (!run || run.projectId !== projectId) return res.status(404).json({ message: "Run not found" });

      const anomalies = await storage.getAnomalyFlagsByRun(run.id);
      let snapshot = null;
      try {
        snapshot = await storage.getIrradianceSnapshotForInterval(projectId, run.periodStart);
      } catch { /* ignore */ }

      let transaction = null;
      let postings: any[] = [];
      if (run.settledTransactionId) {
        transaction = await storage.getTransaction(run.settledTransactionId);
        postings = await storage.getPostingsByTransaction(run.settledTransactionId);
      }

      res.json({ run, anomalies, snapshot, transaction, postings });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load verification run" });
    }
  });

  app.post(
    "/api/projects/:id/verification/runs/:runId/clear",
    requireRole("ADMIN"),
    async (req: any, res) => {
      try {
        const { reason, force } = req.body || {};
        if (!reason || typeof reason !== "string") {
          return res.status(400).json({ message: "Reason is required" });
        }
        const result = await clearAnomalies(req.params.runId, req.user.id, reason, Boolean(force));
        await storage.createApprovalLog({
          projectId: req.params.id,
          adminId: req.user.id,
          action: VerificationApprovalAction.CLEAR_ANOMALY,
          notes: `runId=${req.params.runId} cleared=${result.cleared} force=${Boolean(force)} reason=${reason}`,
        });
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to clear anomalies" });
      }
    },
  );

  app.post(
    "/api/projects/:id/verification/runs/:runId/reject",
    requireRole("ADMIN"),
    async (req: any, res) => {
      try {
        const { reason } = req.body || {};
        if (!reason || typeof reason !== "string") {
          return res.status(400).json({ message: "Reason is required" });
        }
        const run = await rejectVerificationRun(req.params.runId, reason);
        await storage.createApprovalLog({
          projectId: req.params.id,
          adminId: req.user.id,
          action: VerificationApprovalAction.REJECT_VERIFICATION,
          notes: `runId=${run.id} reason=${reason}`,
        });
        res.json({ run });
      } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to reject run" });
      }
    },
  );

  app.post("/api/projects/:id/verification/run", requireRole("ADMIN"), async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { from, to, granularity } = req.body || {};
      if (!from || !to) return res.status(400).json({ message: "from and to are required" });
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid date(s)" });
      }
      const gran = granularity === "DAILY" ? "DAILY" : "INTERVAL_15M";
      const results = await runVerification(projectId, fromDate, toDate, gran);
      await storage.createApprovalLog({
        projectId,
        adminId: req.user.id,
        action: VerificationApprovalAction.MANUAL_VERIFICATION_RUN,
        notes: `from=${fromDate.toISOString()} to=${toDate.toISOString()} gran=${gran} runs=${results.length}`,
      });
      res.json({
        runs: results.map((r) => ({ run: r.run, anomalyCount: r.anomalies.length, status: r.status })),
        count: results.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to run verification" });
    }
  });

  app.get("/api/projects/:id/verification/summary", requireAuth, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (user.role === "DEVELOPER" && project.developerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);
      const runs = await storage.getVerificationRuns(projectId, { from: since, limit: 500 });
      const counts: Record<string, number> = {};
      for (const r of runs) counts[r.status] = (counts[r.status] || 0) + 1;
      const verified = counts["VERIFIED"] || 0;
      const settled = counts["SETTLED"] || 0;
      const total = runs.length;
      const pctVerified = total > 0 ? ((verified + settled) / total) * 100 : 0;
      const openAnomalies = await storage.getOpenAnomalies(projectId);
      const lastSettled = runs.find((r) => r.status === "SETTLED");
      res.json({
        countsByStatus: counts,
        totalRuns30d: total,
        pctVerified30d: Number(pctVerified.toFixed(2)),
        openAnomalies: openAnomalies.slice(0, 20),
        openAnomalyCount: openAnomalies.length,
        lastSettledAt: lastSettled?.settledAt ?? null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load verification summary" });
    }
  });

  app.get(
    "/api/public/projects/:id/verification/trace",
    async (req, res) => {
      try {
        if (!FEATURED_PROJECT_IDS.has(req.params.id)) return res.status(404).json({ message: "Not found" });
        const projectId = req.params.id;
        const { runId, intervalId } = req.query as any;
        let run = null as any;
        if (runId) {
          run = await storage.getVerificationRun(runId);
        } else if (intervalId) {
          run = await storage.getVerificationRunByInterval(Number(intervalId));
        }
        if (!run || run.projectId !== projectId) return res.status(404).json({ message: "Run not found" });

        const anomalies = (await storage.getAnomalyFlagsByRun(run.id)).map((a) => ({
          ruleCode: a.ruleCode,
          severity: a.severity,
          raisedAt: a.raisedAt,
          clearedAt: a.clearedAt,
          // omit clearedReason / detail PII
        }));

        const snapshot = await storage.getIrradianceSnapshotForInterval(projectId, run.periodStart);
        const publicSnapshot = snapshot
          ? {
              satelliteSource: snapshot.satelliteSource,
              pvEstimateKw: snapshot.pvEstimateKw,
              irradianceWm2: snapshot.irradianceWm2,
              intervalStart: snapshot.intervalStart,
              intervalEnd: snapshot.intervalEnd,
              rawResponseHash: snapshot.rawResponseHash.slice(0, 16),
              // Coarsen coords to ~1.1 km
              latitude: snapshot.latitude ? Number(snapshot.latitude).toFixed(2) : null,
              longitude: snapshot.longitude ? Number(snapshot.longitude).toFixed(2) : null,
            }
          : null;

        let transaction = null as any;
        if (run.settledTransactionId) {
          transaction = await storage.getTransaction(run.settledTransactionId);
        }

        res.json({
          projectId,
          run: {
            id: run.id,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            granularity: run.granularity,
            expectedKwh: run.expectedKwh,
            actualKwh: run.actualKwh,
            variancePct: run.variancePct,
            tolerancePct: run.tolerancePct,
            ppaRateUsdPerKwh: run.ppaRateUsdPerKwh,
            ppaSource: run.ppaSource,
            offtakerClass: run.offtakerClass,
            plantUse: run.plantUse,
            grossRevenueUsd: run.grossRevenueUsd,
            status: run.status,
            evidenceHash: run.evidenceHash,
            settledAt: run.settledAt,
          },
          snapshot: publicSnapshot,
          anomalies,
          transactionId: transaction?.id ?? null,
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to load trace" });
      }
    },
  );

  // Missing endpoint that performance.tsx already calls — return featured projects.
  app.get("/api/public/projects/sgt-metrics", async (_req, res) => {
    try {
      const all = await storage.getAllProjects();
      const featured = all.filter((p) => FEATURED_PROJECT_IDS.has(p.id));
      const projectsOut = await Promise.all(
        featured.map(async (p) => {
          const summary = await (async () => {
            try {
              const since = new Date();
              since.setDate(since.getDate() - 30);
              const runs = await storage.getVerificationRuns(p.id, { from: since, limit: 500 });
              const verified = runs.filter((r) => r.status === "VERIFIED" || r.status === "SETTLED").length;
              const total = runs.length;
              const pctVerified = total > 0 ? (verified / total) * 100 : 0;
              return {
                runs30d: total,
                pctVerified30d: Number(pctVerified.toFixed(2)),
              };
            } catch {
              return { runs30d: 0, pctVerified30d: 0 };
            }
          })();
          return {
            projectId: p.id,
            projectName: p.name,
            state: p.state,
            county: p.county,
            technology: p.technology,
            capacityMW: p.capacityMW,
            verification: summary,
          };
        }),
      );
      res.json({ projects: projectsOut });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load sgt-metrics" });
    }
  });

  // ═══ Marketplace Routes ═══

  app.get("/api/public/market/projects", async (req, res) => {
    try {
      const { listMarketplaceListings } = await import("./services/marketplace-listings");
      const result = await listMarketplaceListings({
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        state: req.query.state as string | undefined,
        iso: req.query.iso as string | undefined,
        technology: req.query.technology as string | undefined,
        source: req.query.source === "QUEUE" || req.query.source === "PROJECT"
          ? (req.query.source as "QUEUE" | "PROJECT")
          : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load marketplace" });
    }
  });

  app.get("/api/public/market/projects/:id", async (req, res) => {
    try {
      const { getMarketplaceListing } = await import("./services/marketplace-listings");
      const listing = await getMarketplaceListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      res.json(listing);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load listing" });
    }
  });

  // ─── Portfolio construction ───────────────────────────────────────────────

  const allocationSchema = z.object({
    listingId: z.string().min(1),
    listingSource: z.enum(["PROJECT", "QUEUE"]).default("PROJECT"),
    weightPct: z.number().min(0).max(100),
  });

  const portfolioBodySchema = z.object({
    name: z.string().min(1).max(120).default("Untitled portfolio"),
    targetCheckSizeUsd: z.number().min(0).max(1_000_000_000).default(100_000),
    allocations: z.array(allocationSchema).max(50).default([]),
  });

  /**
   * Stateless analysis so a visitor can model a portfolio before signing up.
   * Nothing is persisted and nothing is returned that isn't already public on
   * the marketplace.
   */
  app.post("/api/public/portfolio/analyze", async (req, res) => {
    try {
      const parsed = portfolioBodySchema.pick({ targetCheckSizeUsd: true, allocations: true }).parse(req.body);
      const { analyzePortfolio } = await import("./services/portfolio-analytics");
      const analysis = await analyzePortfolio({
        allocations: parsed.allocations,
        targetCheckSizeUsd: parsed.targetCheckSizeUsd,
      });
      res.json(analysis);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid portfolio", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to analyze portfolio" });
    }
  });

  app.get("/api/public/portfolio/shared/:token", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolioByShareToken(req.params.token);
      if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
      const { analyzePortfolio } = await import("./services/portfolio-analytics");
      const analysis = await analyzePortfolio({
        allocations: portfolio.allocations ?? [],
        targetCheckSizeUsd: Number(portfolio.targetCheckSizeUsd ?? 0),
      });
      // Deliberately omits ownerId: a share link grants read access to the
      // allocation, not to who built it.
      res.json({
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          targetCheckSizeUsd: portfolio.targetCheckSizeUsd,
          allocations: portfolio.allocations,
          updatedAt: portfolio.updatedAt,
        },
        analysis,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load shared portfolio" });
    }
  });

  /**
   * Expression of interest in the prospective diversified fund. This captures
   * interest only — the fund is not offered, and nothing here is a subscription.
   */
  app.post("/api/public/portfolio/fund-interest", async (req: any, res) => {
    try {
      const parsed = z
        .object({
          email: z.string().email(),
          checkSizeUsd: z.number().min(0).max(1_000_000_000).optional(),
          accreditationStatus: z.enum(["ACCREDITED", "NOT_ACCREDITED", "UNKNOWN"]).default("UNKNOWN"),
          riskPreference: z.enum(["INCOME", "BALANCED", "GROWTH"]).default("BALANCED"),
          message: z.string().max(2000).optional(),
          sourcePortfolioId: z.string().optional(),
        })
        .parse(req.body);

      const created = await storage.createFundInterest({
        userId: req.session?.userId ?? null,
        email: parsed.email,
        checkSizeUsd: parsed.checkSizeUsd != null ? String(parsed.checkSizeUsd) : null,
        accreditationStatus: parsed.accreditationStatus,
        riskPreference: parsed.riskPreference,
        message: parsed.message ?? null,
        sourcePortfolioId: parsed.sourcePortfolioId ?? null,
        status: "SUBMITTED",
      });
      res.status(201).json({ id: created.id, status: created.status });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid submission", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to record interest" });
    }
  });

  app.get("/api/portfolios", requireAuth, async (req: any, res) => {
    try {
      res.json(await storage.getPortfoliosByOwner(req.session.userId));
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load portfolios" });
    }
  });

  app.post("/api/portfolios", requireAuth, async (req: any, res) => {
    try {
      const parsed = portfolioBodySchema.parse(req.body);
      const created = await storage.createPortfolio({
        ownerId: req.session.userId,
        name: parsed.name,
        targetCheckSizeUsd: String(parsed.targetCheckSizeUsd),
        allocations: parsed.allocations,
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid portfolio", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to save portfolio" });
    }
  });

  app.get("/api/portfolios/:id", requireAuth, async (req: any, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio || portfolio.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load portfolio" });
    }
  });

  app.patch("/api/portfolios/:id", requireAuth, async (req: any, res) => {
    try {
      const existing = await storage.getPortfolio(req.params.id);
      if (!existing || existing.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      const parsed = portfolioBodySchema.partial().parse(req.body);
      const updated = await storage.updatePortfolio(req.params.id, {
        ...(parsed.name != null ? { name: parsed.name } : {}),
        ...(parsed.targetCheckSizeUsd != null
          ? { targetCheckSizeUsd: String(parsed.targetCheckSizeUsd) }
          : {}),
        ...(parsed.allocations != null ? { allocations: parsed.allocations } : {}),
      });
      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid portfolio", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to update portfolio" });
    }
  });

  app.delete("/api/portfolios/:id", requireAuth, async (req: any, res) => {
    try {
      const existing = await storage.getPortfolio(req.params.id);
      if (!existing || existing.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      await storage.deletePortfolio(req.params.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete portfolio" });
    }
  });

  app.get("/api/admin/fund-interests", requireRole("ADMIN"), async (_req: any, res) => {
    try {
      res.json(await storage.getAllFundInterests());
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load fund interests" });
    }
  });

  app.get("/api/public/market/refresh-status", async (_req, res) => {
    try {
      const meta = await storage.getMarketplaceMeta("global");
      res.json({
        refreshedAt: meta?.refreshedAt ?? null,
        listingCount: meta?.listingCount ?? 0,
        lastRunStatus: meta?.lastRunStatus ?? null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to load refresh status" });
    }
  });

  app.post("/api/admin/marketplace/refresh", requireRole("ADMIN"), async (_req: any, res) => {
    try {
      const { refreshMarketplace } = await import("./services/marketplace-refresh");
      const summary = await refreshMarketplace({ force: true });
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to refresh marketplace" });
    }
  });

  app.get("/api/public/backtest/report", async (req, res) => {
    try {
      const { getCachedBacktestReport } = await import("./services/backtest-engine");
      const report = await getCachedBacktestReport();
      const sampled = req.query.sampled === "true";
      const intervals = sampled
        ? report.intervals.filter((_, i) => i % 4 === 0)
        : report.intervals;
      res.json({
        resultId: report.resultId,
        site: report.site,
        statistics: report.statistics,
        intervals,
        satelliteSource: report.satelliteSource,
        meterDataSource: report.meterDataSource,
        coverage: report.coverage,
        generatedAt: report.generatedAt,
        engineVersion: report.engineVersion,
      });
    } catch (error: any) {
      console.error("Backtest report error:", error);
      res.status(500).json({ message: error.message || "Failed to generate backtest report" });
    }
  });

  app.get("/api/public/backtest/report/:resultId", async (req, res) => {
    try {
      if (!z.string().uuid().safeParse(req.params.resultId).success) {
        return res.status(400).json({ message: "Invalid backtest result ID" });
      }
      const { getBacktestArtifactRepository } = await import("./services/backtest-artifact-repository");
      const report = await getBacktestArtifactRepository().get(req.params.resultId);
      if (!report) return res.status(404).json({ message: "Backtest report not found" });
      res.json(report);
    } catch (error: any) {
      console.error("Backtest artifact lookup error", error);
      res.status(500).json({ message: "Failed to load backtest report" });
    }
  });

  app.post("/api/public/backtest/run", (_req, res) => {
    res.status(410).json({
      message: "Public backtest execution is disabled. Read the immutable public report instead.",
      reportUrl: "/api/public/backtest/report",
    });
  });

  app.post("/api/admin/backtest/run", requireRole("ADMIN"), backtestRunLimiter, async (req: any, res) => {
    try {
      const { runBacktest, setCachedBacktestReport } = await import("./services/backtest-engine");

      const { projectId, meterDataSource } = req.body || {};
      let config;
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (project) {
          let startDate = "2023-06-01";
          let endDate = "2024-05-31";

          const storedProduction = await storage.getProductionByProject(projectId);
          const hasStoredData = storedProduction.length > 0;

          const effectiveMeterSource = meterDataSource || (hasStoredData ? "stored" : "synthetic");

          if (effectiveMeterSource === "stored" && hasStoredData) {
            const dates = storedProduction.map(p => p.periodStart.getTime());
            const endDates = storedProduction.map(p => p.periodEnd.getTime());
            startDate = new Date(Math.min(...dates)).toISOString().split("T")[0];
            endDate = new Date(Math.max(...endDates)).toISOString().split("T")[0];
          }

          config = {
            siteId: project.id,
            siteName: project.name,
            latitude: parseFloat(project.latitude || "32.8476"),
            longitude: parseFloat(project.longitude || "-115.5695"),
            capacityKw: parseFloat(project.capacityKw || "0"),
            arrayType: "fixed",
            startDate,
            endDate,
            ...(effectiveMeterSource === "stored" ? { projectId: project.id, meterDataSource: "stored" as const } : {}),
          };
        }
      }

      const report = await runBacktest(config);
      const { getBacktestArtifactRepository } = await import("./services/backtest-artifact-repository");
      await getBacktestArtifactRepository().save(report);
      audit("backtest_artifact_created", {
        resultId: report.resultId,
        siteId: report.site.siteId,
        actorId: req.user.id,
        coveragePct: report.coverage.coveragePct,
      });
      setCachedBacktestReport(report);
      res.json({
        resultId: report.resultId,
        site: report.site,
        statistics: report.statistics,
        intervals: report.intervals,
        satelliteSource: report.satelliteSource,
        meterDataSource: report.meterDataSource,
        coverage: report.coverage,
        generatedAt: report.generatedAt,
        engineVersion: report.engineVersion,
      });
    } catch (error: any) {
      console.error("Backtest run error:", error);
      res.status(500).json({ message: error.message || "Failed to run backtest" });
    }
  });

  app.get("/api/public/backtest/has-stored-data", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        return res.json({ hasStoredData: false });
      }
      const production = await storage.getProductionByProject(projectId);
      res.json({ hasStoredData: production.length > 0, recordCount: production.length });
    } catch (error: any) {
      res.json({ hasStoredData: false });
    }
  });

  // ═══ Internal Subagent Routes ═══

  app.get("/api/internal/agents", requireRole("ADMIN"), (_req: any, res) => {
    const agents = internalAgentRegistry.listAgents();
    res.json(agents);
  });

  app.get("/api/internal/agents/:id", requireRole("ADMIN"), (req: any, res) => {
    const agent = internalAgentRegistry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const runs = internalAgentRegistry.listRunsForAgent(agent.id);
    res.json({ agent, runs });
  });

  app.post("/api/internal/agents/:id/run", requireRole("ADMIN"), async (req: any, res) => {
    const agent = internalAgentRegistry.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const context = req.body && typeof req.body === "object"
      ? (req.body as Record<string, unknown>)
      : {};

    const run = await internalAgentRegistry.runAgent(agent.id, req.user?.id ?? null, context);
    res.json(run);
  });

  return httpServer;
}
