import { ArrowRight, Banknote, Calculator, FileCheck2, Landmark } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border bg-muted/20">
          <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="max-w-4xl">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-primary">Project Finance Readiness</p>
              <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-6xl">Understand what the project can finance — and how much sponsor equity remains.</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">EcoXchange estimates indicative permanent debt capacity, sponsor-equity requirements, tax-credit value, and capital-stack scenarios using project cash flow and financing constraints.</p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">The goal is decision support: identify the binding constraint, compare realistic scenarios, and determine whether the next action is additional project work, a capital partner, a clean-energy buyer, or another financing path.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="https://demo.ecoxchange.net/bankability"><Button size="lg" className="gap-2">Open Project Finance Demo <ArrowRight className="h-4 w-4" /></Button></a>
                <Link href="/develop#submit"><Button size="lg" variant="outline">Submit / Analyze a Project</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-6"><Landmark className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Debt sized to cash flow</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The primary result is not a generic debt percentage. The workspace shows DSCR-sized debt, the LTC ceiling, and which constraint actually binds.</p></CardContent></Card>
            <Card><CardContent className="p-6"><Calculator className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Sponsor equity made explicit</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Permanent debt and modeled transferable tax-credit proceeds are shown separately before the remaining sponsor-equity requirement.</p></CardContent></Card>
            <Card><CardContent className="p-6"><FileCheck2 className="mb-4 h-6 w-6 text-primary" /><h2 className="font-serif text-xl font-semibold">Explainable analysis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Calculation version, scenario, assumptions, key constraints and the calculation trace remain accessible for review.</p></CardContent></Card>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div><Banknote className="mb-4 h-8 w-8 text-primary" /><h2 className="font-serif text-3xl font-semibold">From project economics to capital requirement</h2><p className="mt-3 text-muted-foreground">The developer workflow connects project facts to finance-readiness outputs and then to the appropriate capital or clean-energy-buyer path.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{steps.map(([title, body], index) => <div key={title} className="rounded-lg border border-border p-5"><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><h3 className="mt-2 font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>)}</div>
          </div>

          <div className="mt-14 rounded-lg border border-border bg-muted/30 p-6 text-sm text-muted-foreground"><strong className="text-foreground">Indicative decision support only.</strong> EcoXchange is not a lender or underwriter and does not approve loans, make lender commitments, provide tax or legal opinions, or guarantee financing.</div>
        </section>
      </main>
    </div>
  );
}
