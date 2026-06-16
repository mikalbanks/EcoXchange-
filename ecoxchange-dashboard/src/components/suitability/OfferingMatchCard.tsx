import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import type { OfferingRecommendation } from "../../types/suitability.js";

function badgeClasses(score: number): string {
  if (score > 70) return "bg-accentBrt/20 text-darkBg";
  if (score > 50) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export function OfferingMatchCard({
  rec,
  top,
}: {
  rec: OfferingRecommendation;
  top?: boolean;
}) {
  return (
    <div className="rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${badgeClasses(
            rec.fit_score,
          )}`}
        >
          {top ? <Trophy className="h-4 w-4" /> : null}
          {rec.fit_score}% Match
        </span>
      </div>

      <h3 className="mt-3 font-heading text-xl text-darkBg">{rec.offering_name}</h3>

      {rec.fit_reasons.length > 0 ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">
            Why this fits
          </div>
          <ul className="mt-2 space-y-1.5">
            {rec.fit_reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm text-darkBg">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-medGreen" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        to={`/investor/offering/${rec.offering_slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-medGreen hover:text-darkBg"
      >
        View Offering <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
