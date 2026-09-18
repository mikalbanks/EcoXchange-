import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { BatteryCharging, Building2, Gauge, Network, RadioTower, Zap } from "lucide-react";
import { POWER_FLEXIBILITY_PATHWAY, PUBLIC_POSITIONING } from "@/lib/public-positioning";

const readinessInputs = [
  ["Planned and contracted MW", "Utility service, ramp schedule, contracted capacity, and known energization limits."],
  ["Load flexibility", "Critical versus movable or interruptible workloads, response speed, duration, and operational constraints."],
  ["Onsite resources", "Existing or planned batteries, backup generation, microgrids, renewables, or other distributed resources."],
  ["Tariff and market context", "Utility tariff, minimum-billing obligations, demand-response options, and relevant RTO/ISO pathway."],
] as const;

const outputs = [
  "Potential flexible MW and firm operating boundaries",
  "Storage / generation / DER options that may support the site",
  "Tariff and contracted-capacity implications",
  "Interconnection and market-participation constraints to validate",
  "Telemetry and verification requirements",
  "Recommended next technical, utility, or partner action",
] as const;

export default function PublicMarketPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For data-center operators and developers</p>
            <h1 className="public-title">
              Understand how much power flexibility
              <br />
              <em>your site can actually use.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              EcoXchange starts with one real site and separates utility service, contracted-capacity obligations,
              critical load, flexible compute, storage, onsite generation, and market constraints. The first goal is
              not to claim a VPP exists. It is to establish what capacity is technically, economically, and legally
              usable before orchestration.
            </p>
            <div className="public-actions">
              <a href="#readiness" className="public-btn public-btn-primary">Start a Power Flexibility Review</a>
              <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20Power%20Flexibility%20Readiness" className="public-btn public-btn-outline">
                Discuss a Site →
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Best fit: AI/HPC, colocation, and data-center development sites where grid timing, contracted MW, or
              power infrastructure is limiting deployment or growth.
            </p>
          </div>

          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Flexible MW</span>
                <span className="public-mini-stat-label">What load may be shifted or curtailed within real operating constraints</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">DER capacity</span>
                <span className="public-mini-stat-label">Storage, onsite generation, and other distributed resources</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Market pathway</span>
                <span className="public-mini-stat-label">Utility, tariff, RTO/ISO, and partner requirements that govern execution</span>
              </div>
            </div>
          </aside>
        </section>

        <section id="readiness" className="public-section scroll-mt-24">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Power Flexibility Readiness.</h2>
          </div>
          <p className="public-section-copy mb-5">
            The initial engagement is a structured site review. It is designed to answer one question:
            <strong> what controllable capacity is actually available, what would it take to make more available, and what constraints govern its value?</strong>
          </p>
          <div className="public-card-grid">
            {readinessInputs.map(([title, body], index) => {
              const icons = [Building2, Gauge, BatteryCharging, Network];
              const Icon = icons[index];
              return (
                <div key={title} className="public-card">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="public-card-title">{title}</h3>
                  <p className="public-card-copy">{body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">What the review produces.</h2>
          </div>
          <Card className="border-border">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4">
                {outputs.map((output, index) => (
                  <div key={output} className="flex items-start gap-3">
                    <span className="font-mono text-xs text-primary">0{index + 1}</span>
                    <p className="text-sm">{output}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ III</span>
            <h2 className="public-section-title">From one site to a virtual power plant.</h2>
          </div>
          <div className="public-card-grid">
            {POWER_FLEXIBILITY_PATHWAY.map((step, index) => {
              const icons = [Building2, Zap, BatteryCharging, Network, RadioTower, Gauge];
              const Icon = icons[index] ?? Zap;
              return (
                <div key={step} className="public-card">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="public-card-kicker">0{index + 1}</p>
                  <h3 className="public-card-title">{step}</h3>
                </div>
              );
            })}
          </div>
          <div className="public-callout mt-6">
            <p className="public-section-copy mb-0">
              EcoXchange is building toward VPP orchestration. Current public positioning does not imply that
              EcoXchange is already a utility, RTO/ISO market participant, demand-response provider, or wholesale
              power seller. Those roles are jurisdiction-specific and may be performed through qualified partners
              until direct participation is commercially justified.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
