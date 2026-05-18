import { SunPathDiagram } from "@/components/landing/SunPathDiagram";
import "./landing.css";

const STATS = [
  {
    num: "99.74%",
    label: "Verification confidence on satellite-reconciled production data",
  },
  {
    num: "$1–5M",
    label: "Target deal size — the range institutional desks ignore",
  },
  {
    num: "506(c)",
    label: "Reg D exemption — verified accredited investors only",
  },
  {
    num: "5%",
    label: "Origination fee — charged to project SPV, not to investors",
  },
] as const;

const PROBLEM_CARDS = [
  {
    num: "01",
    title: "Too Small for Wall Street",
    body: "Tax-equity desks and infrastructure funds require $25M+ minimums. The $1M–$5M permitted solar project has no institutional capital path.",
  },
  {
    num: "02",
    title: "Too Complex for Individuals",
    body: "SPV formation, accreditation, distributions, and production verification require institutional-grade infrastructure individuals cannot self-assemble.",
  },
  {
    num: "03",
    title: "Verification is Opaque & Costly",
    body: "Physical sensors, third-party audits, and developer self-reporting produce blended, unverifiable yield claims. No project-level audit trail exists.",
  },
] as const;

const METHOD_CARDS = [
  {
    num: "01",
    title: "Hardware-free",
    body: "No on-site sensors. Satellite irradiance is publicly available and continuously measured.",
    highlight: false,
  },
  {
    num: "02",
    title: "Deterministic",
    body: "A double-entry reconciliation core. ML is restricted to post-calculation anomaly flagging only.",
    highlight: false,
  },
  {
    num: "03",
    title: "Auditable",
    body: "Every yield figure traces to utility meter data and satellite irradiance. Full audit trail preserved.",
    highlight: true,
  },
  {
    num: "04",
    title: "Patent-pending",
    body: "Provisional on file. Non-provisional conversion in the 12-month window. The method is the moat.",
    highlight: false,
  },
] as const;

const INVESTOR_STATS = [
  {
    num: "506(c)",
    text: "Reg D exemption — general solicitation permitted to verified accredited investors only",
  },
  {
    num: "Direct",
    text: "One security per project — your capital exposed to exactly one auditable production asset",
  },
  {
    num: "Physics",
    text: "Distributions derive from satellite irradiance × utility meter reconciliation, not developer self-reports",
  },
  {
    num: "Handled",
    text: "Accreditation, AML, suitability, and tax reporting managed on-platform",
  },
] as const;

