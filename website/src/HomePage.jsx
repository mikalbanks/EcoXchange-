import { ArrowRight, BatteryCharging, Lightning, UsersThree } from "./icons";
import { ButtonLink, trackEvent } from "./ui";

const assets = "/assets/";

const steps = [
  ["Qualify the site", "Understand grid position, site constraints, and the power the project needs."],
  ["Coordinate the resources", "Align DER options, delivery partners, and utility requirements."],
  ["Move toward deployment", "Develop a phased plan grounded in technical and commercial feasibility."],
];

export function HomePage() {
  return <>
    <section className="power-hero">
      <div className="container power-hero-grid">
        <div className="power-hero-copy">
          <p className="eyebrow">DER-enabled power for data centers</p>
          <h1>A faster path to data-center <span>power.</span></h1>
          <p className="power-hero-summary">EcoXchange coordinates distributed energy resources and deployment partners to help qualified sites move toward power sooner when grid queues or upgrades delay growth.</p>
          <div className="power-hero-actions">
            <ButtonLink href="/assessment" onClick={() => trackEvent("assessment_cta", { source: "hero" })}>Explore your power path</ButtonLink>
            <a className="text-link" href="/platform">See how it works<ArrowRight aria-hidden="true" /></a>
          </div>
        </div>
        <figure className="power-path-visual">
          <img src={`${assets}ecoxchange-der-path-diagram.png`} width="1456" height="1024" alt="A traditional grid path may depend on an interconnection queue and upgrades. A coordinated battery-storage and onsite-generation path may support an earlier power phase when site fit and approvals allow. Utility requirements still apply." fetchPriority="high" />
          <figcaption className="sr-only">Conceptual pathways, not an energization commitment.</figcaption>
          <div className="power-path-mobile"><p><strong>Grid path</strong><span>Queue and upgrades can delay full site power.</span></p><p><strong>DER path</strong><span>Storage and onsite generation may enable an earlier phase, subject to site fit and approvals.</span></p></div>
        </figure>
      </div>
    </section>

    <section className="section grid-delay-section" id="how-it-works">
      <div className="container">
        <p className="eyebrow">Real sites. Real paths.</p>
        <h2>Grid delays should not define the whole plan.</h2>
        <p className="section-intro">We bring onsite resources, delivery partners, and operating requirements into one executable power pathway.</p>
        <figure className="campus-panorama">
          <img src={`${assets}ecoxchange-campus-aerial.webp`} alt="Data-center campus and electrical substation at dusk" loading="lazy" width="1672" height="941" />
          <figcaption><strong>A bigger picture</strong><span>Evaluate how grid capacity, onsite resources, and operating requirements work together across your site.</span></figcaption>
        </figure>
        <ol className="delivery-steps">{steps.map(([title, copy], index) => <li key={title}><span className="step-number">0{index + 1}</span><ArrowRight aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      </div>
    </section>

    <section className="section der-section">
      <div className="container der-grid">
        <div className="der-copy">
          <p className="eyebrow">Flexible solutions for growing demand</p>
          <h2>Bring more power options <span>on site.</span></h2>
          <p>Storage and onsite generation can support a phased power strategy when site conditions, approvals, and economics align.</p>
          <div className="der-actions"><ButtonLink href="/assessment" onClick={() => trackEvent("assessment_cta", { source: "der_section" })}>Explore your power path</ButtonLink><a className="text-link" href="/partners">Learn about DERs<ArrowRight aria-hidden="true" /></a></div>
        </div>
        <figure className="der-visual"><img src={`${assets}ecoxchange-der-illustrative.png`} alt="Illustration of battery-storage containers and onsite generation next to a data center" loading="lazy" width="1536" height="1024" /><figcaption>Illustrative DER configuration — not an EcoXchange project</figcaption></figure>
        <div className="der-benefits" aria-label="Coordinated resources"><div><BatteryCharging aria-hidden="true" /><div><h3>Battery storage</h3><p>Support an operating plan with flexible, dispatchable capacity.</p></div></div><div><Lightning aria-hidden="true" /><div><h3>Onsite generation</h3><p>Evaluate generation that fits site requirements and approvals.</p></div></div><div><UsersThree aria-hidden="true" /><div><h3>Deployment coordination</h3><p>Bring qualified partners together from evaluation through implementation.</p></div></div></div>
      </div>
    </section>

    <section className="section infrastructure-section">
      <div className="container infrastructure-grid"><div><p className="eyebrow">Site-specific delivery</p><h2>Built around real <span>infrastructure.</span></h2><p>Every pathway has to fit the site's electrical infrastructure, operating constraints, and expansion plan.</p><a className="text-link" href="/data-centers">Explore data-center solutions<ArrowRight aria-hidden="true" /></a></div><figure><img src={`${assets}ecoxchange-switchgear-hero.webp`} alt="Data-center electrical switchgear with copper busbars" loading="lazy" width="1672" height="941" /><figcaption>Electrical infrastructure shapes the feasible DER pathway.</figcaption></figure></div>
    </section>

    <section className="section closing-section"><div className="container closing-grid"><div><p className="eyebrow">Start with your site</p><h2>Find the power path your project can pursue.</h2><p>Tell us where grid timing stands and what the project needs. We'll use it to determine fit and next steps.</p></div><ButtonLink href="/assessment" onClick={() => trackEvent("assessment_cta", { source: "closing" })}>Explore your power path</ButtonLink></div></section>
  </>;
}
