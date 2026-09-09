import { ArrowRight, Banknote, Calculator, FileCheck2, Landmark } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  ["Project economics", "Capacity, capex, contracted revenue, operating cost and project life."],
  ["CFADS", "Cash flow available for debt service is calculated by the project-finance engine."],
  ["Indicative debt capacity", "DSCR-sized debt is compared with the applicable LTC ceiling to identify the binding constraint."],
  ["Tax-credit value", "Transferable credit proceeds remain separate from permanent senior debt."],
  ["Sponsor-equity requirement", "The remaining sponsor cash requirement is shown against total closing uses."],
  ["Next financing action", "Financeability and readiness results explain what is limiting the project and what should be addressed next."],
] as const;

export default function PublicBankabilityPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Project Finance Readiness</p>
            <h1 className="public-title">
              Understand what the project can finance —
              <br />
              <em>and how much sponsor equity remains.</em>
            </h1>
            <p className="public-copy">
              EcoXchange estimates indicative permanent debt capacity, sponsor-equity requirements,
              tax-credit value, and capital-stack scenarios using project cash flow and financing constraints.
            </p>
            <p className="public-copy">
              The goal is decision support: identify the binding constraint, compare realistic scenarios,
              and determine whether the next action is additional project work, a capital partner,
              a clean-energy buyer, or another financing path.
            </p>
            <div className="public-actions">
              <a href="https://demo.ecoxchange.net/bankability" className="public-btn public-btn-primary">
                Open Project Finance Demo <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/develop#submit" className="public-btn public-btn-outline">
                Submit / Analyze a Project
              </Link>
            </div>
          </div>

          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">DSCR</span>
                <span className="public-mini-stat-label">Debt sized to project cash flow</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Capital gap</span>
                <span className="public-mini-stat-label">Sponsor equity shown after permanent sources</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Scenarios</span>
                <span className="public-mini-stat-label">Compare assumptions and binding constraints</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">What the analysis makes visible.</h2>
          </div>
          <div className="public-card-grid">
            <Card className="public-card">
              <CardContent className="p-0">
                <Landmark className="mb-4 h-6 w-6 text-primary" />
                <h3 className="public-card-title">Debt sized to cash flow</h3>
                <p className="public-card-copy">The workspace shows DSCR-sized debt, the LTC ceiling, and which constraint actually binds rather than relying on a generic leverage percentage.</p>
              </CardContent>
            </Card>
            <Card className="public-card">
              <CardContent className="p-0">
                <Calculator className="mb-4 h-6 w-6 text-primary" />
                <h3 className="public-card-title">Sponsor equity made explicit</h3>
                <p className="public-card-copy">Permanent debt and modeled transferable tax-credit proceeds are shown separately before the remaining sponsor-equity requirement.</p>
              </CardContent>
            </Card>
            <Card className="public-card">
              <CardContent className="p-0">
                <FileCheck2 className="mb-4 h-6 w-6 text-primary" />
                <h3 className="public-card-title">Explainable analysis</h3>
                <p className="public-card-copy">Calculation version, scenario, assumptions, key constraints, and the calculation trace remain accessible for review.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">From project economics to capital requirement.</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <Banknote className="mb-4 h-8 w-8 text-primary" />
              <p className="public-section-copy">
                The developer workflow connects project facts to finance-readiness outputs and then to the appropriate capital or clean-energy-buyer path.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map(([title, body], index) => (
                <div key={title} className="public-card">
                  <span className="public-card-kicker">0{index + 1}</span>
                  <h3 className="public-card-title">{title}</h3>
                  <p className="public-card-copy">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-callout">
            <strong className="text-foreground">Indicative decision support only.</strong>{" "}
            EcoXchange is not a lender or underwriter and does not approve loans, make lender commitments,
            provide tax or legal opinions, or guarantee financing.
          </div>
        </section>
      </main>
    </div>
  );
}
