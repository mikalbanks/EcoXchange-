import { Building2, ExternalLink } from "lucide-react";
import type { OfferingSummary } from "../../types/offerings.js";

// Developer profile: logo (or fallback icon), name, bio, and track record.
export function DeveloperCard({ offering }: { offering: OfferingSummary }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-paleGreen/60 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paleGreen/40">
        {offering.developer_logo_url ? (
          <img
            src={offering.developer_logo_url}
            alt={offering.developer_name}
            className="h-full w-full object-contain"
          />
        ) : (
          <Building2 className="h-7 w-7 text-medGreen" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-xl text-darkBg">
            {offering.developer_name}
          </h3>
          {offering.developer_website ? (
            <a
              href={offering.developer_website}
              target="_blank"
              rel="noreferrer"
              className="text-medGreen hover:text-darkBg"
              aria-label="Developer website"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        {offering.developer_bio ? (
          <p className="mt-1 text-sm leading-relaxed text-textMuted">
            {offering.developer_bio}
          </p>
        ) : null}
        {offering.developer_track_record ? (
          <p className="mt-3 text-sm text-darkBg">
            <span className="font-semibold">Track record: </span>
            {offering.developer_track_record}
          </p>
        ) : null}
      </div>
    </div>
  );
}
