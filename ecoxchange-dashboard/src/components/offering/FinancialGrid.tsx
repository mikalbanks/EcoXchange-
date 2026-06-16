import type { ReactNode } from "react";
import type { OfferingSummary } from "../../types/offerings.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { formatUsd, formatMonthLong } from "../../utils/formatters.js";
import { ratioPct } from "./format.js";

const numberFmt = new Intl.NumberFormat("en-US");

// Two-column term sheet of the offering's financial terms.
export function FinancialGrid({ offering }: { offering: OfferingSummary }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-paleGreen/60 bg-paleGreen/60 sm:grid-cols-2">
      <Term
        label="Target Annual Yield"
        value={
          <AnimatedNumber
            value={offering.target_annual_yield * 100}
            format={(n) => `${n.toFixed(1)}%`}
          />
        }
      />
      <Term label="Distribution" value={titleCase(offering.distribution_frequency)} />
      <Term
        label="Target Net IRR"
        value={
          <AnimatedNumber
            value={offering.target_irr * 100}
            format={(n) => `${n.toFixed(1)}%`}
          />
        }
      />
      <Term
        label="First Payout"
        value={
          offering.first_distribution_date
            ? formatMonthLong(offering.first_distribution_date)
            : "TBD"
        }
      />
      <Term label="PPA Term" value={`${offering.ppa_term_years} yrs`} />
      <Term
        label="Token Price"
        value={
          <AnimatedNumber value={offering.token_price} format={(n) => formatUsd(n)} />
        }
      />
      <Term label="PPA Escalator" value={`${ratioPct(offering.ppa_escalator_pct)}/yr`} />
      <Term
        label="Tokens Available"
        value={
          <AnimatedNumber
            value={offering.tokens_remaining}
            format={(n) => numberFmt.format(Math.round(n))}
          />
        }
      />
    </div>
  );
}

function Term({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white px-5 py-4">
      <span className="text-sm text-textMuted">{label}</span>
      <span className="font-mono text-base font-bold text-darkBg tabular-nums">
        {value}
      </span>
    </div>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
