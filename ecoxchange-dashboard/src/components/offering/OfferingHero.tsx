import { Link } from "react-router-dom";
import { Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { OfferingSummary } from "../../types/offerings.js";
import { YieldDisclosure } from "../../compliance/components/YieldDisclosure.js";
import { ProjectionDisclosure } from "../../compliance/components/ProjectionDisclosure.js";
import { formatUsd } from "../../utils/formatters.js";
import { ratioPct } from "./format.js";
import { FundingProgress } from "./FundingProgress.js";
import { OfferingStatusBadge } from "./OfferingStatusBadge.js";

// Hero: project image (or branded placeholder) beside the offering summary card
// with headline economics, funding progress, and the primary invest CTA.
export function OfferingHero({ offering }: { offering: OfferingSummary }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-stretch">
      <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-paleGreen/60 bg-gradient-to-br from-darkBg via-medGreen to-accentBrt sm:min-h-[320px]">
        {offering.hero_image_url ? (
          <img
            src={offering.hero_image_url}
            alt={offering.headline}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-start justify-end p-6 text-white">
            <Sun className="mb-auto h-10 w-10 opacity-80" aria-hidden="true" />
            <div className="font-heading text-2xl sm:text-3xl">
              {offering.headline}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-2xl border border-paleGreen/60 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-heading text-2xl text-darkBg">
            {offering.offering_name}
          </h1>
          <OfferingStatusBadge status={offering.status} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-paleGreen/50 pt-5">
          <Metric
            label="Target Yield"
            value={
              <YieldDisclosure
                value={ratioPct(offering.target_annual_yield)}
                type="yield_rate"
                basis="projected"
              />
            }
          />
          <Metric
            label="Target IRR"
            value={
              <ProjectionDisclosure context="Target IRR — forward-looking projection">
                {ratioPct(offering.target_irr)}
              </ProjectionDisclosure>
            }
          />
          <Metric label="Min Investment" value={formatUsd(offering.minimum_investment)} />
          <Metric label="Token Price" value={formatUsd(offering.token_price)} />
        </dl>

        <div className="mt-5 border-t border-paleGreen/50 pt-5">
          <FundingProgress
            totalSubscribed={offering.total_subscribed}
            targetRaise={offering.target_raise}
          />
        </div>

        <Link
          to="/investor/onboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-medGreen px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg"
        >
          Invest Now
        </Link>
        <p className="mt-2 text-center text-xs text-textMuted">
          Reg D 506(c) — accredited investors only
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-textMuted">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-bold text-darkBg tabular-nums">
        {value}
      </dd>
    </div>
  );
}
