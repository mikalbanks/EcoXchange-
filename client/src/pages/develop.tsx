import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { PUBLIC_POSITIONING } from "@/lib/public-positioning";

const workflow = [
  {
    title: "1. Identify the asset",
    body: "Start with storage, generation, renewable energy, or another distributed resource that could support a real data-center power need.",
  },
  {
    title: "2. Assess financeability",
    body: "Model project economics, debt capacity, sponsor-equity requirements, tax-credit value, and the capital required to bring the resource online.",
  },
  {
    title: "3. Confirm interconnection and operating limits",
    body: "Separate technical availability from what the utility, tariff, site, and applicable market rules actually allow.",
  },
  {
    title: "4. Connect telemetry",
    body: "Define the data needed to prove availability, production, response time, duration, and operating performance.",
  },
  {
    title: "5. Match the asset to load",
    body: "Evaluate whether the resource can support a data-center site, a partner program, or a future aggregated fleet.",
  },
] as const;

const outputs = [
  ["Asset financeability", "Indicative debt capacity, sponsor capital need, and financing constraints."],
  ["Usable capacity", "MW, duration, response characteristics, and operating boundaries."],
  ["Interconnection context", "Utility and market constraints that affect where and how the resource can operate."],
  ["Telemetry plan", "The measurements required for availability and performance verification."],
  ["Load fit", "Whether the asset plausibly matches an identified data-center need or aggregated capacity strategy."],
] as const;

export default function DevelopPage() {
  return (
    <div className="public-page">
      <Header />
      <main className="public-main">
        <section className="public-hero public-hero-split">
          <div>
            <p className="public-eyebrow">For DER, storage, generation, and project partners</p>
            <h1 className="public-title">
              Bring energy assets into a
              <br />
              <em>data-center power network.</em>
            </h1>
            <p className="public-copy">{PUBLIC_POSITIONING}</p>
            <p className="public-copy">
              EcoXchange uses its project-finance and verification infrastructure to evaluate distributed energy
              assets that may support data-center power needs. Financeability remains an enabling layer: determine
              what it takes to build the asset, then connect operating evidence and match usable capacity to load.
            </p>
            <div className="public-actions">
              <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20DER%20partner%20inquiry" className="public-btn public-btn-primary">
                Discuss an Energy Asset
              </a>
              <a href="/bankability" className="public-btn public-btn-outline">Open Financeability Tools →</a>
            </div>
          </div>

          <aside className="public-hero-aside">
            <div className="public-mini-stat-grid">
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Finance</span>
                <span className="public-mini-stat-label">What capital the resource needs to get built</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Connect</span>
                <span className="public-mini-stat-label">What telemetry proves real operating capacity</span>
              </div>
              <div className="public-mini-stat">
                <span className="public-mini-stat-value">Aggregate</span>
                <span className="public-mini-stat-label">How usable capacity can support data-center demand</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ I</span>
            <h2 className="public-section-title">Identify → Finance → Connect → Verify → Aggregate</h2>
          </div>
          <div className="public-card-grid">
            {workflow.map((step) => (
              <div key={step.title} className="public-card">
                <h3 className="public-card-title">{step.title}</h3>
                <p className="public-card-copy">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <span className="public-section-label">§ II</span>
            <h2 className="public-section-title">What EcoXchange evaluates.</h2>
          </div>
          <Card className="public-table-card border-border">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="public-table-head grid grid-cols-2 border-b border-border px-5 py-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Output</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider">Purpose</p>
                </div>
                {outputs.map(([label, body], index) => (
                  <div key={label} className={`grid grid-cols-2 px-5 py-4 ${index < outputs.length - 1 ? "border-b border-border/60" : ""}`}>
                    <p className="text-sm font-semibold text-primary">{label}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <p className="mb-12 font-mono text-[0.6rem] text-muted-foreground/70">
          EcoXchange does not guarantee financing, interconnection, dispatch eligibility, or a data-center offtake.
          Market participation and regulated activity are handled according to the applicable jurisdiction and partner structure.
        </p>
      </main>
    </div>
  );
}
