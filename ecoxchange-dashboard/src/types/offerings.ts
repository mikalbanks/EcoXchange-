// Investor-facing offering types (Spec 06). Mirrors the `offerings` and
// `project_documents` Supabase tables plus a joined `OfferingSummary` used by
// the offering detail page.

export interface Offering {
  id: string;
  project_id: string;
  offering_name: string;
  slug: string;
  status: "draft" | "coming_soon" | "open" | "fully_subscribed" | "closed";

  // Raise
  target_raise: number;
  minimum_investment: number;
  maximum_investment: number | null;
  total_subscribed: number;
  token_price: number;
  total_tokens: number;
  tokens_remaining: number;

  // Economics
  target_annual_yield: number;
  target_irr: number;
  distribution_frequency: "monthly" | "quarterly";
  ppa_term_years: number;
  ppa_counterparty: string;
  ppa_escalator_pct: number;
  itc_eligible: boolean;
  srec_eligible: boolean;
  srec_program: string | null;

  // Developer
  developer_name: string;
  developer_bio: string | null;
  developer_track_record: string | null;
  developer_website: string | null;
  developer_logo_url: string | null;

  // Content
  headline: string;
  description: string;
  investment_thesis: string;
  risk_factors: string[];
  hero_image_url: string | null;
  site_photos: string[];

  // Dates
  offering_open_date: string | null;
  offering_close_date: string | null;
  target_cod_date: string | null;
  first_distribution_date: string | null;

  // Verification
  backtest_mean_deviation: number | null;
  backtest_months_within_10pct: number | null;

  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  offering_id: string;
  doc_type:
    | "ppm"
    | "subscription_agreement"
    | "ppa_summary"
    | "interconnection"
    | "form_d"
    | "financial_memo"
    | "verification_report"
    | "site_assessment"
    | "other";
  title: string;
  description: string | null;
  file_url: string;
  is_public: boolean;
  upload_date: string;
}

export interface OfferingProject {
  latitude: number;
  longitude: number;
  capacity_kw_dc: number;
  tilt_deg: number;
  azimuth_deg: number;
  inverter_brand: string;
  commissioning_date: string;
  offtake_type: string;
}

export interface OfferingVerificationSummary {
  total_months_verified: number;
  latest_status: "verified" | "flagged" | "pending";
  latest_period: string;
  cumulative_kwh_verified: number;
}

// Joined shape for the summary page.
export interface OfferingSummary extends Offering {
  project: OfferingProject;
  documents: ProjectDocument[];
  verification_summary: OfferingVerificationSummary | null;
}
