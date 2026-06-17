import { ArticleCard } from "./ArticleCard.js";
import { toCard } from "../../data/content.js";
import type { Article } from "../../types/content.js";

export function RelatedArticles({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl text-darkBg">Related Articles</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={toCard(a)} />
        ))}
      </div>
    </section>
  );
}
