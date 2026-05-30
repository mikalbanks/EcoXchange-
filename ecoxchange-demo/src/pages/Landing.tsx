import { Link } from "react-router-dom";
import { DemoAccessPanel } from "../components/DemoAccessPanel.js";
import { MonoTag } from "../components/ui/MonoTag.js";

const AUDIENCES = [
  {
    title: "For RIAs",
    body: "Allocate clients into single-asset solar yield.",
    cta: "View Investor Demo",
    href: "/portfolio",
  },
  {
    title: "For Solar Developers",
    body: "Raise equity for permitted solar projects without institutional minimums.",
    cta: "Submit Solar Project",
    href: "/developers",
  },
  {
    title: "For Investors & Partners",
    body: "Review verified performance, distributions, and project-level transparency.",
    cta: "Review Methodology",
    href: "/methodology",
  },
];

export function Landing() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-12 sm:pt-16 pb-10 space-y-8">
        <div className="max-w-4xl space-y-5">
          <MonoTag>EcoXchange Demo Portal</MonoTag>
          <h1 className="font-display italic text-[42px] sm:text-[58px] md:text-[68px] leading-[1.02]">
            Production-Verified Solar Yield for RIAs and Accredited Investors
          </h1>
          <p className="font-body text-[16px] sm:text-[18px] leading-8 text-eco-text-body max-w-prose">
            EcoXchange lets wealth advisors allocate accredited clients into
            single-project solar assets, with monthly production verification
            and automated distributions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-eco-dark text-white border border-eco-dark hover:bg-eco-mid transition-colors duration-150"
            >
              View Investor Demo
            </Link>
            <Link
              to="/methodology"
              className="inline-flex items-center justify-center px-7 py-3 font-body text-[13px] font-medium uppercase tracking-cta bg-white text-eco-dark border border-eco-dark hover:bg-eco-pale transition-colors duration-150"
            >
              Review Methodology
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <article key={audience.title} className="border border-eco-border p-6">
              <p className="font-mono text-[11px] uppercase tracking-tag text-eco-olive">
                {audience.title}
              </p>
              <h2 className="mt-3 font-display italic text-[25px] leading-tight">
                {audience.body}
              </h2>
              <Link
                to={audience.href}
                className="mt-6 inline-flex font-mono text-[11px] uppercase tracking-tag text-eco-mid hover:text-eco-dark"
              >
                {audience.cta} -&gt;
              </Link>
            </article>
          ))}
        </div>

        <DemoAccessPanel />
      </section>
    </main>
  );
}
