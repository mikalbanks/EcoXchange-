import { useCallback, useEffect, useState } from "react";
import { getOpenOfferings } from "../../data/offerings.js";
import { OfferingCard } from "../../components/offering/OfferingCard.js";
import { ErrorState } from "../../components/shared/ErrorState.js";
import { EmptyState } from "../../components/shared/EmptyState.js";
import { CardSkeleton } from "../../components/shared/LoadingState.js";
import type { Offering } from "../../types/offerings.js";

export function Marketplace() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "empty">(
    "loading",
  );

  const load = useCallback(() => {
    setStatus("loading");
    getOpenOfferings()
      .then((res) => {
        setOfferings(res);
        setStatus(res.length === 0 ? "empty" : "ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl text-darkBg">Marketplace</h1>
        <p className="mt-1 text-textMuted">
          Illustrative solar offerings with source-aware production evidence.
          Demo listings are not open for investment.
        </p>
      </header>

      {status === "loading" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : status === "error" ? (
        <ErrorState onRetry={load} />
      ) : status === "empty" ? (
        <EmptyState
          title="No open offerings"
          message="There are no offerings open for subscription right now. Check back soon."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      )}
    </div>
  );
}
