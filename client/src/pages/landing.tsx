import { Link } from "wouter";
import { PUBLIC_NAV_LINKS, REQUEST_ACCESS } from "@/lib/nav";
import { POWER_FLEXIBILITY_PATHWAY, PUBLIC_POSITIONING } from "@/lib/public-positioning";
import "./landing.css";

const PRODUCTS = [
  {
    title: "Power Flexibility Readiness",
    body: "Quantify flexible MW, critical-load boundaries, contracted-capacity exposure, tariff constraints, and the practical options for storage, onsite generation, or other distributed resources.",
    href: "/market#readiness",
    cta: "Assess a site →",
  },
  {
    title: "DER & Onsite Power Planning",
    body: "Evaluate which storage, generation, or distributed-energy assets could support a site's power needs and what capital may be required to deploy them.",
    href: "/develop",
    cta: "Explore the asset pathway →",
  },
  {
    title: "Telemetry & Performance Verification",
    body: "Connect operating data and maintain source-labeled evidence for availability, production, response performance, and ongoing reporting.",
    href: "/verification",
    cta: "See the evidence layer →",
  },
  {
    title: "VPP Orchestration",
    body: "EcoXchange is building toward aggregation and coordinated orchestration of flexible load and distributed energy resources as measurable, dispatchable capacity.",
    href: "/verification",
    cta: "See the operating model →",
  },
] as const;

const AUDIENCES = [
  {
    label: "Data Centers",
    question: "How much usable capacity can this site unlock beyond a simple utility-service view?",
    body: "Model flexible load, tariff obligations, storage and onsite generation, interconnection constraints, and the market pathways that could support additional capacity.",
    href: "/market",
  },
  {
    label: "DER & Project Partners",
    question: "Where can our energy asset create real value around data-center demand?",
    body: "Bring qualified storage, generation, and renewable-energy assets into a financeability, telemetry, and performance-verification workflow.",
    href: "/develop",
  },
  {
    label: "Market & Capital Partners",
    question: "Which capacity is real, financeable, measurable, and eligible for participation?",
    body: "EcoXchange organizes the technical, financial, and operating evidence needed before regulated market participation or capital deployment.",
    href: "/verification",
  },
] as const;

