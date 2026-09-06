import { Link } from "wouter";
import { SunPathDiagram } from "@/components/landing/SunPathDiagram";
import { PUBLIC_NAV_LINKS, REQUEST_ACCESS } from "@/lib/nav";
import {
  BENCHMARK_YEAR,
  FULL_FLEET_MAD_PCT,
  PLANTS_TESTED,
  PUBLICATION_MAD_PCT,
  PUBLICATION_WITHIN_10_RATE,
  ENGINE_VERSION_BENCHMARKED,
} from "@shared/benchmark";
import "./landing.css";

const BENCHMARK_HREF = "https://demo.ecoxchange.net/benchmark";
const fmtPlants = PLANTS_TESTED.toLocaleString("en-US");

const STATS = [
  {
    num: "Digital Asset Administration",
    label: "Project/SPE ownership · cap-table workflows · PPA-linked investor administration",
  },
  {
    num: "Independent Production Verification",
    label: "Source-labeled operating evidence · monthly verification · auditable reporting",
  },
  {
    num: "Project Finance Intelligence",
    label: "Indicative debt capacity · tax-credit proceeds · sponsor-equity requirement",
  },
  {
    num: `${fmtPlants} plants tested`,
    label: `Engine ${ENGINE_VERSION_BENCHMARKED} benchmarked against EIA-923 data`,
    href: BENCHMARK_HREF,
  },
] as const;

const PROBLEM_CARDS = [
  {
    num: "01",
    title: "Ownership and project economics are fragmented",
    body: "Project/SPE records, investor ownership, PPA economics, and distribution calculations often live in separate systems without one durable operating context.",
  },
  {
    num: "02",
    title: "Operating performance is disconnected from investor administration",
    body: "Production evidence and reporting are rarely connected to the same project-level record that governs ownership and distribution eligibility.",
  },
  {
    num: "03",
    title: "Financing decisions happen without the full project context",
    body: "Sponsors need an explainable view of likely debt capacity, tax-credit proceeds, and sponsor equity before choosing how to finance and administer the asset.",
  },
] as const;

const METHOD_CARDS = [
  {
    num: "01",
    title: "Inverter telemetry",
    body: "What the project monitoring system reports it produced.",
    highlight: false,
  },
  {
    num: "02",
    title: "Utility meter data",
    body: "What the serving utility records at the meter.",
    highlight: false,
  },
  {
    num: "03",
    title: "Satellite-modeled generation",
    body: "What weather and known system characteristics indicate the project should have produced.",
    highlight: false,
  },
  {
    num: "04",
    title: "Verification determination",
    body: "A traceable monthly result designed to support project reporting and future, separately approved distribution-control workflows.",
    highlight: true,
  },
] as const;

const BENCHMARK_FIGURES = [
  { num: fmtPlants, text: "plants tested" },
  { num: `±${PUBLICATION_MAD_PCT.toFixed(1)}%`, text: "publication-cohort mean absolute deviation" },
  { num: `±${FULL_FLEET_MAD_PCT.toFixed(1)}%`, text: "full-fleet mean absolute deviation" },
  { num: `${PUBLICATION_WITHIN_10_RATE.toFixed(1)}%`, text: "of the publication cohort within ±10%" },
] as const;

