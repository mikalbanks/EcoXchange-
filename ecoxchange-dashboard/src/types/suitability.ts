// Investor suitability questionnaire types (Spec 10).

export type ExperienceLevel =
  | "first_alternative"
  | "some_alternatives"
  | "experienced"
  | "professional";
export type PrimaryObjective = "income" | "growth" | "diversification" | "impact";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type TimeHorizon = "short" | "medium" | "long";
export type PlannedAllocation =
  | "minimum"
  | "moderate"
  | "significant"
  | "institutional";
export type CryptoComfort = "new" | "familiar" | "experienced";

export interface OfferingRecommendation {
  offering_id: string;
  offering_name: string;
  offering_slug: string;
  fit_score: number; // 0-100
  fit_reasons: string[];
}

export interface SuitabilityProfile {
  id: string;
  investor_id: string;
  experience_level: ExperienceLevel;
  primary_objective: PrimaryObjective;
  risk_tolerance: RiskTolerance;
  time_horizon: TimeHorizon;
  planned_allocation: PlannedAllocation;
  impact_priorities: string[];
  solar_experience: boolean;
  crypto_comfort: CryptoComfort;
  recommended_offerings: OfferingRecommendation[];
  completed_at: string;
}

// The answer fields only (no id/metadata) — what the wizard collects + the scorer reads.
export type SuitabilityAnswers = Pick<
  SuitabilityProfile,
  | "experience_level"
  | "primary_objective"
  | "risk_tolerance"
  | "time_horizon"
  | "planned_allocation"
  | "impact_priorities"
  | "solar_experience"
  | "crypto_comfort"
>;

export interface QuestionOption {
  value: string;
  label: string;
  description: string;
  icon?: string; // Lucide icon name
}

export interface SuitabilityQuestion {
  id: string;
  question: string;
  subtitle: string;
  type: "single_select" | "multi_select" | "boolean";
  options: QuestionOption[];
  field: keyof SuitabilityAnswers;
}
