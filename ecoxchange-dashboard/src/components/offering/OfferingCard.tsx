import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Offering } from "../../types/offerings.js";
import { formatUsd } from "../../utils/formatters.js";
import { ratioPct } from "./format.js";
import { FundingProgress } from "./FundingProgress.js";
import { OfferingStatusBadge } from "./OfferingStatusBadge.js";

// Marketplace tile linking to an offering's summary page.
export function OfferingCard({ offering }: { offering: Offering }) {
  return (
    <Link
      to={`/investor/offering/${offering.slug}`}
      className="flex flex-col rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg text-darkBg">
          {offering.offering_name}
        </h3>
        <OfferingStatusBadge status={offering.status} />
      </div>
      <p className="mt-1 flex items-center gap-1 text-sm text-textMuted">
        <MapPin className="h-3.5 w-3.5" /> {offering.headline}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-paleGreen/50 pt-4">
        <Mini label="Yield" value={ratioPct(offering.target_annual_yield)} />
        <Mini label="IRR" value={ratioPct(offering.target_irr)} />
        <Mini label="Min" value={formatUsd(offering.minimum_investment)} />
      </div>

      <div className="mt-4">
        <FundingProgress
          totalSubscribed={offering.total_subscribed}
          targetRaise={offering.target_raise}
        />
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-textMuted">
        {label}
      </div>
      <div className="font-mono text-sm font-bold text-darkBg tabular-nums">
        {value}
      </div>
    </div>
  );
}
