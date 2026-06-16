import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { ProgressBar } from "./ProgressBar.js";
import { OfferingMatchCard } from "./OfferingMatchCard.js";
import { SUITABILITY_QUESTIONS } from "../../config/suitability-questions.js";
import type { OfferingRecommendation } from "../../types/suitability.js";

interface Props {
  recommendations: OfferingRecommendation[];
  onRetake: () => void;
}

export function SuitabilityResults({ recommendations, onRetake }: Props) {
  return (
    <div className="space-y-6">
      <ProgressBar current={SUITABILITY_QUESTIONS.length} total={SUITABILITY_QUESTIONS.length} complete />

      <header>
        <h1 className="font-heading text-3xl text-darkBg">Your Investor Profile</h1>
        <p className="mt-1 text-textMuted">
          Based on your profile, here are your recommended offerings.
        </p>
      </header>

      {recommendations.length === 0 ? (
        <p className="rounded-xl border border-paleGreen/60 bg-white p-5 text-sm text-textMuted">
          No open offerings to recommend right now. Check the marketplace soon.
        </p>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <OfferingMatchCard key={rec.offering_id} rec={rec} top={i === 0} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/investor/marketplace"
          className="inline-flex items-center rounded-lg bg-medGreen px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg"
        >
          Browse All Offerings
        </Link>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-2 rounded-lg border border-paleGreen px-5 py-3 text-sm font-medium text-darkBg hover:bg-cream"
        >
          <RotateCcw className="h-4 w-4" /> Retake Questionnaire
        </button>
      </div>
    </div>
  );
}
