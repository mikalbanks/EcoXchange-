// Distribution / DRIP types (Spec 09).

export type DistributionPref = "cash_out" | "reinvest";

export interface DistributionPreference {
  id: string;
  investor_id: string;
  offering_id: string;
  preference: DistributionPref;
  reinvest_target_offering_id: string | null;
  updated_at: string;
}

export interface DistributionRecord {
  id: string;
  investor_id: string;
  offering_id: string;
  period_start: string;
  period_end: string;
  gross_distribution: number;
  platform_fee: number;
  net_distribution: number;
  action_taken: DistributionPref;
  tokens_acquired: number | null;
  reinvest_price: number | null;
  tx_hash: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  // Convenience for the history table (joined / demo).
  offering_name?: string;
}

export interface InvestorHolding {
  id: string;
  investor_id: string;
  offering_id: string;
  tokens_held: number;
  cost_basis: number;
  offering_name: string;
  offering_slug: string;
  target_annual_yield: number;
  current_preference: DistributionPref;
}

export interface DistributionSummary {
  total_distributions_received: number;
  total_reinvested: number;
  total_cashed_out: number;
  next_estimated_distribution: number;
  next_distribution_date: string;
  distribution_history: DistributionRecord[];
}
