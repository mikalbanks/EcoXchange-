import type { DbProject } from "../db/types.js";
import { yearsOperating } from "../utils/calculations.js";
import { counterpartyTypeFor } from "../utils/nexus_constants.js";

const PRIMARY_LIFE_YEARS = 25;

export interface CashFlowDurability {
  score: number;
  factors: {
    contract_length_years: number;
    escalator_present: boolean;
    counterparty_credit: string;
    revenue_concentration: string;
  };
  rationale: string;
}

export function scoreCashFlowDurability(project: DbProject): CashFlowDurability {
  let score = 5;
  const age = yearsOperating(project.commissioning_date);
  const remainingYears = Math.max(0, PRIMARY_LIFE_YEARS - age);

  if (remainingYears > 20) score += 2;
  else if (remainingYears > 15) score += 1.5;
  else if (remainingYears > 10) score += 1;
  else if (remainingYears < 5) score -= 1;

  const escalatorPresent =
    project.ppa_escalator !== null && project.ppa_escalator > 0;
  if (escalatorPresent) score += 1;

  if (project.offtake_type === "ppa") score += 1;
  if (project.offtake_type === "community_solar") score += 0.5;
  if (project.offtake_type === "merchant") score -= 2;

  score = Math.max(0, Math.min(10, score));

  const revenueConcentration =
    project.offtake_type === "community_solar"
      ? "multi_subscriber"
      : project.offtake_type === "merchant"
        ? "spot_market"
        : "single_offtaker";

  const rationale = [
    `~${remainingYears.toFixed(1)} years of contracted life remaining`,
    escalatorPresent
      ? `${((project.ppa_escalator ?? 0) * 100).toFixed(1)}% annual escalator`
      : "no escalator",
    `${project.offtake_type ?? "unknown"} offtake`,
  ].join("; ");

  return {
    score,
    factors: {
      contract_length_years: remainingYears,
      escalator_present: escalatorPresent,
      counterparty_credit: counterpartyTypeFor(project.offtake_type),
      revenue_concentration: revenueConcentration,
    },
    rationale,
  };
}