const PLATFORM = [
  "Flexible-MW assessment",
  "Tariff and contracted-capacity modeling",
  "DER financeability",
  "Telemetry integration",
  "Availability and performance verification",
  "Aggregation and settlement infrastructure",
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header>
        <div className="map-ticks map-ticks-top" aria-hidden="true" />
        <div className="header-inner">
          <div className="brand">
            <span className="brand-name">EcoXchange</span>
            <span className="brand-tag">Distributed Power Infrastructure for Data Centers</span>
          </div>
          <nav>
            {PUBLIC_NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} data-testid={link.testId}>{link.label}</a>
              ) : (
                <Link key={link.href} href={link.href} data-testid={link.testId}>{link.label}</Link>
              ),
            )}
            <Link href={REQUEST_ACCESS.href} className="nav-cta" data-testid={REQUEST_ACCESS.testId}>
              {REQUEST_ACCESS.label}
            </Link>
          </nav>
        </div>
      </header>

      <section>
        <div className="hero">
          <div className="hero-text">
            <div className="label hero-eyebrow">Flexible Load · Storage · Distributed Generation · Verification · VPP Orchestration</div>
            <h1 className="hero-headline">Distributed power infrastructure<br /><em>for data centers.</em></h1>
            <p className="hero-sub"><strong>{PUBLIC_POSITIONING}</strong></p>
            <div className="hero-actions">
              <Link href="/market#readiness" className="btn btn-primary">Assess a Data-Center Site</Link>
              <a href="mailto:contact@ecoxchange.net?subject=EcoXchange%20data-center%20power%20strategy" className="btn btn-outline">Discuss Power Strategy</a>
            </div>
            <p className="method-intro" style={{ marginTop: "1rem" }}>
              Best fit today: power-constrained AI/HPC, colocation, and data-center development sites where every additional MW and month-to-energization matters.
            </p>
          </div>
        </div>
      </section>

      <section id="products" className="problem">
        <div className="section-header">
          <span className="label section-num">§ I</span>
          <h2 className="section-title">Start with the power constraint. Build toward orchestration.</h2>
        </div>
        <div className="problem-cards">
          {PRODUCTS.map((product, index) => (
            <div key={product.title} className="problem-card">
              <div className="label problem-card-num">0{index + 1}</div>
              <h3>{product.title}</h3>
              <p>{product.body}</p>
              <Link href={product.href} className="btn btn-outline">{product.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="method">
        <div className="method-inner">
          <div className="section-header">
            <span className="label section-num">§ II</span>
            <h2 className="section-title">The EcoXchange power-flexibility workflow.</h2>
          </div>
          <p className="method-intro">
            Start with one real site. Map utility service and contracted capacity, separate critical from flexible load, evaluate distributed-resource options, model the tariff and market pathway, then connect telemetry and verify performance. As the fleet grows, aggregate and orchestrate capacity.
          </p>
          <div className="problem-cards">
            {POWER_FLEXIBILITY_PATHWAY.map((step, index) => (
              <div key={step} className="problem-card">
                <div className="label problem-card-num">0{index + 1}</div>
                <h3>{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="investors">
        <div className="section-header">
          <span className="label section-num">§ III</span>
          <h2 className="section-title">Built around load, energy assets, and the partners that connect them.</h2>
        </div>
        <div className="problem-cards">
          {AUDIENCES.map((audience) => (
            <div key={audience.label} className="problem-card">
              <div className="label">{audience.label}</div>
              <h3>{audience.question}</h3>
              <p>{audience.body}</p>
              <Link href={audience.href} className="btn btn-outline">Explore →</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="benchmark-module">
        <div className="section-header">
          <span className="label section-num">§ IV</span>
          <h2 className="section-title">What EcoXchange needs to know before capacity is real.</h2>
        </div>
        <p className="method-intro">
          A megawatt is only useful if its location, operating limits, response time, duration, dispatch rights, telemetry, tariff treatment, and settlement pathway are understood. EcoXchange is building the evidence layer around those facts.
        </p>
        <div className="benchmark-figures">
          {PLATFORM.map((capability) => (
            <div key={capability} className="benchmark-figure">
              <span className="benchmark-figure-num">{capability}</span>
            </div>
          ))}
        </div>
        <Link href="/verification" className="btn btn-outline">See How the Platform Works →</Link>
      </section>

      <section id="access" className="access">
        <div className="access-inner">
          <div className="label">Data Centers · DER Partners · Market Partners</div>
          <h2 className="access-headline">Start with one real power constraint.</h2>
          <div className="access-tracks">
            <div className="access-track">
              <p>Data-center operators and developers can share one site for a Power Flexibility Readiness review: planned MW, utility context, load profile, critical-load boundaries, and existing or planned onsite resources.</p>
              <Link href="/market#readiness" className="btn btn-lime">Assess a Site</Link>
            </div>
            <div className="access-track">
              <p>Energy-asset partners can bring storage, generation, or renewable projects that may support data-center power needs and need financeability, telemetry, or performance infrastructure.</p>
              <Link href="/develop" className="btn btn-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Explore DER Pathway →</Link>
            </div>
          </div>
          <p className="access-legal">
            EcoXchange is not a utility and does not guarantee interconnection, energization, wholesale-market access, or savings. Utility tariffs, RTO/ISO rules, state law, interconnection requirements, and site-specific operating constraints govern execution.
          </p>
        </div>
      </section>

      <footer>
        <div className="map-ticks map-ticks-bottom" aria-hidden="true" />
        <div className="footer-inner">
          <span className="footer-brand">EcoXchange</span>
          <span className="footer-meta">Distributed Power Infrastructure for Data Centers · © MMXXVI</span>
          <span className="footer-meta">Identify × Finance × Connect × Verify × Aggregate × Orchestrate × Settle</span>
        </div>
      </footer>
    </div>
  );
}
