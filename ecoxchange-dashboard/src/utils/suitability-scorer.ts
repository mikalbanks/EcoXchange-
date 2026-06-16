import type {
  OfferingRecommendation,
  SuitabilityAnswers,
} from "../types/suitability.js";
import type { Offering } from "../types/offerings.js";

// Rank open offerings by fit against the investor's suitability answers (Spec 10).
export function scoreOfferings(
  profile: SuitabilityAnswers,
  offerings: Offering[],
): OfferingRecommendation[] {
  return offerings
    .filter((o) => o.status === "open" || o.status === "coming_soon")
    .map((offering) => {
      let score = 50; // base
      const reasons: string[] = [];

      // Objective alignment
      if (profile.primary_objective === "income" && offering.target_annual_yield >= 0.06) {
        score += 20;
        reasons.push("Strong income characteristics match your yield objective");
      }
      if (profile.primary_objective === "impact") {
        score += 15;
        reasons.push("Production-verified solar aligns with your impact goals");
      }
      if (profile.primary_objective === "diversification") {
        score += 10;
        reasons.push("Solar infrastructure is uncorrelated to traditional markets");
      }

      // Risk alignment
      if (profile.risk_tolerance === "conservative" && offering.ppa_term_years >= 15) {
        score += 15;
        reasons.push("Long-term PPA provides stable contracted revenue");
      }
      if (profile.risk_tolerance === "aggressive" && offering.target_irr >= 0.1) {
        score += 15;
        reasons.push("Target IRR aligns with your return expectations");
      }

      // Time horizon fit
      if (profile.time_horizon === "long") {
        score += 10;
        reasons.push("Your long-term horizon aligns with PPA duration");
      }
      if (profile.time_horizon === "short") {
        score -= 10;
        reasons.push("Note: ESN tokens have limited short-term liquidity");
      }

      // Allocation fit
      if (profile.planned_allocation === "institutional" && offering.target_raise >= 2000000) {
        score += 5;
        reasons.push("Offering size accommodates your planned allocation");
      }

      score = Math.min(100, Math.max(0, score));

      return {
        offering_id: offering.id,
        offering_name: offering.offering_name,
        offering_slug: offering.slug,
        fit_score: score,
        fit_reasons: reasons,
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score);
}
