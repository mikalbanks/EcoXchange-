import { Clock } from "lucide-react";
import type { Article } from "../../types/content.js";

function monthYear(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ArticleMeta({ article }: { article: Article }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-textMuted">
      <span>By {article.author}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {article.estimated_read_minutes} min read
      </span>
      {article.published_at ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{monthYear(article.published_at)}</span>
        </>
      ) : null}
    </div>
  );
}
