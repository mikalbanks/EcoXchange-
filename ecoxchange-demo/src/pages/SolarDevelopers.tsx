import { Link } from "react-router-dom";
import { MonoTag } from "../components/ui/MonoTag.js";

const STEPS = [
  "Submit solar project",
  "Upload project documents",
  "Connect production data / inverter API",
  "Run reconciliation readiness check",
  "Prepare Reg D 506(c) offering with BD/counsel support",
  "Launch to RIA/accredited investor channel",
];

export function SolarDevelopers() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-12 space-y-8">
        <div className="border border-eco-border bg-eco-dark px-6 py-10 text-white sm:px-10">
          <MonoTag className="text-eco-text-light">For Solar Developers</MonoTag>
          <h1 className="mt-4 max-w-4xl font-display italic text-[36px] sm:text-[48px] leading-tight text-white">
            Capital formation for permitted and revenue-ready solar projects.
          </h1>
          <p className="mt-4 max-w-3xl font-body text-[16px] leading-8 text-eco-text-light">
            EcoXchange helps U.S. solar developers access accredited investor
            capital for single-project offerings. The current focus is solar
            only, especially community solar and small-scale solar projects.
          </p>
          <Link
            to="/onboard"
            className="mt-8 inline-flex items-center justify-center px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-eco-cta-olive text-eco-dark border border-eco-cta-olive hover:brightness-95 transition-all duration-150"
          >
            Submit Solar Project
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            "PPA or community solar revenue assumptions",
            "Site location, permits, and interconnection status",
            "Production data access and inverter/API availability",
          ].map((item) => (
            <div key={item} className="border border-eco-border bg-white p-5">
              <p className="font-mono text-[11px] uppercase tracking-tag text-eco-olive">
                Solar intake
              </p>
              <p className="mt-3 font-body text-[14px] leading-6 text-eco-text-body">
                {item}
              </p>
            </div>
          ))}
        </section>

        <section className="border border-eco-border bg-white p-6 sm:p-8">
          <h2 className="font-display italic text-[28px]">
            Solar project submission workflow.
          </h2>
          <p className="mt-3 max-w-3xl font-body text-[14px] leading-6 text-eco-text-body">
            Developers submit project details so EcoXchange can evaluate whether
            the project can support an ESN offering and monthly production
            verification.
          </p>
          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 border border-eco-border bg-eco-pale/35 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-eco-dark font-mono text-[12px] text-white">
                  {index + 1}
                </span>
                <span className="pt-1 font-body text-[14px] font-medium text-eco-text-primary">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
