import { MonoTag } from "../components/ui/MonoTag.js";

export function Onboard() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-12 space-y-8">
        <div className="max-w-4xl space-y-4">
          <MonoTag>Request Access</MonoTag>
          <h1 className="font-display italic text-[36px] sm:text-[48px] leading-tight">
            Submit a solar project or request demo access.
          </h1>
          <p className="font-body text-[16px] leading-8 text-eco-text-body">
            This demo page captures the intended intake fields for solar project
            developers, RIAs, investors, and partners. It is a static demo form;
            no information is submitted from this standalone site.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            "Project name, site location, and capacity",
            "PPA or community solar revenue assumptions",
            "Interconnection, permits, and commissioning timeline",
            "Production data access and inverter/API availability",
            "RIA, investor, or partner contact details",
            "Document upload placeholder for future workflow",
          ].map((item) => (
            <div key={item} className="border border-eco-border bg-eco-pale/35 p-5">
              <p className="font-body text-[14px] leading-6 text-eco-text-body">
                {item}
              </p>
            </div>
          ))}
        </section>

        <a
          href="mailto:hello@ecoxchange.net?subject=EcoXchange%20demo%20access"
          className="inline-flex items-center justify-center px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-eco-dark text-white border border-eco-dark hover:bg-eco-mid transition-colors duration-150"
        >
          Contact EcoXchange
        </a>
      </section>
    </main>
  );
}
