import { ArrowRight, Banknote, Calculator, FileCheck2, Landmark } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  ["Project economics", "Capacity, capex, contracted revenue, operating cost and project life."],
  ["CFADS", "Cash flow available for debt service is calculated by the existing project-finance engine."],
  ["Indicative debt capacity", "DSCR-sized debt is compared with the applicable LTC ceiling to identify the binding constraint."],
  ["Tax-credit proceeds", "Transferable credit proceeds remain separate from permanent senior debt."],
  ["Sponsor equity", "The remaining sponsor cash requirement is shown against total closing uses."],
  ["Financing constraints", "Financeability, readiness and lender-fit results explain what is limiting the project."],
] as const;

export default function PublicBankabilityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border bg-muted/20">
          <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="max-w-4xl">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-primary">Supporting capability · Project finance intelligence</p>
              <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-6xl">Understand how much debt a project’s cash flow may support — and how much sponsor equity remains.</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">EcoXchange applies lender-style project-finance assumptions to estimate indicative permanent debt capacity, tax-credit monetization, sponsor-equity requirements, and the financing constraints behind those results.</p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">This financeability analysis is an upstream decision-support capability within EcoXchange’s broader renewable-energy investment infrastructure. It helps clarify how an asset may be financed before it moves through project/SPE ownership administration, production verification, reporting, and distribution workflows.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="https://demo.ecoxchange.net/bankability"><Button size="lg" className="gap-2">See a 5 MW Financing Example <ArrowRight className="h-4 w-4" /></Button></a>
                <Link href="/auth/signup"><Button size="lg" variant="outline">Open Developer Workspace</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-6"><Landmark className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Debt sized to cash flow</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The primary result is not a generic debt percentage. The workspace shows DSCR-sized debt, the LTC ceiling, and which constraint actually binds.</p></CardContent></Card>
            <Card><CardContent className="p-6"><Calculator className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Sponsor equity made explicit</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Permanent debt and modeled transferable tax-credit proceeds are shown separately before the remaining sponsor-equity requirement.</p></CardContent></Card>
            <Card><CardContent className="p-6"><FileCheck2 className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Explainable analysis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Calculation version, policy version, scenario, assumptions, key constraints and a backend calculation trace remain accessible for review.</p></CardContent></Card>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div><Banknote className="mb-4 h-8 w-8 text-primary" /><h2 className="font-serif text-3xl font-semibold">From project economics to financing requirement</h2><p className="mt-3 text-muted-foreground">The developer workflow connects the project record to the EcoXchange finance engine while preserving the broader project context used for ownership administration, production evidence, and reporting.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{steps.map(([title, body], index) => <div key={title} className="rounded-lg border border-border p-5"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><h3 className="mt-2 font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>)}</div>
          </div>

          <div className="mt-14 rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground"><strong className="text-foreground">Indicative analysis only.</strong> EcoXchange does not approve loans or make lender commitments. Results are not a credit decision, financing commitment, lender approval, tax opinion, legal advice, or guarantee of financing.</div>
        </section>
      </main>
    </div>
  );
}
