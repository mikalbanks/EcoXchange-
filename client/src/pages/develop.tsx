import { Header } from "@/components/header";
import { DeveloperSubmissionWizard } from "@/components/developer-submission-wizard";
import { Card, CardContent } from "@/components/ui/card";

const costRows = [
  { item: "Securities counsel (PPM, sub docs)", traditional: "$12,000–$30,000", ecox: "Included (templated)" },
  { item: "Placement agent fee", traditional: "4–8% of capital raised", ecox: "3% origination fee" },
  { item: "Setup fee", traditional: "—", ecox: "$15,000 fixed" },
  { item: "Investor marketing", traditional: "$35K + 6–8% of capital", ecox: "Investor pool included" },
  { item: "Distribution administration", traditional: "$10K–$25K / year", ecox: "Automated (smart contract)" },
  { item: "Third-party production audit", traditional: "$5K–$15K / year", ecox: "Included (verification engine)" },
  { item: "Time to capital", traditional: "3–9 months", ecox: "Target 2–6 weeks" },
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
              EcoXchange underwrites equity raises of <strong>$1M–$5M</strong> for permitted 1–20 MW U.S.
              solar projects. Target intake-to-live offering timeline: <strong>2–4 weeks</strong>. No on-site
              verification hardware required — provide inverter portal and utility account access, and we handle
              the rest.
            </p>
            <div className="public-actions">
              <a href="#submit" className="public-btn public-btn-primary">Start project intake</a>
              <a href="#cost" className="public-btn public-btn-outline">Compare costs →</a>
            </div>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">$1–5M</span>
                <span className="public-mini-stat-label">Target equity raise per project</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">2–4 wks</span>
                <span className="public-mini-stat-label">Target intake-to-live timeline</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">0</span>
                <span className="public-mini-stat-label">New sensors required for verification</span>
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
            <h2 className="public-section-title">~55–65% lower all-in cost than a traditional Reg D raise.</h2>
          </div>
          <Card className="public-table-card border-border">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="public-table-head grid grid-cols-3 border-b border-border px-5 py-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Cost item</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Traditional Reg D 506(c)</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">EcoXchange</p>
                </div>
                {costRows.map((row, i) => (
                  <div
                    key={row.item}
                    className={`grid grid-cols-3 px-5 py-3 ${
                      i < costRows.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <p className="text-sm text-muted-foreground">{row.item}</p>
                    <p className="text-sm text-muted-foreground">{row.traditional}</p>
                    <p className="text-sm font-semibold text-primary">{row.ecox}</p>
                  </div>
                ))}
                <div className="public-total-row grid grid-cols-3 border-t-2 border-primary/20 px-5 py-4">
                  <p className="text-sm font-semibold text-foreground">All-in cost (Year 1)</p>
                  <p className="text-sm font-semibold text-foreground">$325K–$500K</p>
                  <p className="text-sm font-bold text-primary">~$125K–$175K</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="mt-4 font-mono text-[0.6rem] text-muted-foreground/70">
            Cost figures benchmarked from Manhattan Street Capital, Growth Turbine, and industry tax-equity practice.
            Final per-project economics subject to underwriting and securities counsel review.
          </p>
        </section>
      </main>
    </div>
  );
}
