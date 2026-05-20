import { Link } from "wouter";
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
    num: "3% + $15K + 1.25%",
    label: "Origination + setup + AUA servicing — all paid by SPV, not investors",
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
  { label: "Origination fee (one-time, at close)", eco: "3% of equity raised", other: "4–8% placement + 1–3% warrants" },
  { label: "Setup fee (one-time, at close)", eco: "$15,000 fixed", other: "$80K–$250K legal + admin" },
  { label: "Servicing fee (recurring)", eco: "1.25% of AUA / year", other: "$10K–$25K / year per project" },
  { label: "Investor load charge", eco: "None", other: "0–5% upfront" },
  { label: "Production verification", eco: "Physics-based, included", other: "$5K–$15K / year third-party" },
  { label: "Distribution cadence", eco: "Monthly, USDC, auto", other: "Quarterly, manual, 30–90d" },
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
            <Link href="/">Home</Link>
            <Link href="/market">Marketplace</Link>
            <Link href="/develop">Develop</Link>
            <Link href="/method">Method</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/market#onboard" className="nav-cta">
              Request Access →
            </Link>
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
              <Link href="/market#onboard" className="btn btn-primary">
                Request Investor Access
              </Link>
              <Link href="/method" className="btn btn-outline">
                See the Method →
              </Link>
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
            <Link href="/market#onboard" className="btn btn-primary">
              Request Investor Access →
            </Link>
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
                EcoXchange charges three fees, <strong>all borne by the project SPV — not by investors directly</strong>.
                Investor returns are quoted net of these fees.
              </p>
              <p>
                A <strong>3% origination fee</strong> and a fixed <strong>$15,000 setup fee</strong> are paid by the SPV
                at offering close from the capital raised. Together they replace the 4–8% placement-agent commission and
                $80K+ in soft costs typical of a traditional Reg D 506(c) raise.
              </p>
              <p>
                After close, a <strong>1.25% annual servicing fee on assets under administration</strong> is billed monthly
                to the SPV — covering production verification, smart-contract distribution infrastructure, investor
                reporting, and K-1 coordination throughout the life of the offering.
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
                  <span>Borne by</span>
                  <span>Project SPV (not investors)</span>
                  <span className="fee-no">Investor + SPV — varies</span>
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
            <Link href="/market#onboard" className="btn btn-lime">
              Begin investor onboarding
            </Link>
            <Link
              href="/develop"
              className="btn btn-outline"
              style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
            >
              Developer Submission →
            </Link>
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
