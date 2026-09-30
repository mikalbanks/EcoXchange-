import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { powerGapIntakeRequestSchema, powerGapIntakes } from "@shared/power-gap-intake";
import { audit } from "../audit";
import { db, isConnectionError, isDatabaseConfigured } from "../db";

const intakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submissions. Please try again later." },
});

export function registerPowerGapIntakeRoutes(app: Express): void {
  app.post("/api/public/power-gap-intakes", intakeLimiter, async (req, res) => {
    const parsed = powerGapIntakeRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Please review the highlighted intake fields.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { website, ...input } = parsed.data;

    // Honeypot: return a normal-looking success without writing bot submissions.
    if (website.trim()) {
      return res.status(201).json({ accepted: true, submissionId: "received" });
    }

    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        message: "Power-gap intake is temporarily unavailable. Please email contact@ecoxchange.net.",
      });
    }

    try {
      const [submission] = await db
        .insert(powerGapIntakes)
        .values({
          contactName: input.contactName,
          workEmail: input.workEmail,
          company: input.company,
          role: input.role || null,
          siteName: input.siteName,
          siteLocation: input.siteLocation,
          utility: input.utility,
          isoRto: input.isoRto || null,
          requiredFirmMw: String(input.requiredFirmMw),
          firmSupplyMw: input.firmSupplyMw === undefined ? null : String(input.firmSupplyMw),
          targetPowerTiming: input.targetPowerTiming,
          permanentPowerTiming: input.permanentPowerTiming ?? null,
          constraintType: input.constraintType,
          bridgeDuration: input.bridgeDuration || null,
          existingResources: input.existingResources,
          reliabilityNotes: input.reliabilityNotes || null,
          notes: input.notes || null,
          consent: true,
          source: "website_power_gap",
          status: "NEW",
        })
        .returning({ id: powerGapIntakes.id });

      audit("power_gap_intake_created", {
        submissionId: submission.id,
        company: input.company,
        siteName: input.siteName,
        requiredFirmMw: input.requiredFirmMw,
        isoRto: input.isoRto || "unknown",
      });

      return res.status(201).json({
        accepted: true,
        submissionId: submission.id,
        stage: "INBOUND_INTAKE_RECEIVED",
      });
    } catch (error) {
      console.error("[power-gap-intake] failed to persist submission", error);
      if (isConnectionError(error)) {
        return res.status(503).json({
          message: "Power-gap intake is temporarily unavailable. Please email contact@ecoxchange.net.",
        });
      }
      return res.status(500).json({ message: "Unable to save the power-gap intake." });
    }
  });
}
