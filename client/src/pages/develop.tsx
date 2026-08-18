import { Header } from "@/components/header";
import { DeveloperSubmissionWizard } from "@/components/developer-submission-wizard";
import { Card, CardContent } from "@/components/ui/card";

const pilotRows = [
  { item: "Production backtest", scope: "12-month model-to-measurement comparison", status: "Pilot evaluation" },
  { item: "Evidence labeling", scope: "Measured, modeled, derived, or simulated per source leg", status: "Included" },
  { item: "Utility data", scope: "Partner-provided data preferred; any proxy is disclosed", status: "Availability-dependent" },
  { item: "Project intake", scope: "Technical and operating-data collection", status: "Included" },
  { item: "Securities offering", scope: "No offer, subscription, or capital raise", status: "Not included" },
  { item: "Legal and payment execution", scope: "No LOI, offering document, or distribution execution", status: "Not included" },
];

export default function DevelopPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For solar developers</p>
            <h1 className="public-title">
              Submit a permitted
              <br />
              <em>solar project.</em>
            </h1>
            <p className="public-copy">
              EcoXchange is accepting permitted <strong>1–20 MW U.S. solar projects</strong> for a
              verification-led pilot. Selected partners provide available inverter and utility-source access; we
              review coverage and produce a source-labeled backtest. Capital-formation services are not part of
              the current pilot.
            </p>
            <div className="public-actions">
              <a href="#submit" className="public-btn public-btn-primary">Start project intake</a>
              <a href="#cost" className="public-btn public-btn-outline">Compare costs →</a>
            </div>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">1–20 MW</span>
                <span className="public-mini-stat-label">Pilot target project size</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">12 mo</span>
                <span className="public-mini-stat-label">Backtest analysis window</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">3</span>
                <span className="public-mini-stat-label">Evidence roles traced per period</span>
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
                  <div
                    key={row.item}
                    className={`grid grid-cols-3 px-5 py-3 ${
                      i < pilotRows.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
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
            This page is not an offering, financing commitment, or quote.
          </p>
        </section>
      </main>
    </div>
  );
}
