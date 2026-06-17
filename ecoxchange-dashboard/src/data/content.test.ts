import { describe, it, expect } from "vitest";
import { publicArticles } from "./content.js";
import type { Article } from "../types/content.js";

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "a",
    slug: "a",
    title: "A",
    subtitle: null,
    author: "EcoXchange Team",
    pillar: "production_verification",
    tags: [],
    status: "published",
    excerpt: "x",
    body_markdown: "# Body",
    hero_image_url: null,
    hero_image_alt: null,
    meta_title: null,
    meta_description: null,
    estimated_read_minutes: 5,
    requires_counsel_review: false,
    counsel_approved: false,
    published_at: "2026-06-01",
    updated_at: "2026-06-01",
    ...overrides,
  };
}

describe("publicArticles", () => {
  it("hides counsel-review-required articles that are not approved", () => {
    const out = publicArticles([
      article({ slug: "gated", requires_counsel_review: true, counsel_approved: false }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("shows counsel-required articles once approved", () => {
    const out = publicArticles([
      article({ slug: "ok", requires_counsel_review: true, counsel_approved: true }),
    ]);
    expect(out.map((a) => a.slug)).toEqual(["ok"]);
  });

  it("excludes drafts and bodyless entries, sorts newest first", () => {
    const out = publicArticles([
      article({ slug: "draft", status: "draft" }),
      article({ slug: "empty", body_markdown: "" }),
      article({ slug: "old", published_at: "2026-05-01" }),
      article({ slug: "new", published_at: "2026-06-15" }),
    ]);
    expect(out.map((a) => a.slug)).toEqual(["new", "old"]);
  });
});
