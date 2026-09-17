import { Header } from "@/components/header";
import { DeveloperSubmissionWizard } from "@/components/developer-submission-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const workflow = [
  {
    title: "1. Model project financeability",
    body: "Estimate indicative debt capacity using project cash flow, DSCR constraints, debt terms, and the applicable LTC ceiling.",
  },
  {
    title: "2. Identify the capital gap",
    body: "Show modeled tax-credit value and other permanent sources separately, then calculate the remaining sponsor-equity requirement.",
  },
  {
    title: "3. Understand the binding constraint",
    body: "See whether debt service coverage, leverage, project data, development readiness, contracted revenue, or another project fact is limiting the modeled case.",
  },
  {
    title: "4. Compare realistic scenarios",
    body: "Evaluate how project assumptions, financing terms, tax-credit monetization, and capital-stack choices change debt capacity and sponsor equity.",
  },
  {
    title: "5. Determine the next financing action",
    body: "A qualified project can move toward further project work, an appropriate capital partner, a clean-energy buyer, or another financing path based on the actual remaining need.",
  },
] as const;

const outputs = [
  ["Indicative debt capacity", "DSCR-sized debt compared with the applicable LTC ceiling."],
  ["Sponsor-equity requirement", "The remaining modeled sponsor cash requirement after permanent sources."],
  ["Tax-credit value", "Modeled credit value and transfer proceeds kept distinct from permanent debt."],
  ["Capital-stack scenarios", "Comparable financing cases without changing the underlying project facts."],
  ["Binding constraint", "A clear explanation of what is limiting the modeled financing case."],
  ["Next action", "Project work, capital-partner coordination, clean-energy buyer engagement, or another path."],
] as const;

export default function DevelopPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For renewable-project developers</p>
            <h1 className="public-title">
              Understand what the project can finance.
              <br />
              <em>Know the capital gap before you pursue capital.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              Start with one real project. EcoXchange estimates indicative debt capacity, sponsor equity, tax-credit value, and financing constraints, then helps qualified sponsors identify the remaining capital gap and the capital-provider paths that may fit it.
            </p>
            <div className="public-actions">
              <a href="#submit" className="public-btn public-btn-primary">Send Us One Project</a>
              <a href="/bankability" className="public-btn public-btn-outline">Explore Project Finance Readiness</a>
              <a href="https://demo.ecoxchange.net/bankability" className="public-btn public-btn-outline">Open Finance Demo →</a>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Best fit today: contracted or awarded renewable projects, generally 1–20 MW, with a real financing question or unresolved sponsor-capital need. Partial or anonymized project economics are acceptable for an initial review.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              EcoXchange is not a lender and does not approve loans or guarantee financing. When a transaction requires regulated securities activity, that activity must be handled through appropriately registered partners where required.
            </p>
          </div>

          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Debt capacity</span>
                <span className="public-mini-stat-label">What project cash flow may support</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Capital gap</span>
                <span className="public-mini-stat-label">What remains after modeled permanent sources</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Next action</span>
                <span className="public-mini-stat-label">Project work, capital partner, clean-energy buyer, or another path</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Project Finance Readiness → Capital Gap → Next Action</h2>
          </div>
          <div className="public-card-grid">
            {workflow.map((step) => (
              <div key={step.title} className="public-card">
                <h3 className="public-card-title">{step.title}</h3>
                <p className="public-card-copy">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">What the analysis produces.</h2>
          </div>
          <Card className="public-table-card border-border">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="public-table-head grid grid-cols-2 border-b border-border px-5 py-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Output</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Purpose</p>
                </div>
                {outputs.map(([label, body], index) => (
                  <div key={label} className={`grid grid-cols-2 px-5 py-4 ${index < outputs.length - 1 ? "border-b border-border/60" : ""}`}>
                    <p className="text-sm font-semibold text-primary">{label}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="submit" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ III</span>
            <h2 className="public-section-title">Send us one project.</h2>
          </div>
          <p className="public-section-copy mb-2">
            Choose one contracted or awarded project where the capital stack is not fully resolved. Start with the project size, total cost, revenue economics, expected production, senior-debt case, tax-credit assumptions, sponsor capital already committed, and the amount you believe is still missing.
          </p>
          <p className="public-section-copy mb-5">
            You do not need a perfect data room to start. Partial or anonymized information is acceptable for the initial financeability and capital-gap review. Missing or estimated inputs will remain clearly labeled.
          </p>
          <DeveloperSubmissionWizard />
        </section>
      </main>
    </div>
  );
}
