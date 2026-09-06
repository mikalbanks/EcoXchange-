import type { Express } from "express";
import { z } from "zod";
import {
  ProjectFinanceValidationError,
  type ProjectFinanceInputs,
} from "../services/project-finance-engine/core";
import {
  BASE_SOLAR_POLICY_ID,
  BASE_SOLAR_POLICY_VERSION,
  basePolicyAssumptions,
  type UnderwritingFacts,
} from "../services/project-finance-engine/policy";
import { runProductBankabilityAnalysis } from "../services/project-finance-engine/product-analysis";

const finite = z.number().finite();
const financeInputSchema = z.object({
  projectName: z.string().min(1),
  capacityMwAc: finite,
  p50CapacityFactor: finite,
  annualGenerationOverrideMwh: z.array(finite).optional(),
  annualDegradationRate: finite,
  projectLifeYears: z.number().int(),
  ppaTermYears: z.number().int(),
  yearOnePpaPricePerMwh: finite,
  annualPpaEscalationRate: finite,
  totalProjectCapexUsd: finite,
  capexIncludesContingency: z.boolean().optional(),
  contingencyRate: finite.optional(),
  yearOneOpexUsd: finite,
  annualOpexEscalationRate: finite,
  itcRate: finite,
  itcEligibleBasisPercent: finite,
  itcTransferPrice: finite,
  itcTransferTransactionCostsUsd: finite.optional(),
  debtInterestRate: finite,
  debtAmortizationYears: z.number().int(),
  debtMaturityYears: z.number().int().optional(),
  targetP50Dscr: finite,
  maximumLtc: finite,
  upfrontFeePercent: finite,
  dsraMonths: finite,
  dsraReferenceMethod: z.enum(["YEAR_ONE", "MAX_ANNUAL_DEBT_SERVICE", "NEXT_TWELVE_MONTHS", "CUSTOM"]).optional(),
  customDsraReferenceAnnualDebtServiceUsd: finite.optional(),
  closingCostsUsd: finite.optional(),
  otherFinancingUsesUsd: finite.optional(),
  otherPermanentSourcesUsd: finite.optional(),
  bridgeEligibleAmountUsd: finite.optional(),
  bridgeAdvancePercent: finite.optional(),
  downsideGenerationMultiplier: finite.optional(),
  explicitDownsideGenerationMwh: z.array(finite).optional(),
  discountRate: finite.optional(),
  taxModule: z.object({
    enabled: z.boolean(),
    bonusDepreciationPct: finite,
    federalTaxRate: finite,
    sponsorTaxAppetitePct: finite,
  }).optional(),
  underwritingPolicyId: z.string().optional(),
  underwritingPolicyVersion: z.string().optional(),
});

const factsSchema = z.object({
  technology: z.string().min(1),
  country: z.string().min(1),
  projectStage: z.enum(["DEVELOPMENT", "READY_TO_BUILD", "CONSTRUCTION", "OPERATING"]),
  projectCoStructure: z.boolean(),
  revenueContractStatus: z.enum(["FULLY_CONTRACTED", "PARTIALLY_CONTRACTED", "MERCHANT", "UNKNOWN"]),
  p90Source: z.enum(["INDEPENDENT_ENGINEER_P90", "USER_SUPPLIED_P90", "ILLUSTRATIVE_PERCENT_OF_P50", "NONE"]),
  itcEligibilityStatus: z.enum(["VERIFIED", "USER_ASSERTED", "PENDING_REVIEW", "UNKNOWN"]),
  taxCreditBuyerStatus: z.enum(["COMMITTED", "IDENTIFIED_NOT_COMMITTED", "UNIDENTIFIED", "NOT_APPLICABLE"]),
  offtakerName: z.string().optional(),
  offtakerCreditStatus: z.enum(["INVESTMENT_GRADE", "STRONG_NON_RATED", "NON_INVESTMENT_GRADE", "UNKNOWN"]),
  ppaDocumentationStatus: z.enum(["EXECUTED", "AWARDED_NOT_EXECUTED", "TERM_SHEET", "NEGOTIATION", "NONE", "UNKNOWN"]),
  epcStatus: z.enum(["EXECUTED_FIXED_PRICE", "EXECUTED_CAPPED_PRICE", "EXECUTED_OTHER", "NEGOTIATION", "NONE", "UNKNOWN"]),
  interconnectionStatus: z.enum(["FULLY_EXECUTED", "APPROVED_PENDING_EXECUTION", "STUDY_COMPLETE", "IN_QUEUE", "EARLY_STAGE", "UNKNOWN"]),
  permitStatus: z.enum(["COMPLETE", "SUBSTANTIALLY_COMPLETE", "IN_PROCESS", "EARLY_STAGE", "UNKNOWN"]),
  siteControlStatus: z.enum(["OWNED", "LONG_TERM_LEASE_EXECUTED", "OPTION_EXECUTED", "OPTION_ONLY", "NONE", "UNKNOWN"]),
  omStatus: z.enum(["EXECUTED", "IDENTIFIED", "NOT_IDENTIFIED", "UNKNOWN"]),
  ieStatus: z.enum(["FINAL_REPORT", "DRAFT_REPORT", "ENERGY_REPORT_ONLY", "NONE", "UNKNOWN"]),
  insuranceStatus: z.enum(["CONFIRMED", "PRELIMINARY", "NONE", "UNKNOWN"]),
  sponsorExperience: z.enum(["EXPERIENCED", "MODERATE", "FIRST_TIME", "UNKNOWN"]),
  sponsorTaxAppetiteStatus: z.enum(["CONFIRMED", "PARTIAL", "NONE", "UNKNOWN"]),
  technologyProven: z.boolean(),
  merchantExposurePct: finite.optional(),
  materialInputSources: z.record(z.enum(["EXECUTED_DOCUMENT", "INDEPENDENT_THIRD_PARTY_REPORT", "LENDER_QUOTE", "SPONSOR_DOCUMENT", "USER_ASSERTION", "ECOXCHANGE_ASSUMPTION", "UNKNOWN"])).optional(),
});

const requestSchema = z.object({
  input: financeInputSchema,
  facts: factsSchema,
  scenarioId: z.string().max(120).optional(),
});

export function registerProjectFinanceRoutes(app: Express): void {
  app.get("/api/project-finance/defaults", (req, res) => {
    const capacity = Number(req.query.capacityMwAc ?? 5);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return res.status(400).json({ code: "INVALID_CAPACITY", message: "capacityMwAc must be greater than zero" });
    }
    const assumptions = basePolicyAssumptions(capacity);
    return res.json({
      policyId: BASE_SOLAR_POLICY_ID,
      policyVersion: BASE_SOLAR_POLICY_VERSION,
      source: "ECOXCHANGE_ASSUMPTION",
      assumptions,
    });
  });

  app.post("/api/project-finance/analyze", (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: "MISSING_OR_INVALID_INPUT",
        message: "The financing analysis requires complete, valid project-finance inputs.",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      });
    }

    try {
      const result = runProductBankabilityAnalysis({
        input: parsed.data.input as ProjectFinanceInputs,
        facts: parsed.data.facts as UnderwritingFacts,
        scenarioId: parsed.data.scenarioId,
      });
      return res.json(result);
    } catch (error) {
      if (error instanceof ProjectFinanceValidationError) {
        return res.status(422).json({ code: error.code, message: error.message });
      }
      console.error("Project finance analysis failed", error);
      return res.status(503).json({
        code: "PROJECT_FINANCE_ENGINE_UNAVAILABLE",
        message: "The financing analysis could not be completed. No fallback values were substituted.",
      });
    }
  });
}
