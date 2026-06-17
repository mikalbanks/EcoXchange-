// Content library types (Spec 11).

export type ContentPillar =
  | "solar_market_intelligence"
  | "tokenization_rwa"
  | "production_verification"
  | "developer_ecosystem"
  | "founder_journey"
  | "climate_finance";

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  pillar: ContentPillar;
  tags: string[];
  status: "draft" | "review" | "published" | "archived";
  excerpt: string;
  body_markdown: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  estimated_read_minutes: number;
  requires_counsel_review: boolean;
  counsel_approved: boolean;
  published_at: string | null;
  updated_at: string;
}

export interface ArticleSeries {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articles: Article[];
}

export interface ArticleCard {
  slug: string;
  title: string;
  excerpt: string;
  pillar: ContentPillar;
  author: string;
  published_at: string;
  estimated_read_minutes: number;
  hero_image_url: string | null;
  tags: string[];
}

// Pillar metadata for filtering and display.
export const PILLAR_META: Record<
  ContentPillar,
  { label: string; color: string; icon: string }
> = {
  solar_market_intelligence: { label: "Solar Market Intelligence", color: "#2E7D52", icon: "BarChart3" },
  tokenization_rwa: { label: "Tokenization & RWA", color: "#1B4D35", icon: "Coins" },
  production_verification: { label: "Production Verification", color: "#76C945", icon: "ShieldCheck" },
  developer_ecosystem: { label: "Developer Ecosystem", color: "#7A9B6D", icon: "Building2" },
  founder_journey: { label: "Founder Journey", color: "#8DC4A4", icon: "Compass" },
  climate_finance: { label: "Climate × Finance", color: "#2E7D52", icon: "Leaf" },
};
