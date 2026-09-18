import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { BatteryCharging, Building2, CircleDollarSign, Database, Gauge, Network, RadioTower } from "lucide-react";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const steps = [
  { icon: Building2, title: "Identify", detail: "Map the data-center load, utility service, DERs, and operating constraints." },
  { icon: CircleDollarSign, title: "Finance", detail: "Assess the capital needed to deploy storage, generation, or other distributed resources where required." },
  { icon: Database, title: "Connect", detail: "Integrate operating data and define the telemetry needed to measure real capacity." },
  { icon: Gauge, title: "Verify", detail: "Measure availability, production, response, duration, and performance with source provenance." },
  { icon: Network, title: "Aggregate", detail: "Combine qualified flexible load and DER capacity into a usable portfolio." },
  { icon: RadioTower, title: "Orchestrate", detail: "Build toward coordinated dispatch through the applicable utility or market-partner pathway." },
  { icon: BatteryCharging, title: "Settle", detail: "Maintain the evidence and allocation records required for program, market, asset-owner, and capital-partner settlement." },
] as const;

export default function MethodPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">How EcoXchange works</p>
            <h1 className="public-title">
              Turn fragmented power resources into
              <br />
              <em>measurable capacity.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              The operating model joins three systems that are usually separate: data-center load, distributed-energy
              assets, and the financial / regulatory infrastructure needed to deploy and measure them.
            </p>
          </div>
          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat"><span className="public-mini-stat-value">Load</span><span className="public-mini-stat-label">Critical and flexible MW</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Assets</span><span className="public-mini-stat-label">Storage, generation, and DERs</span></div>
              <div className="public-mini-stat"><span className="public-mini-stat-value">Evidence</span><span className="public-mini-stat-label">Telemetry, availability, and performance</span></div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Identify → Finance → Connect → Verify → Aggregate → Orchestrate → Settle</h2>
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
            <h2 className="public-section-title">The first product is readiness, not premature dispatch.</h2>
          </div>
          <Card className="border-border">
            <CardContent className="p-6 md:p-8">
              <p className="public-section-copy mb-0">
                EcoXchange begins by quantifying flexible MW, tariff constraints, DER options, telemetry requirements,
                and the likely utility / market pathway. Direct orchestration follows only after the customer,
                resources, partner roles, and regulatory permissions are real.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ III</span>
            <h2 className="public-section-title">Regulatory perimeter.</h2>
          </div>
          <div className="public-callout">
            <p className="public-section-copy mb-0">
              EcoXchange is not presenting itself as a utility, retail electricity supplier, broker-dealer,
              RTO/ISO market participant, or wholesale seller merely because it provides software, financeability,
              telemetry, or orchestration infrastructure. The required role depends on the jurisdiction and may be
              performed through qualified partners until direct participation is warranted.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
