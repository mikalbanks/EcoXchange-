import { Header } from "@/components/header";
import { DeveloperSubmissionWizard } from "@/components/developer-submission-wizard";
import { Card, CardContent } from "@/components/ui/card";

const pilotRows = [
  { item: "Bankability & Sponsor Equity Analysis", scope: "Indicative debt capacity, tax-credit proceeds, sponsor-equity requirement, and financing constraints", status: "Included" },
  { item: "Project operating profile", scope: "Technical, ownership-workflow, and PPA input review", status: "Included" },
  { item: "Production backtest", scope: "12-month model-to-measurement comparison", status: "Pilot evaluation" },
  { item: "Evidence labeling", scope: "Measured, modeled, derived, or simulated per source leg", status: "Included" },
  { item: "Utility data", scope: "Partner-provided data preferred; any proxy is disclosed", status: "Availability-dependent" },
  { item: "Digital ownership workflow", scope: "Permissioned cap-table and transfer-control review", status: "Modeled" },
  { item: "PPA-based allocation", scope: "Pro-rata distribution-control calculation", status: "Modeled" },
  { item: "Securities offering", scope: "No offer, subscription, or capital raise", status: "Not included" },
  { item: "Legal and payment execution", scope: "No offering document or distribution execution", status: "Not included" },
];

export default function DevelopPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For renewable-project developers</p>
            <h1 className="public-title">
              Understand your project&apos;s
              <br />
              <em>financing requirement.</em>
            </h1>
            <p className="public-copy">
              EcoXchange analyzes project economics using lender-style project-finance assumptions to estimate
              indicative permanent debt capacity, tax-credit proceeds, sponsor-equity requirements, and financing
              constraints. The same project record can support production evidence, ownership administration, and
              modeled distribution controls.
            </p>
            <div className="public-actions">
              <a href="/bankability" className="public-btn public-btn-primary">Explore Bankability Analysis</a>
              <a href="https://demo.ecoxchange.net/bankability" className="public-btn public-btn-outline">See a 5 MW Financing Example →</a>
              <a href="#submit" className="public-btn public-btn-outline">Start project intake</a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Results are indicative analyses and do not constitute a financing commitment, lender approval, tax opinion,
              legal advice, or securities offering.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">1–20 MW</span>
                <span className="public-mini-stat-label">Current solar analysis scope</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">CFADS</span>
                <span className="public-mini-stat-label">Cash-flow-based debt capacity</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">DSCR + LTC</span>
                <span className="public-mini-stat-label">Binding debt constraint made visible</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="submit" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Project intake.</h2>
          </div>
          <DeveloperSubmissionWizard />
        </section>

        <section id="cost" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">What the Release 1 pilot includes.</h2>
          </div>
          <Card className="public-table-card border-border">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="public-table-head grid grid-cols-3 border-b border-border px-5 py-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Scope item</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Release 1 scope</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Status</p>
                </div>
                {pilotRows.map((row, i) => (
                  <div key={row.item} className={`grid grid-cols-3 px-5 py-3 ${i < pilotRows.length - 1 ? "border-b border-border/60" : ""}`}>
                    <p className="text-sm text-muted-foreground">{row.item}</p>
                    <p className="text-sm text-muted-foreground">{row.scope}</p>
                    <p className="text-sm font-semibold text-primary">{row.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <p className="mt-4 font-mono text-[0.6rem] text-muted-foreground/70">
            Pilot participation, data access, timing, and any commercial terms are confirmed separately in writing.
            This page is not a financing commitment, lender approval, securities offering, or quote.
          </p>
        </section>
      </main>
    </div>
  );
}
