import { Link } from "react-router-dom";
import { MonoTag } from "../components/ui/MonoTag.js";

export function Reference() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-site px-6 sm:px-8 pt-10 sm:pt-14 pb-12 space-y-6">
        <MonoTag>Reference</MonoTag>
        <h1 className="font-display italic text-[36px] sm:text-[48px] leading-tight">
          Demo reference routes.
        </h1>
        <p className="max-w-prose font-body text-[15px] leading-7 text-eco-text-body">
          Use these pages to review the public investor demo, Supabase-backed
          project marketplace, methodology, RIA workflow, and solar developer
          workflow.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ["/portfolio", "Portfolio"],
            ["/projects", "Projects"],
            ["/methodology", "Methodology"],
            ["/rias", "For RIAs"],
            ["/developers", "For Solar Developers"],
            ["/onboard", "Request Access"],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className="border border-eco-border bg-white p-4 font-mono text-[11px] uppercase tracking-tag text-eco-mid hover:bg-eco-pale"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
