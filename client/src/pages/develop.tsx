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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 space-y-12">
        <section className="max-w-3xl">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
            For solar developers
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            Submit a permitted project.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            EcoXchange underwrites equity raises of <strong className="text-foreground">$1M–$5M</strong> for permitted
            1–20 MW U.S. solar projects. Target intake-to-live offering timeline: <strong className="text-foreground">2–4 weeks</strong>.
            No on-site verification hardware required — provide inverter portal and utility account access, and we
            handle the rest.
          </p>
        </section>

        <section>
          <DeveloperSubmissionWizard />
        </section>

        <section>
          <div className="mb-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
              Cost comparison · $2.5M offering, first year
            </p>
            <h2 className="font-serif text-2xl font-semibold md:text-3xl">
              ~55–65% lower all-in cost than a traditional Reg D raise.
            </h2>
          </div>
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="grid grid-cols-3 border-b border-border bg-muted/40 px-5 py-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">Cost item</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Traditional Reg D 506(c)
                </p>
                <p className="font-mono text-[0.6rem] uppercase tracking-wider text-primary font-semibold">
                  EcoXchange
                </p>
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
              <div className="grid grid-cols-3 border-t-2 border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">All-in cost (Year 1)</p>
                <p className="text-sm font-semibold text-foreground">$325K–$500K</p>
                <p className="text-sm font-bold text-primary">~$125K–$175K</p>
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
