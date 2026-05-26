import type { DbProject, DbVerificationRecord } from "../db/types.js";
import {
  capacityFactorPct,
  meanAbsDeviationPct,
  observedDegradationTrendPctPerYear,
  yearsOperating,
} from "../utils/calculations.js";
import { getRegionalCapacityFactorBenchmark } from "../utils/benchmarks.js";

export interface PhysicalDurability {
  score: number;
  factors: {
    system_age_years: number;
    degradation_observed_vs_model: string;
    verification_pass_rate_pct: number;
    capacity_factor_vs_benchmark: string;
  };
  rationale: string;
}

export function degradationDivergence(
  modeledPctPerYear: number, // e.g. 0.0075 → 0.75 %/yr
  observedPctPerYear: number | null,
): string {
  if (observedPctPerYear === null) return "insufficient_data";
  const modeledPct = modeledPctPerYear * 100;
  const observedAbs = Math.abs(observedPctPerYear);
  if (observedAbs <= modeledPct + 0.5) return "within_model";
  if (observedPctPerYear < 0) return "faster_than_model";
  return "slower_than_model";
}

export function scorePhysicalDurability(
  project: DbProject,
  records: DbVerificationRecord[],
): PhysicalDurability {
  let score = 5;
  const total = records.length;
  const verified = records.filter((r) => r.status === "verified").length;
  const passRate = total > 0 ? verified / total : 0;

  if (passRate >= 0.95) score += 2;
  else if (passRate >= 0.85) score += 1;
  else if (passRate < 0.7) score -= 2;

  const cf = capacityFactorPct(project, records);
  const benchmark = getRegionalCapacityFactorBenchmark(project.latitude);
  let cfBand = "at";
  if (cf !== null) {
    if (cf >= benchmark * 1.05) {
      score += 1;
      cfBand = "above";
    } else if (cf < benchmark * 0.85) {
      score -= 1;
      cfBand = "below";
    }
  } else {
    cfBand = "unknown";
  }

  const age = yearsOperating(project.commissioning_date);
  if (age < 3) score += 0.5;
  if (age > 15) score -= 0.5;

  const meanDev = meanAbsDeviationPct(records);
  if (meanDev < 5) score += 1;
  if (meanDev > 12) score -= 1;

  score = Math.max(0, Math.min(10, score));

  const observed = observedDegradationTrendPctPerYear(project, records);
  const divergence = degradationDivergence(project.degradation_rate, observed);

  const rationale = [
    `${(passRate * 100).toFixed(0)}% verification pass rate over ${total} months`,
    `capacity factor ${cf === null ? "n/a" : cf.toFixed(1) + "%"} vs ${benchmark}% regional benchmark (${cfBand})`,
    `degradation ${divergence}`,
    `mean monthly tracking error ${meanDev.toFixed(1)}%`,
  ].join("; ");

  return {
    score,
    factors: {
      system_age_years: age,
      degradation_observed_vs_model: divergence,
      verification_pass_rate_pct: passRate * 100,
      capacity_factor_vs_benchmark: cfBand,
    },
    rationale,
  };
}
