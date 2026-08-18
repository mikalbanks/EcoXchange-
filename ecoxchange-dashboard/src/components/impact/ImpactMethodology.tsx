import type { ImpactMetrics } from "../../types/impact.js";

// Data-source + methodology disclosure (eGRID region, factor, verified-only note).
export function ImpactMethodology({ impact }: { impact: ImpactMetrics }) {
  return (
    <div className="rounded-xl border border-paleGreen/50 bg-cream/50 p-5">
      <h3 className="font-heading text-lg text-darkBg">Data Methodology</h3>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-textMuted">
        Conversion factors are from the U.S. EPA Greenhouse Gas Equivalencies
        Calculator. CO₂ avoided uses the regional eGRID emission factor{" "}
        <span className="font-semibold text-darkBg">
          {impact.egrid_region} ({impact.egrid_factor_used} kg CO₂/kWh)
        </span>{" "}
        rather than the national average, reflecting the grid your project
        displaces. Only months with a VERIFIED engine status
        {impact.months_flagged > 0
          ? ` (${impact.months_verified} verified; ${impact.months_flagged} flagged months excluded)`
          : ` (${impact.months_verified} verified)`}{" "}
        are included in these calculations. That status is a tolerance result,
        not proof that every source leg was independently measured. Review the
        project record for provenance before relying on the estimate.
      </p>
    </div>
  );
}
