import { SEED_ARTICLES, type ArticleMeta } from "./seed-articles.js";
import type { Article, ArticleCard } from "../types/content.js";

// Bundle the article markdown bodies at build time (Vite). Keyed by slug.
const bodies = import.meta.glob("./articles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BODY_BY_SLUG: Record<string, string> = {};
for (const [path, raw] of Object.entries(bodies)) {
  const slug = path.replace(/^.*\//, "").replace(/\.md$/, "");
  BODY_BY_SLUG[slug] = raw;
}

function toArticle(meta: ArticleMeta): Article {
  const body = BODY_BY_SLUG[meta.slug] ?? "";
  return {
    id: meta.slug,
    slug: meta.slug,
    title: meta.title,
    subtitle: meta.subtitle ?? null,
    author: meta.author,
    pillar: meta.pillar,
    tags: meta.tags,
    // Only entries with a bundled body are treated as published.
    status: body ? "published" : "draft",
    excerpt: meta.excerpt,
    body_markdown: body,
    hero_image_url: meta.hero_image_url ?? null,
    hero_image_alt: null,
    meta_title: null,
    meta_description: meta.excerpt,
    estimated_read_minutes: meta.estimated_read_minutes,
    requires_counsel_review: meta.requires_counsel_review,
    counsel_approved: meta.counsel_approved,
    published_at: meta.published_at,
    updated_at: meta.published_at,
  };
}

const ALL_ARTICLES: Article[] = SEED_ARTICLES.map(toArticle);

// Pure gate: publicly visible = published, has a body, and passes the counsel
// review gate. Sorted newest first. Exported for testing (acceptance #9).
export function publicArticles(all: Article[]): Article[] {
  return all
    .filter((a) => a.status === "published" && a.body_markdown.length > 0)
    .filter((a) => !(a.requires_counsel_review && !a.counsel_approved))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

export function toCard(a: Article): ArticleCard {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    pillar: a.pillar,
    author: a.author,
    published_at: a.published_at ?? "",
    estimated_read_minutes: a.estimated_read_minutes,
    hero_image_url: a.hero_image_url,
    tags: a.tags,
  };
}

export function getArticles(): Article[] {
  return publicArticles(ALL_ARTICLES);
}

export function getArticleBySlug(slug: string): Article | null {
  return getArticles().find((a) => a.slug === slug) ?? null;
}

export function getRelated(article: Article, n = 2): Article[] {
  return getArticles()
    .filter((a) => a.slug !== article.slug && a.pillar === article.pillar)
    .slice(0, n);
}
