import { supabase } from "../lib/supabase.js";
import { getOpenOfferings } from "./offerings.js";
import { scoreOfferings } from "../utils/suitability-scorer.js";
import { DEMO_INVESTOR_ID } from "./distributions.js";
import type {
  OfferingRecommendation,
  SuitabilityAnswers,
  SuitabilityProfile,
} from "../types/suitability.js";

const STORAGE_KEY = "suitability:profile";

export function loadProfile(): SuitabilityProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SuitabilityProfile) : null;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

// Score the open offerings against the answers.
export async function getRecommendations(
  answers: SuitabilityAnswers,
): Promise<OfferingRecommendation[]> {
  const offerings = await getOpenOfferings();
  return scoreOfferings(answers, offerings);
}

// Persist the completed profile. Demo: localStorage. Live: also attempt a
// Supabase upsert (RLS-gated until auth — failures are swallowed).
export async function saveProfile(
  answers: SuitabilityAnswers,
  recommendations: OfferingRecommendation[],
): Promise<SuitabilityProfile> {
  const profile: SuitabilityProfile = {
    id: `local-${DEMO_INVESTOR_ID}`,
    investor_id: DEMO_INVESTOR_ID,
    ...answers,
    recommended_offerings: recommendations,
    completed_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable — profile stays in memory for this session */
  }

  if (supabase) {
    try {
      await supabase.from("suitability_profiles").upsert(
        {
          investor_id: DEMO_INVESTOR_ID,
          ...answers,
          recommended_offerings: recommendations,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "investor_id" },
      );
    } catch {
      /* expected until auth provides a writable session */
    }
  }

  return profile;
}
