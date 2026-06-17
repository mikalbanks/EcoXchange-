import { useMemo, useState } from "react";
import { PillarFilter, type PillarFilterValue } from "./PillarFilter.js";
import { ArticleCard } from "./ArticleCard.js";
import { toCard } from "../../data/content.js";
import type { Article, ContentPillar } from "../../types/content.js";

const PAGE = 6;

export function ArticleIndex({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState<PillarFilterValue>("all");
  const [shown, setShown] = useState(PAGE);

  const available = useMemo(
    () => Array.from(new Set(articles.map((a) => a.pillar))) as ContentPillar[],
    [articles],
  );

  const filtered = useMemo(
    () => (active === "all" ? articles : articles.filter((a) => a.pillar === active)),
    [articles, active],
  );

  const visible = filtered.slice(0, shown);

  return (
    <div className="space-y-6">
      <PillarFilter
        active={active}
        onChange={(v) => {
          setActive(v);
          setShown(PAGE);
        }}
        available={available}
      />

      {visible.length === 0 ? (
        <p className="rounded-xl border border-paleGreen/60 bg-white p-6 text-sm text-textMuted">
          No articles in this pillar yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {visible.map((a) => (
            <ArticleCard key={a.slug} article={toCard(a)} />
          ))}
        </div>
      )}

      {shown < filtered.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE)}
            className="rounded-lg border border-medGreen px-5 py-2.5 text-sm font-semibold text-medGreen transition-colors duration-150 hover:bg-paleGreen/40"
          >
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
}
