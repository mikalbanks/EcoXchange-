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
    num: "3 evidence roles",
    label: "Measured · modeled · derived status shown per source",
  },
  {
    num: "Monthly determination",
    label: "Verified · flagged · pending",
  },
  {
    num: "Verification-only pilot",
    label: "No offering or payment execution in the current demo",
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
    body: "A traceable monthly result designed to support a future, separately approved transaction workflow.",
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

const PILOT_ROWS = [
  { label: "Production backtest", eco: "Included", other: "Source coverage reviewed" },
  { label: "Per-source provenance", eco: "Included", other: "Measured · modeled · derived · simulated" },
  { label: "Utility evidence", eco: "Availability-dependent", other: "A proxy is disclosed, never promoted" },
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
            <div className="label hero-eyebrow">Source-Aware Solar Production Verification</div>
            <h1 className="hero-headline">
              Light,
              <br />
              <em>accounted for.</em>
            </h1>
            <p className="hero-sub">
              EcoXchange compares available inverter telemetry, utility evidence, and satellite-modeled generation
              to issue a verified, flagged, or pending engine determination. Every source is labeled by basis. The
              current pilot demo is production-verification only and does not execute investments or distributions.
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
          self-reporting. EcoXchange addresses that trust gap with a repeatable monthly determination and an
          explicit provenance label for every input.
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
            <h2 className="section-title">Three evidence roles. One monthly determination.</h2>
          </div>
          <p className="method-intro">
            The engine compares the project&apos;s inverter telemetry and utility meter data with expected
            generation modeled from NASA and NREL weather inputs. Agreement within the project&apos;s configured
            tolerance produces a verified engine result. Missing or inconsistent data produces a pending or flagged
            result for review. A derived or simulated leg is disclosed and is not counted as an independent measurement.
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
              EcoXchange is preparing a verification-led pilot for individual U.S. solar projects. After pilot
              validation and required legal, compliance, and operating approvals, the planned product may support
              project-level capital formation tied to an auditable production record.
            </p>
            <p className="investors-note">
              This demo does not display an open offering, accept investments, or execute distributions. Any future
              investment would be governed by counsel-approved offering documents; a permissioned digital record
              would support ownership administration rather than create a separate investment.
            </p>
            <Link href="/develop" className="btn btn-primary">
              View Pilot Scope →
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
            <h2 className="section-title">Release 1 pilot boundaries.</h2>
          </div>
          <div className="fee-grid">
            <div className="fee-body">
              <p>
                Release 1 is a <strong>verification-led pilot</strong>. It evaluates production evidence and makes
                source provenance visible; it is not a securities offering or financing commitment.
              </p>
              <p>
                Pilot timing, data-access responsibilities, and any commercial terms are confirmed separately in
                writing after a fit review. The public site does not publish a price quote or time-to-capital promise.
              </p>
              <p>
                Offering, subscription, ownership, legal-document, and payment execution remain disabled until the
                necessary authoritative systems, partners, and approvals are in place.
              </p>
            </div>
            <div>
              <div className="fee-table">
                <div className="fee-table-head">Pilot Scope</div>
                <div className="fee-row fee-row-labels">
                  <span />
                  <span>Release 1</span>
                  <span>Boundary</span>
                </div>
                {PILOT_ROWS.map((row) => (
                  <div key={row.label} className="fee-row">
                    <span>{row.label}</span>
                    <span className="fee-yes">{row.eco}</span>
                    <span className="fee-no">{row.other}</span>
                  </div>
                ))}
                <div className="fee-row fee-total">
                  <span>Pilot objective</span>
                  <span>Verify the evidence workflow</span>
                  <span className="fee-no">Do not imply a live transaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="access" className="access">
        <div className="access-inner">
          <div className="label">Request Pilot Access · Partners and Project Operators</div>
          <h2 className="access-headline">A short conversation.</h2>
          <div className="access-tracks">
            <div className="access-track">
              <p>Review the verification workflow and discuss pilot requirements.</p>
              <Link href={REQUEST_ACCESS.href} className="btn btn-lime">
                Request Pilot Access
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
            No offering is currently open. This page is for pilot evaluation and informational purposes only; it
            does not accept investments, execute payments, or constitute a solicitation of securities.
          </p>
        </div>
      </section>

      <footer>
        <div className="map-ticks map-ticks-bottom" aria-hidden="true" />
        <div className="footer-inner">
          <span className="footer-brand">EcoXchange</span>
          <span className="footer-meta">Verification-Led Pilot · © MMXXVI</span>
          <span className="footer-meta">
            Inverter × Utility Evidence × Satellite Model · Source-Labeled
          </span>
        </div>
      </footer>
    </div>
  );
}
