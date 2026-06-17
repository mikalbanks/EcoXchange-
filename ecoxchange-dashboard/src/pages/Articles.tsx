import { useEffect } from "react";
import { ArticleIndex } from "../components/content/ArticleIndex.js";
import { getArticles } from "../data/content.js";

export function Articles() {
  const articles = getArticles();

  useEffect(() => {
    const prev = document.title;
    document.title = "The EcoXchange Journal — Production-Verified Solar";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="font-heading text-4xl text-darkBg">The EcoXchange Journal</h1>
        <p className="mt-2 text-textMuted">
          Research, education, and field reports from the production-verified solar
          investment platform.
        </p>
      </header>

      <ArticleIndex articles={articles} />
    </div>
  );
}
