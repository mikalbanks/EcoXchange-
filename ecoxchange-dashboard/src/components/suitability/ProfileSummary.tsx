import { Link } from "react-router-dom";
import { SUITABILITY_QUESTIONS } from "../../config/suitability-questions.js";
import type { SuitabilityProfile } from "../../types/suitability.js";

// Compact summary of a saved suitability profile (e.g. for the settings page).
export function ProfileSummary({ profile }: { profile: SuitabilityProfile }) {
  function labelFor(field: string, value: string): string {
    const q = SUITABILITY_QUESTIONS.find((x) => x.field === field);
    return q?.options.find((o) => o.value === value)?.label ?? value;
  }

  const rows: { label: string; value: string }[] = [
    { label: "Experience", value: labelFor("experience_level", profile.experience_level) },
    { label: "Objective", value: labelFor("primary_objective", profile.primary_objective) },
    { label: "Risk tolerance", value: labelFor("risk_tolerance", profile.risk_tolerance) },
    { label: "Time horizon", value: labelFor("time_horizon", profile.time_horizon) },
    { label: "Planned allocation", value: labelFor("planned_allocation", profile.planned_allocation) },
    { label: "Digital assets", value: labelFor("crypto_comfort", profile.crypto_comfort) },
  ];

  return (
    <div className="rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-darkBg">Investor Profile</h3>
        <Link
          to="/onboarding"
          className="text-sm font-medium text-medGreen hover:text-darkBg"
        >
          Update
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b border-paleGreen/40 pb-2">
            <dt className="text-sm text-textMuted">{r.label}</dt>
            <dd className="text-sm font-medium text-darkBg">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
