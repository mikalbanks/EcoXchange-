import { Link } from "wouter";
import { PUBLIC_NAV_LINKS, REQUEST_ACCESS } from "@/lib/nav";
import { POWER_FLEXIBILITY_PATHWAY, PUBLIC_POSITIONING } from "@/lib/public-positioning";
import "./landing.css";

const STACK = [
  ["Firm supply", "Dispatchable onsite or directly connected generation sized to the verified duty."],
  ["Storage", "BESS for ride-through, ramping, grid-limit management, power quality, and short-duration flexibility."],
  ["Controls", "Coordinate generation, storage, grid import, and flexible load with auditable operating logic."],
  ["Capital + delivery", "Bring engineering, EPC, interconnection, equipment, and project capital into one executable pathway."],
] as const;

const PARTNERS = [
  ["Data centers", "Bring a named site, required MW, target power date, and what is already secured. We will determine whether a real bridge requirement exists."],
  ["Power & delivery partners", "Generation, BESS, controls, engineering, EPC, fuel, utility, and capital partners plug into qualified site-specific opportunities."],
  ["DER owners", "Homes and small businesses can join the early-access DER Network for future eligible grid-flexibility programs."],
] as const;

export default function LandingPage() {
  return <div className="landing-page">
    <header><div className="map-ticks map-ticks-top" aria-hidden="true" /><div className="header-inner">
      <Link href="/" className="brand"><span className="brand-name">EcoXchange</span><span className="brand-tag">Distributed power for data centers</span></Link>
      <nav>{PUBLIC_NAV_LINKS.map(link => <Link key={link.href} href={link.href} data-testid={link.testId}>{link.label}</Link>)}<a href={REQUEST_ACCESS.href} className="nav-cta" data-testid={REQUEST_ACCESS.testId}>{REQUEST_ACCESS.label}</a></nav>
    </div></header>

    <main>
      <section className="hero">
        <div className="hero-text">
          <div className="label hero-eyebrow">Power-constrained data centers · Distributed generation · Storage · Controls</div>
          <h1 className="hero-headline">Make constrained sites<br/><em>power-ready.</em></h1>
          <p className="hero-sub"><strong>{PUBLIC_POSITIONING}</strong></p>
          <div className="hero-actions"><a href={REQUEST_ACCESS.href} className="btn btn-primary">Discuss a Power Gap</a><Link href="/der-network" className="btn btn-outline">Join the DER Network</Link></div>
        </div>
        <div className="diagram-frame">
          <div className="label diagram-label">The power-gap equation</div>
          <div className="equation"><span>Required firm load</span><b>−</b><span>Effective firm supply</span><b>=</b><strong>Bridge requirement</strong></div>
          <p className="diagram-caption">Only capacity usable by the required date counts.</p>
        </div>
      </section>

      <section id="solution" className="problem">
        <div className="section-header"><span className="label section-num">§ I</span><h2 className="section-title">Physical power first. Optimization second.</h2></div>
        <p className="problem-intro">EcoXchange does not start with a technology or a generic VPP. We start with the site's actual duty: MW, date, duration, response, redundancy, fuel or recharge constraints, and exit path.</p>
        <div className="problem-cards">{STACK.map(([title,body],i)=><div className="problem-card" key={title}><div className="label problem-card-num">0{i+1}</div><h3>{title}</h3><p>{body}</p></div>)}</div>
      </section>

      <section id="how-it-works" className="method"><div className="method-inner">
        <div className="section-header"><span className="label section-num">§ II</span><h2 className="section-title">From a power gap to an operating fleet.</h2></div>
        <p className="method-intro">The goal is not to manufacture equipment. EcoXchange is the customer-side intelligence and orchestration layer that turns a constrained load into an executable distributed-power solution.</p>
        <div className="method-cards">{POWER_FLEXIBILITY_PATHWAY.map((step,i)=><div className="method-card" key={step}><div className="label method-card-num">0{i+1}</div><h3>{step}</h3></div>)}</div>
      </div></section>

      <section className="benchmark-module">
        <div className="section-header"><span className="label section-num">§ III</span><h2 className="section-title">VPP is an expansion layer—not the physical-power claim.</h2></div>
        <p className="problem-intro">Firm onsite or directly connected resources serve the facility when physical supply is required. Batteries, flexible load, and eligible distributed resources can add grid services, local flexibility, and incremental economics through authorized market-access partners where rules permit.</p>
        <div className="benchmark-figures"><div className="benchmark-figure"><span className="benchmark-figure-num">Control</span><span className="benchmark-figure-text">Site and customer opportunity</span></div><div className="benchmark-figure"><span className="benchmark-figure-num">Design</span><span className="benchmark-figure-text">Lowest-risk resource architecture</span></div><div className="benchmark-figure"><span className="benchmark-figure-num">Delivery</span><span className="benchmark-figure-text">Financeable power date</span></div><div className="benchmark-figure"><span className="benchmark-figure-num">Data</span><span className="benchmark-figure-text">Every live MW improves the next deployment</span></div></div>
      </section>

      <section id="partners" className="investors">
        <div className="section-header"><span className="label section-num">§ IV</span><h2 className="section-title">One demand anchor. A coordinated supply ecosystem.</h2></div>
        <div className="problem-cards">{PARTNERS.map(([title,body])=><div className="problem-card" key={title}><div className="label">{title}</div><h3>{body}</h3>{title==="DER owners"&&<Link href="/der-network" className="btn btn-outline">Join early access →</Link>}</div>)}</div>
      </section>

      <section className="access"><div className="access-inner"><div className="label">Data-center operators · developers · power partners</div><h2 className="access-headline">Start with one real MW/time constraint.</h2><p>Share the site, required firm MW, target energization or ramp date, and the capacity already expected to be available. We will determine the missing fact before proposing a solution.</p><a href={REQUEST_ACCESS.href} className="btn btn-lime">Discuss a Power Gap</a><p className="access-legal">EcoXchange is not a utility and does not guarantee interconnection, energization, market access, savings, or DER program eligibility. Site-specific engineering, utility requirements, tariffs, permits, market rules, and contracts govern execution.</p></div></section>
    </main>
    <footer><div className="footer-inner"><span className="footer-brand">EcoXchange</span><span className="footer-meta">Distributed power for data centers · © MMXXVI</span><Link href="/privacy" className="footer-meta">Privacy</Link></div></footer>
  </div>;
}
