import type { ReactNode } from "react";
import { MonoTag } from "../components/ui/MonoTag.js";
import { MetricLabel } from "../components/ui/MetricExplainer.js";
import { USDC_OPTIONAL_DISCLOSURE } from "../utils/demo-config.js";

const WORKFLOW_CARDS = [
  {
    title: "Client allocation workflow",
    label: "Demo",
    body: "Review project, target allocation, subscription status, and client suitability notes.",
  },
  {
    title: "Project due diligence",
    label: "Demo",
    body: "Evaluate production, offtake assumptions, verification status, and supporting data.",
  },
  {
    title: "Verification reports",
    label: "Sample",
    body: "Open monthly reconciliation records showing inverter, utility meter, and expected production.",
  },
  {
    title: "Distribution history",
    label: "Demo",
    body: "Review verified monthly distributions calculated from project revenue and demo investor share.",
  },
  {
    title: "Tax / K-1 preparation",
    label: "Coming Soon",
    body: "Placeholder for project-level tax package coordination once offering records are connected.",
  },
  {
    title: "Compliance documents",
    label: "Coming Soon",
    body: "Placeholder for subscription, PPM, transfer restriction, and compliance materials.",
  },
];

export function Rias() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-12 space-y-8">
        <div className="max-w-4xl space-y-4">
          <MonoTag>For RIAs</MonoTag>
          <h1 className="font-display italic text-[36px] sm:text-[48px] leading-tight">
            A differentiated solar income allocation for accredited clients.
          </h1>
          <p className="font-body text-[16px] leading-8 text-eco-text-body">
            EcoXchange gives RIAs a way to evaluate income-producing solar
            allocations for verified accredited clients. Each offering is tied
            to one solar project and one SPV, not a blind pool.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Fact label="Minimum Investment" value="$10,000" />
          <Fact label="Target Annual USDC Yield" value="6-8%" />
          <Fact label="Target Net IRR" value="10-14%" />
          <Fact label="Asset Life" value="20-25 years" />
        </div>
        <p className="max-w-prose font-body text-[12px] leading-6 text-eco-text-body">
          {USDC_OPTIONAL_DISCLOSURE}
        </p>

        <section className="border border-eco-border bg-white p-6 sm:p-8">
          <h2 className="font-display italic text-[28px]">
            Advisor review surface.
          </h2>
          <p className="mt-3 max-w-3xl font-body text-[14px] leading-6 text-eco-text-body">
            Advisors can review project-level production, distributions, IRR
            assumptions, verification status, and documents before introducing a
            Reg D 506(c) opportunity to verified accredited clients.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {WORKFLOW_CARDS.map((card) => (
              <article
                key={card.title}
                className="border border-eco-border bg-eco-pale/35 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display italic text-[22px]">
                    {card.title}
                  </h3>
                  <span className="border border-eco-line bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
                    {card.label}
                  </span>
                </div>
                <p className="mt-3 font-body text-[13px] leading-6 text-eco-text-body">
                  {card.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-eco-border bg-white p-6 sm:p-8">
          <h2 className="font-display italic text-[28px]">
            What RIAs can inspect.
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 text-[14px] md:grid-cols-2">
            <CheckItem>
              <MetricLabel metric="annual_production">
                Project-level production
              </MetricLabel>
            </CheckItem>
            <CheckItem>
              <MetricLabel metric="distribution">
                Distribution history
              </MetricLabel>
            </CheckItem>
            <CheckItem>Offering-specific IRR assumptions when available</CheckItem>
            <CheckItem>
              <MetricLabel metric="verification_status">
                Monthly verification status
              </MetricLabel>
            </CheckItem>
            <CheckItem>Sample or finalized documents, clearly labeled</CheckItem>
            <CheckItem>Reg D 506(c), accredited investors only</CheckItem>
          </div>
        </section>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-eco-border bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-tag text-eco-text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-[32px] font-bold text-eco-text-primary">
        {value}
      </p>
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="bg-eco-pale/50 px-4 py-3 font-body text-eco-text-body">
      {children}
    </div>
  );
}
