import type { ContentPillar } from "../types/content.js";

// Starter article metadata (Spec 11). Bodies for the published set live as
// markdown files in ./articles/. Entries without a bundled body stay hidden
// (treated as draft) so there are no dead-end cards.
export interface ArticleMeta {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  pillar: ContentPillar;
  tags: string[];
  excerpt: string;
  estimated_read_minutes: number;
  requires_counsel_review: boolean;
  counsel_approved: boolean;
  published_at: string;
  hero_image_url?: string | null;
}

export const SEED_ARTICLES: ArticleMeta[] = [
  {
    slug: "what-is-a-production-verified-solar-note",
    title: "What Is a Production-Verified Solar Note?",
    author: "EcoXchange Team",
    pillar: "production_verification",
    tags: ["education", "beginner", "esn"],
    excerpt:
      "An EcoXchange Solar Note (ESN) is a fractional, tokenized ownership stake in a real U.S. solar project — with a critical difference: every distribution is triggered by independently verified production data.",
    estimated_read_minutes: 6,
    requires_counsel_review: true,
    counsel_approved: true,
    published_at: "2026-06-10",
  },
  {
    slug: "how-usdc-distributions-work",
    title: "How USDC Distributions Work on EcoXchange",
    author: "EcoXchange Team",
    pillar: "tokenization_rwa",
    tags: ["education", "usdc", "distributions"],
    excerpt:
      "Every month, verified production data triggers an on-chain USDC distribution to every ESN token holder. Here is exactly how the process works, from solar panel to your wallet.",
    estimated_read_minutes: 5,
    requires_counsel_review: true,
    counsel_approved: true,
    published_at: "2026-06-08",
  },
  {
    slug: "three-source-verification-explained",
    title: "Three Sources, One Truth: How EcoXchange Verifies Solar Production",
    author: "EcoXchange Team",
    pillar: "production_verification",
    tags: ["education", "verification", "technology"],
    excerpt:
      "EcoXchange reconciles inverter telemetry, utility meter data, and satellite irradiance before triggering any distribution. Here is why that matters and how it works.",
    estimated_read_minutes: 8,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-12",
  },
  {
    slug: "the-1-20-mw-funding-gap",
    title: "The $300–700M Funding Gap Hiding in Plain Sight",
    author: "Mikal Banks",
    pillar: "solar_market_intelligence",
    tags: ["market", "developers", "data"],
    excerpt:
      "The 1–20 MW solar segment produced 3.9 GW in 2024. Institutional capital skips it. EcoXchange fills the gap.",
    estimated_read_minutes: 7,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-11",
  },
  {
    slug: "tokenization-vs-traditional-solar-equity",
    title: "Tokenization vs. Traditional Solar Equity: A Cost Comparison",
    author: "EcoXchange Team",
    pillar: "tokenization_rwa",
    tags: ["education", "tokenization", "comparison"],
    excerpt:
      "Traditional Reg D placement costs 10–12% of capital raised plus months of delay. Tokenized offerings cut that by 50–70%. Here are the numbers.",
    estimated_read_minutes: 6,
    requires_counsel_review: true,
    counsel_approved: false,
    published_at: "2026-06-05",
  },
  {
    slug: "understanding-your-esn-returns",
    title: "Understanding Your ESN Returns",
    author: "EcoXchange Team",
    pillar: "production_verification",
    tags: ["education", "returns", "irr"],
    excerpt:
      "A guide to how EcoXchange calculates, tracks, and reports investment performance — covering target yield, effective IRR, and the difference between production-verified and projected returns.",
    estimated_read_minutes: 7,
    requires_counsel_review: true,
    counsel_approved: false,
    published_at: "2026-06-04",
  },
  {
    slug: "why-solar-production-data-matters",
    title: "Why Solar Production Data Matters More Than You Think",
    author: "EcoXchange Team",
    pillar: "production_verification",
    tags: ["data", "nrel", "degradation"],
    excerpt:
      "NREL found that real-world solar degradation averages 1.3%/year — nearly triple what developers project. Without independent verification, investors are flying blind.",
    estimated_read_minutes: 5,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-03",
  },
  {
    slug: "solar-as-digital-fixed-income",
    title: "Solar as Digital Fixed Income: Risk-Adjusted Returns in Context",
    author: "EcoXchange Team",
    pillar: "climate_finance",
    tags: ["returns", "risk", "comparison"],
    excerpt:
      "Solar infrastructure delivered 12–16% levered IRRs with roughly one-third the volatility of the S&P 500. Where does it fit in a modern portfolio?",
    estimated_read_minutes: 8,
    requires_counsel_review: true,
    counsel_approved: true,
    published_at: "2026-06-09",
  },
  {
    slug: "from-idea-to-offering-how-a-project-reaches-ecoxchange",
    title: "From Idea to Offering: How a Solar Project Reaches EcoXchange",
    author: "EcoXchange Team",
    pillar: "developer_ecosystem",
    tags: ["developers", "process", "onboarding"],
    excerpt:
      "A step-by-step walkthrough of the developer intake process — from API keys and interconnection agreements to a live ESN offering in 2–4 weeks.",
    estimated_read_minutes: 6,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-02",
  },
  {
    slug: "building-ecoxchange-what-ive-learned",
    title: "Building EcoXchange: What I Have Learned So Far",
    author: "Mikal Banks",
    pillar: "founder_journey",
    tags: ["personal", "startup", "transparency"],
    excerpt:
      "Reflections on building a regulated digital securities platform from scratch — the decisions, the pivots, and the principles that guide EcoXchange.",
    estimated_read_minutes: 10,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-06",
  },
];
