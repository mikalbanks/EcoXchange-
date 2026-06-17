import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Markdown → styled HTML with EcoXchange typography (Spec 11).
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <article
      className="prose prose-lg max-w-none
        prose-headings:font-heading prose-headings:text-darkBg
        prose-p:text-textDark prose-p:leading-relaxed
        prose-a:text-medGreen prose-a:underline
        prose-strong:text-darkBg
        prose-blockquote:border-l-accentBrt prose-blockquote:bg-cream prose-blockquote:not-italic prose-blockquote:text-darkBg
        prose-code:font-mono prose-code:text-sm
        prose-pre:bg-cream prose-pre:text-darkBg prose-pre:border prose-pre:border-paleGreen
        prose-table:border prose-th:bg-paleGreen prose-th:text-darkBg
        prose-li:text-textDark"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
