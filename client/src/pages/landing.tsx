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

// Every benchmark figure below resolves from shared/benchmark — the same object
// the /benchmark page and the exported PDF read. Do not re-type a number here.
const STATS = [
  {
    num: "3 independent sources",
    label: "Inverter · utility meter · satellite model",
  },
  {
    num: "Monthly determination",
    label: "Verified · flagged · pending",
  },
  {
    num: "Distribution gate",
    label: "Payment proceeds only after verification",
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
    title: "One source is not independent",
    body: "Monitoring portals show useful operating data, but they do not independently confirm utility-delivered output.",
  },
  {
    num: "02",
    title: "Annual reporting arrives too late",
    body: "Production shortfalls can compound for months before financial reporting reveals them.",
  },
  {
    num: "03",
    title: "Physical audits do not scale",
    body: "On-site sensors and third-party reviews add cost and delay to smaller projects.",
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
    body: "A traceable monthly result that gates distribution processing.",
    highlight: true,
  },
] as const;

const BENCHMARK_FIGURES = [
  {
    num: fmtPlants,
    text: "plants tested",
  },
  {
    num: `±${PUBLICATION_MAD_PCT.toFixed(1)}%`,
    text: "publication-cohort mean absolute deviation",
  },
  {
    num: `±${FULL_FLEET_MAD_PCT.toFixed(1)}%`,
    text: "full-fleet mean absolute deviation",
  },
  {
    num: `${PUBLICATION_WITHIN_10_RATE.toFixed(1)}%`,
    text: "of the publication cohort within ±10%",
  },
] as const;

const FEE_ROWS = [
  { label: "Origination fee (one-time, at close)", eco: "3% of equity raised", other: "4–8% placement + 1–3% warrants" },
  { label: "Setup fee (one-time, at close)", eco: "$15,000 fixed", other: "$80K–$250K legal + admin" },
  { label: "Servicing fee (recurring)", eco: "0.5% of AUA / year", other: "$10K–$25K / year per project" },
  { label: "Investor load charge", eco: "None", other: "0–5% upfront" },
  { label: "Production verification", eco: "Production-based, included", other: "$5K–$15K / year third-party" },
  { label: "Distribution cadence", eco: "Monthly, automated", other: "Quarterly, manual, 30–90d" },
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
            {PUBLIC_NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} data-testid={link.testId}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} data-testid={link.testId}>
                  {link.label}
                </Link>
              ),
            )}
            <Link
              href={REQUEST_ACCESS.href}
              className="nav-cta"
              data-testid={REQUEST_ACCESS.testId}
            >
              {REQUEST_ACCESS.label}
            </Link>
          </nav>
        </div>
      </header>

      <section>
        <div className="hero">
          <div className="hero-text">
            <div className="label hero-eyebrow">Independent Solar Production Verification</div>
            <h1 className="hero-headline">
              Light,
              <br />
              <em>accounted for.</em>
            </h1>
            <p className="hero-sub">
              EcoXchange independently verifies how much electricity a solar project produces each month. Our
              engine reconciles inverter telemetry, utility meter data, and satellite-modeled generation to issue
              a verified, flagged, or pending determination — with investor distributions released only after
              verification.
            </p>
            <div className="hero-actions">
              <Link href="/verification" className="btn btn-primary">
                See How Verification Works
              </Link>
              <a href="https://demo.ecoxchange.net/" className="btn btn-outline">
                Run the Live Demo
              </a>
              <Link href="/market" className="btn btn-outline">
                Explore Project Applications →
              </Link>
            </div>
          </div>
          <div className="hero-diagram">
            <SunPathDiagram />
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stats-grid stats-grid-phrases">
          {STATS.map((s) => (
            <div key={s.num} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">
                {"href" in s && s.href ? (
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label} →
                  </a>
                ) : (
                  s.label
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section id="problem" className="problem">
        <div className="section-header">
          <span className="label section-num">§ I</span>
          <h2 className="section-title">Solar production is reported. It is rarely reconciled.</h2>
        </div>
        <p className="problem-intro">
          Investors, developers, and asset managers often rely on a single monitoring feed or periodic
          self-reporting. EcoXchange closes that trust gap with an independent, repeatable monthly determination
          at the project level.
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

      <section id="verification" className="method">
        <div className="method-inner">
          <div className="section-header">
            <span className="label section-num">§ II</span>
            <h2 className="section-title">Three sources. One monthly determination.</h2>
          </div>
          <p className="method-intro">
            The engine compares the project&apos;s inverter telemetry and utility meter data with expected
            generation modeled from NASA and NREL weather inputs. Agreement within the project&apos;s configured
            tolerance produces a verified result. Missing or inconsistent data produces a pending or flagged
            result for review.
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
          <span className="label">First Application · Project-Level Capital Formation</span>
          <h2 className="section-title">
            Verified production, applied to individual solar-project offerings.
          </h2>
        </div>
        <div className="investors-grid">
          <div className="investors-body">
            <p>
              EcoXchange administers private placements of equity interests in individual U.S. solar-project
              entities to verified accredited investors under Reg D 506(c). Each offering remains tied to one
              project and one auditable production record.
            </p>
            <p className="investors-note">
              The investment is an equity interest governed by the offering documents. Any permissioned digital
              record supports ownership administration; it is not a cryptocurrency product or a separate
              investment.
            </p>
            <Link href="/market" className="btn btn-primary">
              Explore Project Applications →
            </Link>
          </div>
          <div className="investors-stats">
            {METHOD_CARDS.map((row) => (
              <div key={row.num} className="investor-stat">
                <span className="investor-stat-num">{row.num}</span>
                <span className="investor-stat-text">
                  <strong>{row.title}</strong> — {row.body}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benchmark" className="benchmark-module">
        <div className="section-header">
          <span className="label section-num">§ IV</span>
          <h2 className="section-title">Tested against reported U.S. solar generation.</h2>
        </div>
        <p className="problem-intro">
          Engine {ENGINE_VERSION_BENCHMARKED} was benchmarked against {BENCHMARK_YEAR} EIA-923 reported
          generation using NASA POWER irradiance inputs. Review the publication cohort, full-fleet results,
          assumptions, and documented exclusions.
        </p>
        <div className="benchmark-figures">
          {BENCHMARK_FIGURES.map((f) => (
            <div key={f.text} className="benchmark-figure">
              <span className="benchmark-figure-num">{f.num}</span>
              <span className="benchmark-figure-text">{f.text}</span>
            </div>
          ))}
        </div>
        <a href={BENCHMARK_HREF} className="btn btn-outline">
          Review the Benchmark →
        </a>
      </section>

      <section id="fee" className="fee">
        <div className="fee-inner">
          <div className="section-header">
            <span className="label section-num">§ V</span>
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
                After close, a <strong>0.5% annual servicing fee on assets under administration</strong> is billed monthly
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
          <div className="access-tracks">
            <div className="access-track">
              <p>Explore how verified production supports project-level private offerings.</p>
              <Link href={REQUEST_ACCESS.href} className="btn btn-lime">
                Request Investor Access
              </Link>
            </div>
            <div className="access-track">
              <p>Submit a project for an independent 12-month production backtest.</p>
              <Link
                href="/develop"
                className="btn btn-outline"
                style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)" }}
              >
                Start a Project Backtest →
              </Link>
            </div>
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
          <span className="footer-meta">Reg D 506(c) · Private Placements · © MMXXVI</span>
          <span className="footer-meta">
            Inverter × Utility Meter × Satellite Model · Auditable · Hardware-Free
          </span>
        </div>
      </footer>
    </div>
  );
}
