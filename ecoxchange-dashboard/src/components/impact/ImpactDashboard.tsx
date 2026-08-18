import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { getImpactView } from "../../data/impact.js";
import { VerifiedBadge } from "./VerifiedBadge.js";
import { ImpactStatGrid } from "./ImpactStatGrid.js";
import { ImpactTimeline } from "./ImpactTimeline.js";
import { ImpactExtended } from "./ImpactExtended.js";
import { ImpactMethodology } from "./ImpactMethodology.js";
import { ShareImpactCard } from "./ShareImpactCard.js";
import { ErrorState } from "../shared/ErrorState.js";
import { EmptyState } from "../shared/EmptyState.js";
import { CardSkeleton } from "../shared/LoadingState.js";
import type { ImpactView } from "../../types/impact.js";
import { useData } from "../../context/DataContext.js";

export function ImpactDashboard() {
  const { scenario, mode } = useData();
  const [impact, setImpact] = useState<ImpactView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );
  const [showShare, setShowShare] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getImpactView({ variant: scenario })
      .then((res) => {
        if (!res) return setStatus("empty");
        setImpact(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [scenario]);

  useEffect(load, [load, scenario]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (status === "error") return <ErrorState onRetry={load} />;
  if (status === "empty" || !impact) {
    return (
      <EmptyState
        title="No qualifying impact data yet"
        message="Once your projects have periods with a VERIFIED engine status, an illustrative impact estimate will appear here."
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-heading text-3xl text-darkBg">Illustrative Impact Estimate</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <VerifiedBadge />
          <p className="text-sm text-textMuted">
            {mode === "supabase"
              ? "Calculated from connected records whose engine status is VERIFIED. Equivalencies use an eGRID factor and remain modeled estimates; confirm source provenance on each record."
              : scenario === "flagged"
                ? "Calculated from simulated Savannah records whose engine status is VERIFIED. Every production and impact value in this stress case is simulated."
                : "Calculated from measured PVDAQ inverter periods whose engine status is VERIFIED. Equivalencies use an eGRID factor and remain modeled estimates; the utility leg is derived."}
          </p>
        </div>
      </header>

      <ImpactStatGrid impact={impact} />

      <ImpactTimeline data={impact.monthly_breakdown} />

      <section className="space-y-4">
        <h2 className="font-heading text-xl text-darkBg">More Equivalencies</h2>
        <ImpactExtended impact={impact} />
      </section>

      <ImpactMethodology impact={impact} />

      <section className="space-y-4">
        {!showShare ? (
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-medGreen px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg"
          >
            <Share2 className="h-4 w-4" /> Share Your Impact
          </button>
        ) : (
          <ShareImpactCard impact={impact} />
        )}
      </section>
    </div>
  );
}
