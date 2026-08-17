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
    title: "Modeled expected generation",
    source: "NASA POWER · NREL NSRDB",
    detail: "Expected kWh derived from satellite weather data and known project specifications. No additional site sensors required.",
  },
];

const flow = [
  { day: "T+0", text: "The clock starts after all month-end inverter, utility-meter, and modeled-generation data is confirmed." },
  { day: "Within 24 hrs", text: "The verification engine compares the three production figures within the project's configured tolerances." },
  { day: "Within 48 hrs", text: "A verified result marks the project distribution-eligible under its offering documents." },
  { day: "Within 72 hrs", text: "The investor dashboard updates and eligible distribution processing begins." },
  { day: "Exception", text: "A flagged or incomplete result pauses distribution eligibility for manual review; the 72-hour target does not apply while review is open." },
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
                <span className="public-mini-stat-label">Target processing after all source data is confirmed</span>
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
                  The <strong className="font-semibold">72-hour target</strong> begins only after every required
                  month-end source is received and confirmed. Flagged, pending, or incomplete records remain on hold
                  until review is complete.
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
