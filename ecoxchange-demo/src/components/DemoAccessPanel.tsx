import { Link } from "react-router-dom";

const DEMOS = [
  {
    title: "Investor Demo",
    body: "Portfolio view with project-level production, verification, and distributions.",
    to: "/portfolio",
  },
  {
    title: "Solar Developer Demo",
    body: "Solar project submission workflow for permitted or revenue-ready assets.",
    to: "/developers",
  },
  {
    title: "RIA Demo",
    body: "Advisor allocation, due diligence, reports, and document placeholders.",
    to: "/rias",
  },
];

export function DemoAccessPanel() {
  return (
    <section className="border border-eco-border bg-eco-pale/45 p-6 sm:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-tag text-eco-olive">
            Demo Access
          </p>
          <h2 className="mt-2 font-display italic text-[26px] sm:text-[30px]">
            Choose a demo path.
          </h2>
        </div>
        <p className="max-w-xl font-body text-[14px] leading-6 text-eco-text-body">
          This standalone demo has no login and no public passwords. Each route
          is marked as demo-only where sample or placeholder data appears.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {DEMOS.map((demo) => (
          <Link
            key={demo.title}
            to={demo.to}
            className="border border-eco-border bg-white p-5 transition-colors duration-150 hover:bg-eco-pale"
          >
            <h3 className="font-display italic text-[22px]">{demo.title}</h3>
            <p className="mt-2 font-body text-[13px] leading-6 text-eco-text-body">
              {demo.body}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-tag text-eco-mid">
              Open Demo -&gt;
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
