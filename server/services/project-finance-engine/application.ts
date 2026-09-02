import crypto from "node:crypto";

import {
  runProjectFinanceV0,
  type ProjectFinanceInputs,
  type ProjectFinanceResult,
} from "./core";
import {
  ECOXCHANGE_SOLAR_BASE_POLICY,
  basePolicyAssumptions,
  evaluateUnderwritingPolicy,
  type PolicyAssessment,
  type ResolvedPolicyAssumptions,
  type UnderwritingFacts,
} from "./policy";
import type { ResolvedScenario } from "./scenario-resolver";

export interface CalculationExecution {
  inputHash: string;
  result: ProjectFinanceResult;
}

export interface AnalysisExecution extends CalculationExecution {
  underwriting: PolicyAssessment;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function calculateInputHash(input: ProjectFinanceInputs): string {
  const canonical = JSON.stringify(canonicalize(input));
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function executeCalculation(input: ProjectFinanceInputs): CalculationExecution {
  return {
    inputHash: calculateInputHash(input),
    result: runProjectFinanceV0(input),
  };
}

export function executeResolvedCalculation(resolved: ResolvedScenario): CalculationExecution {
  if (resolved.missingFields.length > 0) {
    throw new Error(`Scenario is missing required inputs: ${resolved.missingFields.join(", ")}`);
  }
  return executeCalculation(resolved.values);
}

export function executeUnderwriting(
  input: ProjectFinanceInputs,
  result: ProjectFinanceResult,
  facts: UnderwritingFacts,
  resolvedPolicy?: ResolvedPolicyAssumptions,
): PolicyAssessment {
  const policy = resolvedPolicy ?? basePolicyAssumptions(input.capacityMwAc);
  return evaluateUnderwritingPolicy(input, result, facts, policy, ECOXCHANGE_SOLAR_BASE_POLICY);
}

export function executeAnalysis(
  resolved: ResolvedScenario,
  facts: UnderwritingFacts,
  resolvedPolicy?: ResolvedPolicyAssumptions,
): AnalysisExecution {
  const calculation = executeResolvedCalculation(resolved);
  const underwriting = executeUnderwriting(
    resolved.values,
    calculation.result,
    facts,
    resolvedPolicy,
  );
  return { ...calculation, underwriting };
}

/** Persistence is intentionally outside the domain engines. */
export interface ProjectFinancePersistencePort {
  findSuccessfulCalculationByHash(inputHash: string, engineVersion: string): Promise<string | null>;
  persistSuccessfulCalculation(args: {
    scenarioId: string;
    organizationId: string;
    inputHash: string;
    resolvedInput: ProjectFinanceInputs;
    provenance: ResolvedScenario["provenance"];
    result: ProjectFinanceResult;
    idempotencyKey?: string;
  }): Promise<string>;
  persistUnderwriting(args: {
    calculationRunId: string;
    scenarioId: string;
    organizationId: string;
    facts: UnderwritingFacts;
    assessment: PolicyAssessment;
  }): Promise<string>;
}