const PILOT_ROWS = [
  { label: "Project / SPE operating record", eco: "Included", other: "Technical, ownership-workflow, and PPA inputs reviewed" },
  { label: "Digital ownership workflow", eco: "Modeled", other: "No legal ownership created" },
  { label: "PPA-based allocation", eco: "Modeled", other: "No payment execution" },
  { label: "Production backtest", eco: "Included", other: "Source coverage reviewed" },
  { label: "Per-source provenance", eco: "Included", other: "Measured · modeled · derived · simulated" },
  { label: "Utility evidence", eco: "Availability-dependent", other: "A proxy is disclosed, never promoted" },
  { label: "Bankability & sponsor-equity analysis", eco: "Included", other: "Indicative decision support; no lender commitment" },
  { label: "Open securities offering", eco: "Not included", other: "Requires counsel and operating approvals" },
  { label: "Investment acceptance", eco: "Disabled", other: "No funds or commitments accepted" },
  { label: "Distribution execution", eco: "Disabled", other: "Simulation only in the labeled stress scenario" },
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header>
        <div className="map-ticks map-ticks-top" aria-hidden="true" />
        <div className="header-inner">
          <div className="brand"><span className="brand-name">EcoXchange</span><span className="brand-tag">Clean Energy Market</span></div>
          <nav>
            {PUBLIC_NAV_LINKS.map((link) => link.external ? (
              <a key={link.href} href={link.href} data-testid={link.testId}>{link.label}</a>
            ) : (
              <Link key={link.href} href={link.href} data-testid={link.testId}>{link.label}</Link>
            ))}
            <Link href={REQUEST_ACCESS.href} className="nav-cta" data-testid={REQUEST_ACCESS.testId}>{REQUEST_ACCESS.label}</Link>
          </nav>
        </div>
      </header>

      <section>
        <div className="hero">
          <div className="hero-text">
            <div className="label hero-eyebrow">Digital Asset Administration · Production Verification · Project Finance Intelligence</div>
            <h1 className="hero-headline">Renewable-energy<br /><em>investment infrastructure.</em></h1>
            <p className="hero-sub"><strong>EcoXchange connects the financial and operating record of a renewable-energy project.</strong> The platform brings project/SPE ownership administration, PPA-linked investor economics, independent production verification, and reporting into one infrastructure layer.</p>
            <p className="hero-sub">Project finance intelligence sits upstream as decision support — helping sponsors understand indicative debt capacity, tax-credit proceeds, sponsor-equity requirements, and financing constraints before the asset moves through the broader EcoXchange workflow.</p>
            <div className="hero-actions">
              <Link href="/develop" className="btn btn-primary">For Developers →</Link>
              <Link href="/bankability" className="btn btn-outline">Explore Financeability Analysis</Link>
              <a href="https://demo.ecoxchange.net" className="btn btn-outline">View the Platform Demo</a>
            </div>
          </div>
          <div className="hero-diagram"><SunPathDiagram /></div>
        </div>
      </section>

      <div className="stats"><div className="stats-grid stats-grid-phrases">{STATS.map((s) => <div key={s.num} className="stat-item"><div className="stat-num">{s.num}</div><div className="stat-label">{"href" in s && s.href ? <a href={s.href} target="_blank" rel="noreferrer">{s.label} →</a> : s.label}</div></div>)}</div></div>

      <section id="problem" className="problem">
        <div className="section-header"><span className="label section-num">§ I</span><h2 className="section-title">One project record across ownership, economics, evidence, and reporting.</h2></div>
        <p className="problem-intro">EcoXchange is designed as infrastructure for the full project-level investment workflow — not as a standalone underwriting product, verification tool, or capital-raising service.</p>
        <div className="problem-cards">{PROBLEM_CARDS.map((card) => <div key={card.num} className="problem-card"><div className="label problem-card-num">{card.num}</div><h3>{card.title}</h3><p>{card.body}</p></div>)}</div>
      </section>

      <section id="verification" className="method">
        <div className="method-inner">
          <div className="section-header"><span className="label section-num">§ II</span><h2 className="section-title">Independent production verification is a core pillar.</h2></div>
          <p className="method-intro">The engine compares the project&apos;s inverter telemetry and utility meter data with expected generation modeled from NASA and NREL weather inputs. Agreement within the project&apos;s configured tolerance produces a verified engine result. Missing or inconsistent data produces a pending or flagged result for review. A derived or simulated leg is disclosed and is not counted as an independent measurement.</p>
          <div className="method-cards">{METHOD_CARDS.map((card) => <div key={card.num} className={card.highlight ? "method-card highlight" : "method-card"}><div className="label method-card-num">{card.num}</div><h3>{card.title}</h3><p>{card.body}</p></div>)}</div>
        </div>
      </section>

      <section id="investors" className="investors">
        <div className="section-header"><span className="label section-num">§ III</span><span className="label">Core Pillar · Digital Asset Administration</span><h2 className="section-title">Connect project/SPE ownership to the asset&apos;s underlying economics.</h2></div>
        <div className="investors-grid">
          <div className="investors-body"><p>EcoXchange is preparing a non-transactional pilot for individual U.S. renewable-energy projects. The pilot can connect project/SPE intake, digital ownership and cap-table workflow review, PPA economics, modeled pro-rata allocation, source-labeled production evidence, reporting, and upstream financeability analysis in one project context.</p><p className="investors-note">Financeability results are indicative analyses and do not constitute a financing commitment, lender approval, tax opinion, legal advice, or securities offering. The demo does not accept investments, create legal ownership, or execute distributions.</p><Link href="/develop" className="btn btn-primary">View Pilot Scope →</Link></div>
          <div className="investors-stats">{METHOD_CARDS.map((row) => <div key={row.num} className="investor-stat"><span className="investor-stat-num">{row.num}</span><span className="investor-stat-text"><strong>{row.title}</strong> — {row.body}</span></div>)}</div>
        </div>
      </section>

      <section id="benchmark" className="benchmark-module">
        <div className="section-header"><span className="label section-num">§ IV</span><h2 className="section-title">Verification tested against reported U.S. solar generation.</h2></div>
        <p className="problem-intro">Engine {ENGINE_VERSION_BENCHMARKED} was benchmarked against {BENCHMARK_YEAR} EIA-923 reported generation using NASA POWER irradiance inputs. Review the publication cohort, full-fleet results, assumptions, and documented exclusions.</p>
        <div className="benchmark-figures">{BENCHMARK_FIGURES.map((f) => <div key={f.text} className="benchmark-figure"><span className="benchmark-figure-num">{f.num}</span><span className="benchmark-figure-text">{f.text}</span></div>)}</div>
        <a href={BENCHMARK_HREF} className="btn btn-outline">Review the Benchmark →</a>
      </section>

      <section id="fee" className="fee"><div className="fee-inner"><div className="section-header"><span className="label section-num">§ V</span><h2 className="section-title">Release 1 validates the connected investment-infrastructure workflow.</h2></div><div className="fee-grid"><div className="fee-body"><p>Release 1 is a <strong>connected, non-transactional pilot</strong>. It combines project/SPE records, ownership administration, PPA economics, production evidence, reporting, modeled distribution controls, and supporting financeability analysis; it is not a lending commitment or securities offering.</p><p>Pilot timing, data-access responsibilities, and any commercial terms are confirmed separately in writing after a fit review.</p><p>Offering, subscription, legal ownership, legal-document, and payment execution remain disabled until the necessary authoritative systems, partners, and approvals are in place.</p></div><div><div className="fee-table"><div className="fee-table-head">Pilot Scope</div><div className="fee-row fee-row-labels"><span /><span>Release 1</span><span>Boundary</span></div>{PILOT_ROWS.map((row) => <div key={row.label} className="fee-row"><span>{row.label}</span><span className="fee-yes">{row.eco}</span><span className="fee-no">{row.other}</span></div>)}<div className="fee-row fee-total"><span>Pilot objective</span><span>Validate the connected investment-infrastructure workflow</span><span className="fee-no">Do not imply a live transaction</span></div></div></div></div></div></section>

      <section id="access" className="access"><div className="access-inner"><div className="label">Request Pilot Access · Partners and Project Operators</div><h2 className="access-headline">Bring one project into the workflow.</h2><div className="access-tracks"><div className="access-track"><p>Review project/SPE administration, ownership, PPA economics, production evidence, reporting, and financeability workflows.</p><Link href={REQUEST_ACCESS.href} className="btn btn-lime">Request Pilot Access</Link></div><div className="access-track"><p>Submit a project for an independent 12-month production backtest.</p><Link href="/develop" className="btn btn-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Start a Project Backtest →</Link></div></div><p className="access-legal">No offering is currently open. This page is for pilot evaluation and informational purposes only; it does not accept investments, execute payments, or constitute a solicitation of securities.</p></div></section>

      <footer><div className="map-ticks map-ticks-bottom" aria-hidden="true" /><div className="footer-inner"><span className="footer-brand">EcoXchange</span><span className="footer-meta">Non-Transactional Pilot · © MMXXVI</span><span className="footer-meta">Ownership × Verification × Project Finance Intelligence</span></div></footer>
    </div>
  );
}
