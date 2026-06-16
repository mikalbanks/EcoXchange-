import { useEffect, useState } from "react";
import { SuitabilityWizard } from "../components/suitability/SuitabilityWizard.js";
import { SuitabilityResults } from "../components/suitability/SuitabilityResults.js";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  getRecommendations,
} from "../data/suitability.js";
import type {
  OfferingRecommendation,
  SuitabilityAnswers,
} from "../types/suitability.js";

export function SuitabilityOnboarding() {
  const [recommendations, setRecommendations] = useState<
    OfferingRecommendation[] | null
  >(null);
  const [busy, setBusy] = useState(false);

  // Returning investors with a saved profile skip the wizard.
  useEffect(() => {
    const existing = loadProfile();
    if (existing) setRecommendations(existing.recommended_offerings);
  }, []);

  async function complete(answers: SuitabilityAnswers) {
    setBusy(true);
    try {
      const recs = await getRecommendations(answers);
      await saveProfile(answers, recs);
      setRecommendations(recs);
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    clearProfile();
    setRecommendations(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {recommendations !== null ? (
        <SuitabilityResults recommendations={recommendations} onRetake={retake} />
      ) : (
        <div className={busy ? "pointer-events-none opacity-60" : ""}>
          <SuitabilityWizard onComplete={complete} />
        </div>
      )}
    </div>
  );
}
