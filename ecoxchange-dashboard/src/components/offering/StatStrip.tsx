import { StatCard } from "../StatCard.js";
import type { OfferingSummary } from "../../types/offerings.js";
import { ratioPct } from "./format.js";

// Horizontal row of four key project facts (capacity, PPA, escalator, ITC).
export function StatStrip({ offering }: { offering: OfferingSummary }) {
  const mw = offering.project.capacity_kw_dc / 1000;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Capacity" value={`${mw} MW`} sublabel="DC ground-mount" />
      <StatCard
        label="PPA Term"
        value={`${offering.ppa_term_years} yrs`}
        sublabel={offering.ppa_counterparty}
      />
      <StatCard
        label="Escalator"
        value={ratioPct(offering.ppa_escalator_pct)}
        sublabel="annual"
      />
      <StatCard
        label="Tax Credit"
        value={offering.itc_eligible ? "ITC" : "—"}
        sublabel={offering.itc_eligible ? "30% federal" : "not eligible"}
      />
    </div>
  );
}
