import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Database, Handshake, Building2, ShieldCheck, FileText, Leaf, ArrowRight, CheckCircle2 } from "lucide-react";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const steps = [
  { icon: Banknote, title: "Project finance readiness", detail: "Estimate debt capacity, sponsor-equity requirement, tax-credit value, and binding financing constraints." },
  { icon: Database, title: "Project data and qualification", detail: "Organize development status, contracts, operating assumptions, project rights, and source provenance into one project record." },
  { icon: Handshake, title: "Capital and buyer coordination", detail: "Connect qualified projects with appropriate capital partners or long-term clean-energy buyers based on the actual remaining need." },
  { icon: Building2, title: "Project / SPE administration", detail: "Maintain the operating context for project-level records, ownership workflows, and ongoing administration." },
  { icon: ShieldCheck, title: "Production evidence", detail: "Compare available measured and modeled production information with source provenance disclosed." },
  { icon: FileText, title: "Ongoing reporting", detail: "Provide project-level reporting that can support developers, capital partners, clean-energy buyers, and other authorized stakeholders." },
  { icon: Leaf, title: "Environmental-attribute tracking", detail: "Track project-linked REC/EAC context without implying attributes are available when already committed elsewhere." },
] as const;

const verificationFlow = [
  { day: "Source review", text: "Confirm what production data is actually available and document the origin of each source." },
  { day: "Comparison", text: "Compare available measured production with modeled expected generation using the project’s configured assumptions." },
  { day: "Provenance", text: "Label each source leg as measured, modeled, derived, simulated, or unconfirmed rather than presenting unlike sources as equivalent." },
  { day: "Determination", text: "Issue a VERIFIED, FLAGGED, or PENDING engine status with the applicable reasons and limitations." },
  { day: "Reporting", text: "Carry the result into ongoing project reporting for authorized project stakeholders." },
];

const audiences = [
  {
    title: "Clean-energy buyers",
    body: "Use production evidence and project reporting to understand how a matched renewable project is performing after a long-term clean-energy commitment is in place.",
  },
  {
    title: "Capital partners",
    body: "Use source-labeled operating evidence alongside project finance and diligence information to monitor the asset with clearer provenance.",
  },
  {
    title: "Developers and project operators",
    body: "Keep project data, production evidence, finance-readiness outputs, and ongoing reporting connected rather than scattered across separate systems.",
  },
] as const;

export default function MethodPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">Platform · Evidence Infrastructure</p>
            <h1 className="public-title">
              Finance the project.
              <br />
              <em>Then keep the evidence connected.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              Production verification is part of the evidence layer that supports clean-energy buyers, capital partners, developers, and ongoing project reporting. It strengthens the project record after qualification without becoming the company’s primary identity.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat"><span className="public-mini-stat-value">Financeability</span><span className="public-mini-stat-label">Debt capacity, sponsor equity, tax-credit value</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Qualification</span><span className="public-mini-stat-label">Project facts, contracts, development status, rights</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Evidence</span><span className="public-mini-stat-label">Production provenance and ongoing reporting</span></div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">One project record from financeability through operations.</h2>
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
            <h2 className="public-section-title">Who the evidence layer supports.</h2>
          </div>
          <div className="public-card-grid">
            {audiences.map((audience) => (
              <div key={audience.title} className="public-card">
                <h3 className="public-card-title">{audience.title}</h3>
                <p className="public-card-copy">{audience.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ III</span>
            <h2 className="public-section-title">Production verification as reporting infrastructure.</h2>
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
                  Production evidence can support ongoing reporting, but it does not itself establish REC/EAC ownership, create a financing commitment, or authorize a payment.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
