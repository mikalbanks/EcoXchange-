import { FileText, Lock, ExternalLink } from "lucide-react";
import type { ProjectDocument } from "../../types/offerings.js";

// Document vault: public docs link out to the PDF; non-public docs show a
// locked "Subscribe to Access" state until the subscription/compliance flow.
export function DocumentList({ documents }: { documents: ProjectDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-paleGreen/60 bg-white p-5 text-sm text-textMuted">
        No documents have been published for this offering yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-paleGreen/50 overflow-hidden rounded-xl border border-paleGreen/60 bg-white">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-4 px-5 py-4"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paleGreen/40">
              {doc.is_public ? (
                <FileText className="h-4 w-4 text-medGreen" />
              ) : (
                <Lock className="h-4 w-4 text-textMuted" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-darkBg">{doc.title}</div>
              {doc.description ? (
                <div className="truncate text-sm text-textMuted">
                  {doc.description}
                </div>
              ) : null}
            </div>
          </div>

          {doc.is_public ? (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-medGreen hover:text-darkBg"
            >
              View PDF <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paleGreen/40 px-3 py-1 text-xs font-medium text-textMuted">
              <Lock className="h-3 w-3" /> Subscribe to Access
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
