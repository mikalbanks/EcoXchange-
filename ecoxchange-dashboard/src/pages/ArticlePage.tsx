import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getArticleBySlug, getRelated } from "../data/content.js";
import { ArticleReader } from "../components/content/ArticleReader.js";
import { RelatedArticles } from "../components/content/RelatedArticles.js";
import { ArticleCTA } from "../components/content/ArticleCTA.js";
import { EmptyState } from "../components/shared/EmptyState.js";

function setMeta(description: string): () => void {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const created = !tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "description";
    document.head.appendChild(tag);
  }
  const prev = tag.content;
  tag.content = description;
  return () => {
    if (created) tag?.remove();
    else if (tag) tag.content = prev;
  };
}

export function ArticlePage() {
  const { slug = "" } = useParams();
  const article = getArticleBySlug(slug);

  useEffect(() => {
    if (!article) return;
    const prevTitle = document.title;
    document.title = `${article.meta_title ?? article.title} — EcoXchange`;
    const restoreMeta = setMeta(article.meta_description ?? article.excerpt);
    return () => {
      document.title = prevTitle;
      restoreMeta();
    };
  }, [article]);

  const back = (
    <Link
      to="/articles"
      className="inline-flex items-center gap-1 text-sm font-medium text-medGreen hover:text-darkBg"
    >
      <ArrowLeft className="h-4 w-4" /> The Journal
    </Link>
  );

  if (!article) {
    return (
      <div className="space-y-6">
        {back}
        <EmptyState
          title="Article not found"
          message="This article may have moved or is not yet published."
          cta={{ label: "Back to the Journal", to: "/articles" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {back}
      <ArticleReader article={article} />
      <hr className="border-paleGreen/50" />
      <RelatedArticles articles={getRelated(article, 2)} />
      <ArticleCTA />
    </div>
  );
}
