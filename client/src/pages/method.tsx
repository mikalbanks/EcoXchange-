import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Sun, Plug, Satellite, ArrowRight, CheckCircle2 } from "lucide-react";

const sources = [
  {
    icon: Sun,
    title: "Inverter API",
    source: "Measured inverter telemetry when provided",
    detail: "Project monitoring data supplied through an approved pilot access method. Connector availability is confirmed per project.",
  },
  {
    icon: Plug,
    title: "Utility meter",
    source: "Utility-originated data when provided",
    detail: "A utility measurement is independent only when its origin and access path are documented. Any proxy is labeled derived.",
  },
  {
    icon: Satellite,
    title: "Modeled expected generation",
    source: "NASA POWER · NREL NSRDB",
    detail: "Expected kWh modeled from weather data and stated project specifications; this is a model input, not a measurement.",
  },
];

const flow = [
  { day: "Input review", text: "Confirm the period, completeness, origin, and basis of each available source leg." },
  { day: "Engine run", text: "Compare the available production figures against the project's configured tolerances." },
  { day: "Provenance", text: "Label every leg as measured, modeled, derived, simulated, or unconfirmed." },
  { day: "Determination", text: "Issue a VERIFIED, FLAGGED, or PENDING engine status with the applicable reasons." },
  { day: "Pilot boundary", text: "Record the result without triggering an investment or payment; transaction execution is not part of Release 1." },
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
              EcoXchange compares available production evidence and shows the basis of each source. The current
              pilot demo does not claim three independent measurements and does not execute investor payments.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">3</span>
                <span className="public-mini-stat-label">Evidence roles with per-source provenance</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Monthly</span>
                <span className="public-mini-stat-label">Data reconciliation cadence</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Disabled</span>
                <span className="public-mini-stat-label">Transaction execution in Release 1</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Source roles. Provenance disclosed.</h2>
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
                  A status reports the engine&apos;s tolerance result. It does not prove source independence, create an
                  offering, or authorize a payment.
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
              fraud; it illustrates why period-level operating evidence matters. EcoXchange&apos;s pilot can surface
              model-to-measurement deviations by reporting period, with the limits of each source shown alongside.
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
