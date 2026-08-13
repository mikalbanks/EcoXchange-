import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Sun, Plug, Satellite, ArrowRight, CheckCircle2 } from "lucide-react";

const sources = [
  {
    icon: Sun,
    title: "Inverter API",
    source: "SolarEdge · Enphase · Fronius · SMA",
    detail: "Actual kWh produced at the panel level, pulled directly from the developer's monitoring portal.",
  },
  {
    icon: Plug,
    title: "Utility meter",
    source: "Bayou — regulated utility data API",
    detail: "Net kWh exported to the grid, sourced from the utility independently of the developer. Closes the self-reporting loop.",
  },
  {
    icon: Satellite,
    title: "Satellite irradiance",
    source: "NASA POWER · NREL NSRDB",
    detail: "What physics says the plant should have produced, derived from satellite irradiance plus known plant specs. No sensors required.",
  },
];

const flow = [
  { day: "Day 1", text: "Pull production data from inverter API, utility meter, and satellite irradiance." },
  { day: "Day 1", text: "Reconciliation runs. Three numbers compared within configurable tolerance." },
  { day: "Day 2", text: "If verified, the verification engine writes the result on-chain to Polymesh via the Polymath Capital Platform." },
  { day: "Day 3", text: "Distribution contract calculates pro-rata USDC per token holder. Transfers execute simultaneously." },
  { day: "Day 3–4", text: "Investor dashboards update. Push notifications sent. If flagged, the run is held for review before any payment." },
];

export default function MethodPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">The verification engine</p>
            <h1 className="public-title">
              Three sources,
              <br />
              <em>one monthly determination.</em>
            </h1>
            <p className="public-copy">
              EcoXchange does not pay investors based on developer self-reporting. Every month, we pull three
              independent measurements of what each project produced — and only distribute when they agree.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">3</span>
                <span className="public-mini-stat-label">Independent production sources</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Monthly</span>
                <span className="public-mini-stat-label">Data reconciliation cadence</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">72 hrs</span>
                <span className="public-mini-stat-label">Target receipt after month-end confirmation</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Independent sources. Reconciled monthly.</h2>
          </div>
          <div className="public-card-grid">
            {sources.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="public-card public-method-source">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center border border-border bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="public-card-title">{item.title}</h3>
                  <p className="public-card-kicker mt-2">{item.source}</p>
                  <p className="public-card-copy">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">Verified · Flagged · Pending.</h2>
          </div>
          <Card className="border-border">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-5">
                {flow.map((step) => (
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
                  Target investor receipt: within <strong className="font-semibold">72 hours</strong> of month-end —
                  versus the 30–90 day cycle of manual quarterly distribution administration.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="public-section">
          <div className="public-callout">
            <p className="public-section-label mb-2">Why this matters to investors</p>
            <p className="text-base text-muted-foreground">
              NREL's 2020 fleet study of 411 utility-scale solar plants found average system-level degradation of{" "}
              <strong className="text-foreground">~1.3% per year</strong> — nearly triple the{" "}
              <strong className="text-foreground">0.5–0.75% per year</strong> typically projected. That gap isn't
              fraud; it's measurement opacity. EcoXchange's engine surfaces this information monthly, in real time,
              so investors know exactly which group their project falls into long before annual K-1s would reveal it.
            </p>
            <p className="mt-3 font-mono text-[0.6rem] text-muted-foreground/70">
              Source: NREL 2020 fleet performance study (411 utility-scale PV plants, 21.1 GW dc installed 2007–2016).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
