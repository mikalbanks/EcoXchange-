import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Database, Handshake, Building2, ShieldCheck, FileChartColumn, Leaf, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: Banknote, title: "Finance modeling", detail: "Estimate debt capacity, sponsor-equity requirement, tax-credit value, and binding financial constraints." },
  { icon: Database, title: "Project data and qualification", detail: "Organize the project record, contract assumptions, development status, and source provenance needed for a credible review." },
  { icon: Handshake, title: "Capital / buyer matching", detail: "Coordinate appropriate capital partners or long-term clean-energy buyers once the project and remaining need are clear." },
  { icon: Building2, title: "Project / SPE administration", detail: "Maintain the operating context for project ownership, cap-table workflows, and project-level records." },
  { icon: ShieldCheck, title: "Production verification", detail: "Compare available measured and modeled production evidence, with source provenance disclosed." },
  { icon: FileChartColumn, title: "Reporting and distributions", detail: "Support project cash-flow reporting and distribution infrastructure after the relevant legal and operating approvals exist." },
  { icon: Leaf, title: "Environmental-attribute tracking", detail: "Track project-linked REC/EAC context without implying attributes are available when already committed elsewhere." },
] as const;

const verificationFlow = [
  { day: "Input review", text: "Confirm the period, completeness, origin, and basis of each available source leg." },
  { day: "Engine run", text: "Compare the available production figures against the project's configured tolerances." },
  { day: "Provenance", text: "Label every leg as measured, modeled, derived, simulated, or unconfirmed." },
  { day: "Determination", text: "Issue a VERIFIED, FLAGGED, or PENDING engine status with the applicable reasons." },
];

export default function MethodPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Platform · How It Works</p>
            <h1 className="public-title">
              Start with financeability.
              <br />
              <em>Keep the project infrastructure connected.</em>
            </h1>
            <p className="public-copy">
              EcoXchange begins with the commercial question: what can this project finance, what capital remains,
              and what buyer or capital path is appropriate? The deeper project, ownership, verification, reporting,
              distribution, and environmental-attribute infrastructure supports that outcome rather than leading it.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat"><span className="public-mini-stat-value">Finance first</span><span className="public-mini-stat-label">Debt capacity, sponsor equity, tax credits</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Then match</span><span className="public-mini-stat-label">Capital partner or clean-energy buyer</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Then operate</span><span className="public-mini-stat-label">Project record, evidence, reporting, distributions</span></div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">The EcoXchange workflow.</h2>
          </div>
          <div className="public-card-grid">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="public-card public-method-source">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center border border-border bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="public-card-kicker">0{index + 1}</p>
                  <h3 className="public-card-title">{item.title}</h3>
                  <p className="public-card-copy">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Production verification remains a differentiating capability.</h2>
          </div>
          <Card className="border-border">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-5">
                {verificationFlow.map((step) => (
                  <div key={`${step.day}-${step.text}`} className="flex items-start gap-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary">{step.day}</p>
                      <p className="mt-1 text-sm">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-2 border border-primary/30 bg-primary/5 p-4">
                <ArrowRight className="h-4 w-4 text-primary" />
                <p className="text-sm">
                  Verification supports project reporting and operating confidence. It does not itself create financing,
                  establish legal ownership, prove environmental-attribute availability, or authorize a payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
