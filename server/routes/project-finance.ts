import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";

import {
  previewRequestSchema,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
  ProjectFinanceDomainError,
} from "../services/project-finance-engine/api-contracts";
import {
  ECOXCHANGE_SOLAR_BASE_POLICY,
  BASE_SOLAR_POLICY_ID,
  BASE_SOLAR_POLICY_VERSION,
  basePolicyAssumptions,
} from "../services/project-finance-engine/policy";
import {
  executeCalculation,
} from "../services/project-finance-engine/application";
import type { ProjectFinanceInputs } from "../services/project-finance-engine/core";

export type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => unknown;

function requestId(req: Request): string {
  const supplied = req.header("x-request-id");
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function sendError(
  res: Response,
  request_id: string,
  status: number,
  code: ApiErrorEnvelope["error"]["code"],
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json({ error: { code, message, details, request_id } } satisfies ApiErrorEnvelope);
}

function toFinanceInput(body: ReturnType<typeof previewRequestSchema.parse>): ProjectFinanceInputs {
  const { project, inputs } = body;
  return {
    projectName: inputs.project_name,
    capacityMwAc: project.capacity_mw_ac,
    p50CapacityFactor: inputs.capacity_factor_p50,
    annualDegradationRate: inputs.annual_degradation_rate,
    projectLifeYears: inputs.project_life_years,
    ppaTermYears: inputs.ppa_term_years,
    yearOnePpaPricePerMwh: inputs.ppa_price_year_1_per_mwh,
    annualPpaEscalationRate: inputs.ppa_escalation_rate,
    totalProjectCapexUsd: inputs.project_capex,
    yearOneOpexUsd: inputs.opex_year_1,
    annualOpexEscalationRate: inputs.opex_escalation_rate,
    itcRate: inputs.itc_rate,
    itcEligibleBasisPercent: inputs.itc_eligible_basis_pct,
    itcTransferPrice: inputs.itc_transfer_price,
    itcTransferTransactionCostsUsd: inputs.itc_transaction_costs,
    debtInterestRate: inputs.debt_interest_rate,
    debtAmortizationYears: inputs.amortization_years,
    debtMaturityYears: inputs.debt_maturity_years ?? inputs.amortization_years,
    targetP50Dscr: inputs.target_dscr,
    maximumLtc: inputs.max_ltc,
    upfrontFeePercent: inputs.lender_fee_rate,
    dsraMonths: inputs.dsra_months,
    closingCostsUsd: inputs.closing_costs,
    downsideGenerationMultiplier: inputs.downside_generation_multiplier,
    underwritingPolicyId: BASE_SOLAR_POLICY_ID,
    underwritingPolicyVersion: BASE_SOLAR_POLICY_VERSION,
  };
}

export function createProjectFinanceRouter(requireAuth: AuthMiddleware): Router {
  const router = Router();

  router.get("/policies/active", requireAuth, (req, res) => {
    const rid = requestId(req);
    const capacity = Number(req.query.capacity_mw_ac ?? 5);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return sendError(res, rid, 400, "INVALID_REQUEST", "capacity_mw_ac must be a positive number.");
    }
    const assumptions = basePolicyAssumptions(capacity);
    const payload: ApiSuccessEnvelope<unknown> = {
      data: {
        policy_code: ECOXCHANGE_SOLAR_BASE_POLICY.policyId,
        version: ECOXCHANGE_SOLAR_BASE_POLICY.policyVersion,
        description: ECOXCHANGE_SOLAR_BASE_POLICY.description,
        assumptions,
      },
      meta: { request_id: rid },
    };
    res.json(payload);
  });

  router.get("/policies/:policyCode/:version", requireAuth, (req, res) => {
    const rid = requestId(req);
    if (req.params.policyCode !== BASE_SOLAR_POLICY_ID || req.params.version !== BASE_SOLAR_POLICY_VERSION) {
      return sendError(res, rid, 404, "POLICY_NOT_FOUND", "Underwriting policy version was not found.");
    }
    res.json({ data: ECOXCHANGE_SOLAR_BASE_POLICY, meta: { request_id: rid } });
  });

  router.post("/calculations/preview", requireAuth, (req, res) => {
    const rid = requestId(req);
    try {
      const parsed = previewRequestSchema.parse(req.body);
      if (parsed.project.technology !== "SOLAR_PV") {
        throw new ProjectFinanceDomainError(
          "PROJECT_OUT_OF_SCOPE",
          "V0 preview supports SOLAR_PV only.",
          422,
          { technology: parsed.project.technology },
        );
      }
      const input = toFinanceInput(parsed);
      const { inputHash, result } = executeCalculation(input);
      res.json({
        data: {
          persisted: false,
          input_hash: inputHash,
          engine_version: result.metadata.calculationEngineVersion,
          analysis_type: result.metadata.analysisType,
          summary: {
            year_1_cfads: result.yearOneCfadsUsd,
            dscr_sized_debt: result.financingSummary.dscrSizedDebtUsd,
            permanent_debt: result.financingSummary.permanentDebtUsd,
            debt_to_capex: result.financingSummary.debtToCapex,
            minimum_dscr: result.financingSummary.minimumDscr,
            sponsor_equity: result.capitalStack.sponsorEquityUsd,
            binding_constraint: result.financingSummary.bindingConstraint,
          },
          warnings: result.warnings,
          reconciliation: result.reconciliation,
        },
        meta: { request_id: rid },
      } satisfies ApiSuccessEnvelope<unknown>);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, rid, 400, "INVALID_REQUEST", "Invalid project-finance preview payload.", {
          issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        });
      }
      if (error instanceof ProjectFinanceDomainError) {
        return sendError(res, rid, error.status, error.code, error.message, error.details);
      }
      const message = error instanceof Error ? error.message : "Project finance preview failed.";
      return sendError(res, rid, 422, "INVALID_FINANCIAL_INPUT", message);
    }
  });

  return router;
}

/**
 * Mount at `/api/v1`. Persistence-backed routes are added after Spec 04 schema
 * migrations pass non-production migration/RLS tests.
 */
export function registerProjectFinanceApi(app: { use(path: string, router: Router): unknown }, requireAuth: AuthMiddleware): void {
  app.use("/api/v1", createProjectFinanceRouter(requireAuth));
}