const FEE_ROWS = [
  { label: "Annual management fee", eco: "None", other: "1–2% / year" },
  { label: "Investor load charge", eco: "None", other: "0–5% upfront" },
  { label: "Production verification", eco: "Physics-based", other: "Developer self-report" },
  { label: "Yield exposure", eco: "Direct, per-project", other: "Pooled, blended" },
  { label: "Compliance handled", eco: "On-platform", other: "By investor / advisor" },
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header>
        <div className="map-ticks map-ticks-top" aria-hidden="true" />
        <div className="header-inner">
          <div className="brand">
            <span className="brand-name">EcoXchange</span>
            <span className="brand-tag">Clean Energy Market</span>
          </div>
          <nav>
            <a href="#problem">The Gap</a>
            <a href="#method">Method</a>
            <a href="#investors">Investors</a>
            <a href="#fee">Fees</a>
            <a href="#access" className="nav-cta">
              Request Access →
            </a>
          </nav>
        </div>
      </header>

      <section>
        <div className="hero">
          <div className="hero-text">
            <div className="label hero-eyebrow">Physics-Verified Yield · Reg D 506(c)</div>
            <h1 className="hero-headline">
              Light,
              <br />
              <em>accounted for.</em>
            </h1>
            <p className="hero-sub">
              EcoXchange is a regulated digital-securities platform that gives accredited investors direct,
              physics-verified yield on individual solar projects — a return profile no pooled fund, REIT, or
              crowdfunding platform can replicate.
            </p>
            <div className="hero-actions">
              <a href="#access" className="btn btn-primary">
                Request Investor Access
              </a>
              <a href="#method" className="btn btn-outline">
                See the Method →
              </a>
            </div>
          </div>
          <div className="hero-diagram">
            <SunPathDiagram />
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stats-grid">
          {STATS.map((s) => (
            <div key={s.num} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section id="problem" className="problem">
        <div className="section-header">
          <span className="label section-num">§ I</span>
          <h2 className="section-title">The yield gap for accredited investors.</h2>
        </div>
        <p className="problem-intro">
          Accredited investors have no direct, physics-verified yield instrument on individual solar projects.
          Every available vehicle — pooled funds, REITs, yieldcos, Reg CF crowdfunding — delivers blended,
          fund-level performance. EcoXchange provides both the verification method and the regulated platform
          to change that.
        </p>
        <div className="problem-cards">
          {PROBLEM_CARDS.map((card) => (
            <div key={card.num} className="problem-card">
              <div className="label problem-card-num">{card.num}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="method" className="method">
        <div className="method-inner">
          <div className="section-header">
            <span className="label section-num">§ II</span>
            <h2 className="section-title">Hardware-Free. Deterministic. Auditable.</h2>
          </div>
          <p className="method-intro">
            A double-entry reconciliation engine that cross-references satellite irradiance against utility
            net-meter data — producing a securities-grade, per-project yield figure with no on-site hardware
            required. Marginal verification cost approaches zero.
          </p>
          <div className="method-cards">
            {METHOD_CARDS.map((card) => (
              <div
                key={card.num}
                className={card.highlight ? "method-card highlight" : "method-card"}
              >
                <div className="label method-card-num">{card.num}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="investors" className="investors">
        <div className="section-header">
          <span className="label section-num">§ III</span>
          <h2 className="section-title">Built for accredited investors.</h2>
        </div>
        <div className="investors-grid">
          <div className="investors-body">
            <p>
              EcoXchange structures each solar project as a separate Reg D 506(c) digital security. One offering.
              One project. One auditable production trail. Investors receive pro-rata distributions derived
              directly from verified physical output — not a fund manager&apos;s allocation, not a blended
              portfolio return.
            </p>
            <p>
              The platform handles accreditation verification, AML, suitability, and tax reporting end-to-end.
              What you are buying is a deterministic yield instrument grounded in physics — a return profile no
              pooled vehicle can structurally replicate.
            </p>
            <a href="#access" className="btn btn-primary">
              Request Investor Access →
            </a>
          </div>
          <div className="investors-stats">
            {INVESTOR_STATS.map((row) => (
              <div key={row.num} className="investor-stat">
                <span className="investor-stat-num">{row.num}</span>
                <span className="investor-stat-text">{row.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fee" className="fee">
        <div className="fee-inner">
          <div className="section-header">
            <span className="label section-num">§ IV</span>
            <h2 className="section-title">How the fee is structured.</h2>
          </div>
          <div className="fee-grid">
            <div className="fee-body">
              <p>
                EcoXchange charges a <strong>5% origination fee to the project SPV at offering close</strong> —
                paid from the capital raised, not from investor returns. Investors pay no management fee, no annual
                platform fee, and no load charge.
              </p>
              <p>
                The origination fee is a one-time transaction charge; it does not persist as an annual drag on yield.
                EcoXchange&apos;s incentive is to put capital to work — not to hold it.
              </p>
              <p>
                An ongoing servicing fee is retained from the project SPV to cover distribution calculation,
                reporting, and audit delivery throughout the life of the offering. Also borne by the project side,
                not investors.
              </p>
            </div>
            <div>
              <div className="fee-table">
                <div className="fee-table-head">Fee Comparison</div>
                <div className="fee-row fee-row-labels">
                  <span />
                  <span>EcoXchange</span>
                  <span>Fund / REIT / Reg CF</span>
                </div>
                {FEE_ROWS.map((row) => (
                  <div key={row.label} className="fee-row">
                    <span>{row.label}</span>
                    <span className="fee-yes">{row.eco}</span>
                    <span className="fee-no">{row.other}</span>
                  </div>
                ))}
                <div className="fee-row fee-total">
                  <span>Origination fee</span>
                  <span>5% — to project SPV at close</span>
                  <span className="fee-no">Varies — often embedded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="access" className="access">
        <div className="access-inner">
          <div className="label">Request Access · Reg D 506(c) · Accredited Investors Only</div>
          <h2 className="access-headline">A short conversation.</h2>
          <p>
            EcoXchange is pre-offering and operates a high-touch process during the pilot stage. If you are an
            accredited investor, an RIA building an alternative sleeve, or a family office with a clean energy
            mandate — we will respond personally within two business days.
          </p>
          <div className="access-actions">
            <a
              href="mailto:contact@ecoxchange.net?subject=Investor%20access%20inquiry"
              className="btn btn-lime"
            >
              Investor Inquiry
            </a>
            <a
              href="mailto:contact@ecoxchange.net?subject=Developer%20submission"
              className="btn btn-outline"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
            >
              Developer Submission →
            </a>
          </div>
          <p className="access-legal">
            No offering is currently open. This page is for informational and pipeline-building purposes only
            and does not constitute a solicitation of securities. EcoXchange offerings are restricted to verified
            accredited investors under Reg D 506(c).
          </p>
        </div>
      </section>

      <footer>
        <div className="map-ticks map-ticks-bottom" aria-hidden="true" />
        <div className="footer-inner">
          <span className="footer-brand">EcoXchange</span>
          <span className="footer-meta">Reg D 506(c) · Digital Securities · © MMXXVI</span>
          <span className="footer-meta">Satellite × Utility Meter · Auditable · Hardware-Free</span>
        </div>
      </footer>
    </div>
  );
}
