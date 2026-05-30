import type { ReactNode } from "react";
import { MonoTag } from "../components/ui/MonoTag.js";
import { MetricLabel } from "../components/ui/MetricExplainer.js";

const FLOW = [
  "Inverter Data",
  "Utility Meter Data",
  "Satellite Irradiance Model",
  "Reconciliation Engine",
  "Verified Production",
  "Distribution Calculation",
  "Investor Reporting",
];

export function Methodology() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-12 space-y-8">
        <div className="max-w-4xl space-y-4">
          <MonoTag>Methodology</MonoTag>
          <h1 className="font-display italic text-[36px] sm:text-[48px] leading-tight">
            Monthly solar production verification before distributions.
          </h1>
          <p className="font-body text-[16px] leading-8 text-eco-text-body">
            EcoXchange compares inverter telemetry, utility meter data, and a
            satellite irradiance physics model before project revenue is used
            for investor reporting and distribution calculations.
          </p>
        </div>

        <section className="border border-eco-border bg-white p-5" aria-label="Verification process flow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
            {FLOW.map((step, index) => (
              <div key={step} className="relative">
                <div className="h-full border border-eco-border bg-eco-pale/40 p-4 text-center">
                  <p className="font-mono text-[11px] uppercase tracking-tag text-eco-dark">
                    {step}
                  </p>
                </div>
                {index < FLOW.length - 1 ? (
                  <span className="hidden md:block absolute right-[-0.8rem] top-1/2 z-10 -translate-y-1/2 font-mono text-eco-mid">
                    -&gt;
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MethodCard
            title="1. Inverter telemetry"
            body="The project monitoring system reports actual solar production from the inverter or plant API."
          />
          <MethodCard
            title="2. Utility meter data"
            body="Meter data gives an independent read of exported or settled production, reducing reliance on developer self-reporting."
          />
          <MethodCard
            title="3. Satellite model"
            body="Satellite irradiance and project specs produce expected generation for the same monthly period."
          />
        </section>

        <section className="border border-eco-border bg-white p-6 sm:p-8">
          <h2 className="font-display italic text-[28px]">
            How the engine reaches a status.
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Explainer title="Expected production">
              <MetricLabel metric="expected_production">
                Expected production
              </MetricLabel>{" "}
              is the model output for the period after project size, location,
              tilt, system losses, module efficiency, and irradiance are
              applied.
            </Explainer>
            <Explainer title="Deviation thresholds">
              <MetricLabel metric="deviation">Deviation</MetricLabel> compares
              actual production against expected production and utility meter
              data. A period is flagged when differences exceed configured
              tolerances.
            </Explainer>
            <Explainer title="Confidence score">
              <MetricLabel metric="confidence_score">Confidence score</MetricLabel>{" "}
              is presented as an investor-language signal for data completeness
              and alignment. If required data is missing, the demo shows Data
              Required rather than verified.
            </Explainer>
            <Explainer title="Distribution trigger">
              <MetricLabel metric="distribution">Distribution</MetricLabel>{" "}
              calculations use verified production and project revenue inputs.
              The demo does not guarantee timing, precision, or returns.
            </Explainer>
          </div>
        </section>

        <section className="border border-eco-border bg-eco-pale/35 p-6 sm:p-8">
          <h2 className="font-display italic text-[28px]">
            Why this differs from a fund or generic tokenized asset.
          </h2>
          <p className="mt-3 max-w-3xl font-body text-[14px] leading-6 text-eco-text-body">
            EcoXchange is organized around one solar project and one SPV. The
            demo emphasizes project-level verification, not a blind pool, public
            yieldco, or broad real-world-asset category. Distributions are
            calculated from verified project revenue inputs rather than
            developer self-reporting alone.
          </p>
        </section>
      </section>
    </main>
  );
}

function MethodCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="border border-eco-border bg-white p-5">
      <h2 className="font-display italic text-[22px]">{title}</h2>
      <p className="mt-2 font-body text-[14px] leading-6 text-eco-text-body">
        {body}
      </p>
    </article>
  );
}

function Explainer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-eco-pale/45 p-4">
      <h3 className="font-display italic text-[20px]">{title}</h3>
      <p className="mt-2 font-body text-[14px] leading-6 text-eco-text-body">
        {children}
      </p>
    </div>
  );
}
