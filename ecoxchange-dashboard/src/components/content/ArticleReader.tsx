import { Newspaper } from "lucide-react";
import { PillarBadge } from "./PillarBadge.js";
import { ArticleMeta } from "./ArticleMeta.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import type { Article } from "../../types/content.js";

export function ArticleReader({ article }: { article: Article }) {
  return (
    <article className="space-y-6">
      <header className="space-y-4">
        <PillarBadge pillar={article.pillar} />
        <h1 className="font-heading text-3xl leading-tight text-darkBg sm:text-4xl">
          {article.title}
        </h1>
        {article.subtitle ? (
          <p className="text-lg text-textMuted">{article.subtitle}</p>
        ) : null}
        <ArticleMeta article={article} />
      </header>

      <div className="aspect-[2/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-darkBg via-medGreen to-accentBrt">
        {article.hero_image_url ? (
          <img
            src={article.hero_image_url}
            alt={article.hero_image_alt ?? article.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/70">
            <Newspaper className="h-12 w-12" aria-hidden="true" />
          </div>
        )}
      </div>

      <MarkdownRenderer content={article.body_markdown} />
    </article>
  );
}
