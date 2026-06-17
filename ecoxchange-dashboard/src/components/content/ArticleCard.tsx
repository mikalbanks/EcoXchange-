import { Link } from "react-router-dom";
import { Clock, Newspaper } from "lucide-react";
import { PillarBadge } from "./PillarBadge.js";
import type { ArticleCard as ArticleCardData } from "../../types/content.js";

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-paleGreen/60 bg-white shadow-sm transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[16/9] w-full bg-gradient-to-br from-darkBg via-medGreen to-accentBrt">
        {article.hero_image_url ? (
          <img
            src={article.hero_image_url}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/80">
            <Newspaper className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <PillarBadge pillar={article.pillar} size="sm" />
        <h3 className="font-heading text-xl leading-snug text-darkBg">
          {article.title}
        </h3>
        <p className="text-sm leading-relaxed text-textMuted">{article.excerpt}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-textMuted">
          <Clock className="h-3.5 w-3.5" />
          {article.estimated_read_minutes} min read
        </div>
      </div>
    </Link>
  );
}
