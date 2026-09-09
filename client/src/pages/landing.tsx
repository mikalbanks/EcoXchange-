import { Link } from "wouter";
import { PUBLIC_NAV_LINKS, REQUEST_ACCESS } from "@/lib/nav";
import { BUYER_PATHWAY, PUBLIC_POSITIONING } from "@/lib/public-positioning";
import "./landing.css";

const PRODUCTS = [
  {
    title: "Project Finance Readiness",
    body: "Estimate debt capacity, sponsor-equity requirements, tax-credit value, and capital-stack scenarios before choosing a financing path.",
    href: "/bankability",
    cta: "Analyze financeability →",
  },
  {
    title: "Sponsor-Equity & Capital Origination",
    body: "Turn qualified renewable projects into structured financing opportunities, define the remaining capital requirement, and coordinate appropriate capital options.",
    href: "/develop",
    cta: "Submit a project →",
  },
  {
    title: "Clean-Energy Buyer Matching",
    body: "Connect qualified projects with data centers, utilities, and other large electricity users seeking project-linked clean-energy supply or environmental attributes where rights are available.",
    href: "/market",
    cta: "Explore buyer pathway →",
  },
] as const;

const AUDIENCES = [
  {
    label: "For Developers",
    question: "What can this project finance, and how do I close what remains?",
    body: "Use project finance readiness to understand debt capacity, sponsor equity, tax-credit value, and the next capital action.",
    href: "/develop",
  },
  {
    label: "For Clean-Energy Buyers",
    question: "Where can we access qualified project-linked renewable supply?",
    body: "Source qualified projects, explore long-term clean-energy commitments where project rights are available, and receive source-labeled production reporting.",
    href: "/market",
  },
  {
    label: "For Capital Partners",
    question: "Where can we find qualified projects with standardized finance-readiness information?",
    body: "EcoXchange organizes project data, financeability outputs, sponsor-equity needs, and diligence context before capital engagement.",
    href: "/market#capital",
  },
] as const;

const PLATFORM = [
  "Project / SPE administration",
  "Ownership and cap-table infrastructure",
  "Production verification",
  "Cash-flow and investor reporting",
  "Distribution infrastructure",
  "Environmental-attribute tracking",
  "Tokenization / Polymath infrastructure",
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header>
        <div className="map-ticks map-ticks-top" aria-hidden="true" />
        <div className="header-inner">
          <div className="brand">
            <span className="brand-name">EcoXchange</span>
            <span className="brand-tag">Renewable Project Capital Infrastructure</span>
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
            <div className="label hero-eyebrow">Project Finance Readiness · Capital Origination · Clean-Energy Buyer Matching</div>
            <h1 className="hero-headline">Renewable-project<br /><em>capital infrastructure.</em></h1>
            <p className="hero-sub"><strong>{PUBLIC_POSITIONING}</strong></p>
            <div className="hero-actions">
              <Link href="/develop#submit" className="btn btn-primary">Submit / Analyze a Project</Link>
              <Link href="/market" className="btn btn-outline">Source Clean Energy</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="problem">
        <div className="section-header">
          <span className="label section-num">§ I</span>
          <h2 className="section-title">Three products. One project-capital workflow.</h2>
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
            <h2 className="section-title">Project → Financeability → Capital Gap → Capital / Clean-Energy Buyer → Project Infrastructure</h2>
          </div>
          <p className="method-intro">
            Start with project economics. Determine what contracted cash flow can support. Identify the sponsor-equity or capital gap. Then pursue the appropriate capital path, buyer commitment, or both, while keeping the underlying project record organized.
          </p>
        </div>
      </section>

      <section className="investors">
        <div className="section-header">
          <span className="label section-num">§ III</span>
          <h2 className="section-title">Built around the three parties required to move projects forward.</h2>
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

      <section className="method">
        <div className="method-inner">
          <div className="section-header">
            <span className="label section-num">§ IV</span>
            <h2 className="section-title">Clean-energy buyer pathway.</h2>
          </div>
          <div className="problem-cards">
            {BUYER_PATHWAY.map((step, index) => (
              <div key={step} className="problem-card">
                <div className="label problem-card-num">0{index + 1}</div>
                <h3>{step}</h3>
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <Link href="/market" className="btn btn-primary">Explore Clean-Energy Buyer Pathway</Link>
          </div>
        </div>
      </section>

      <section className="benchmark-module">
        <div className="section-header">
          <span className="label section-num">§ V</span>
          <h2 className="section-title">Infrastructure that supports the project from financing through operations.</h2>
        </div>
        <p className="method-intro">
          EcoXchange keeps the project record connected across ownership, production evidence, reporting, distributions, and environmental attributes as the project advances.
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
          <div className="label">Developers · Clean-Energy Buyers · Capital Partners</div>
          <h2 className="access-headline">Start with a real project or a real clean-energy need.</h2>
          <div className="access-tracks">
            <div className="access-track">
              <p>Developers can submit a project for financeability analysis and capital-gap review.</p>
              <Link href="/develop#submit" className="btn btn-lime">Submit a Project</Link>
            </div>
            <div className="access-track">
              <p>Clean-energy buyers can source qualified project supply and explore long-term commitments where project rights are available.</p>
              <Link href="/market" className="btn btn-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}>Explore Buyer Pathway →</Link>
            </div>
          </div>
          <p className="access-legal">
            EcoXchange does not guarantee financing or energy procurement. Project availability, environmental attributes, tax treatment, and transaction structure are project-specific and subject to diligence, contractual rights, and applicable law.
          </p>
        </div>
      </section>

      <footer>
        <div className="map-ticks map-ticks-bottom" aria-hidden="true" />
        <div className="footer-inner">
          <span className="footer-brand">EcoXchange</span>
          <span className="footer-meta">Renewable-Project Capital Infrastructure · © MMXXVI</span>
          <span className="footer-meta">Financeability × Capital × Clean-Energy Demand</span>
        </div>
      </footer>
    </div>
  );
}
