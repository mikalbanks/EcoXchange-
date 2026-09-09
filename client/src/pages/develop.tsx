import { Header } from "@/components/header";
import { DeveloperSubmissionWizard } from "@/components/developer-submission-wizard";
import { Card, CardContent } from "@/components/ui/card";

const workflow = [
  { item: "1. See what the project can finance", scope: "Debt capacity, DSCR, contracted cash flow, tax-credit value", status: "Decision support" },
  { item: "2. Identify the sponsor-equity gap", scope: "Remaining sponsor cash requirement after available permanent sources", status: "Decision support" },
  { item: "3. Evaluate capital options", scope: "Compare capital-stack scenarios and financing constraints", status: "Structured analysis" },
  { item: "4. Pursue capital or buyer matching", scope: "Coordinate appropriate capital partners or long-term clean-energy buyers", status: "Qualification required" },
  { item: "5. Operate the project record", scope: "Project/SPE administration, reporting, verification, ownership and distribution infrastructure", status: "Platform support" },
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
              See what the project can finance.
              <br />
              <em>Then close what remains.</em>
            </h1>
            <p className="public-copy">
              EcoXchange helps developers estimate indicative debt capacity, sponsor-equity requirements,
              tax-credit value, and capital-stack scenarios. Qualified projects can then move into a structured
              capital-origination or clean-energy-buyer workflow based on the actual remaining need.
            </p>
            <div className="public-actions">
              <a href="#submit" className="public-btn public-btn-primary">Submit / Analyze a Project</a>
              <a href="/bankability" className="public-btn public-btn-outline">Open Finance Readiness</a>
              <a href="https://demo.ecoxchange.net/bankability" className="public-btn public-btn-outline">View Project Finance Demo →</a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              EcoXchange provides decision support and coordination infrastructure; it is not a lender or underwriter,
              does not guarantee financing, and does not itself act as a placement agent. Any regulated securities
              solicitation or placement is handled through appropriately registered partners where required.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Debt capacity</span>
                <span className="public-mini-stat-label">Size debt from project cash flow and coverage constraints</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Sponsor equity</span>
                <span className="public-mini-stat-label">Define the remaining capital requirement</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Next action</span>
                <span className="public-mini-stat-label">Capital partner, clean-energy buyer, or further project work</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Developer financing workflow.</h2>
          </div>
          <Card className="public-table-card border-border">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="public-table-head grid grid-cols-3 border-b border-border px-5 py-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Step</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">What EcoXchange does</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Role</p>
                </div>
                {workflow.map((row, i) => (
                  <div key={row.item} className={`grid grid-cols-3 px-5 py-3 ${i < workflow.length - 1 ? "border-b border-border/60" : ""}`}>
                    <p className="text-sm font-semibold">{row.item}</p>
                    <p className="text-sm text-muted-foreground">{row.scope}</p>
                    <p className="text-sm font-semibold text-primary">{row.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="submit" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Project intake.</h2>
          </div>
          <p className="public-section-copy mb-5">
            Start with the actual project. The intake is used to build the finance-readiness view and determine what
            additional diligence is required before capital or buyer coordination makes sense.
          </p>
          <DeveloperSubmissionWizard />
        </section>
      </main>
    </div>
  );
}
