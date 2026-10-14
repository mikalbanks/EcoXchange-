import { type FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { PUBLIC_NAV_LINKS, REQUEST_ACCESS } from "@/lib/nav";
import { screenSite } from "@/lib/site-scout";
import "./landing.css";
import "./site-scout.css";

const MARKETS = ["ERCOT", "PJM", "MISO", "CAISO", "NYISO", "ISO-NE", "SPP"];

export default function SiteScoutPage() {
  const [location, setLocation] = useState("");
  const [siteName, setSiteName] = useState("");
  const [requiredMw, setRequiredMw] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [siteStatus, setSiteStatus] = useState("EXPLORING");
  const [utility, setUtility] = useState("");
  const [isoRto, setIsoRto] = useState("");
  const [supplyMw, setSupplyMw] = useState("");
  const [isSupplyDocumented, setIsSupplyDocumented] = useState(false);
  const [screened, setScreened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (screened) document.getElementById("site-scout-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [screened]);

  const parsedSupply = supplyMw.trim() === "" ? null : Number(supplyMw);
  const result = screened ? screenSite({
    requiredMw: Number(requiredMw),
    confirmedSupplyMw: parsedSupply,
    isSupplyDocumented,
    utility,
    targetDate,
    siteStatus,
  }) : null;

  const runScreen = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScreened(true);
    setSubmissionId("");
    setError("");
  };

  const submitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!result) return;
    setSubmitting(true);
    setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = String(fields.get("contactName") || "");
    const company = String(fields.get("company") || "");
    const email = String(fields.get("workEmail") || "");
    const notes = [
      "SITE SCOUT: early-stage data-center siting inquiry.",
      "Site stage: " + (siteStatus === "CONTROLLED" ? "site controlled (visitor reported)" : "exploring site"),
      "Location: " + location,
      "Market: " + (isoRto || "not sure"),
      "Supplied firm MW: " + (isSupplyDocumented && parsedSupply !== null ? parsedSupply + " (visitor reports documented; not independently reviewed)" : "UNKNOWN / NOT CONFIRMED"),
      "Site-screen confidence: preliminary, visitor supplied; no grid capacity determination.",
    ].join("\n").slice(0, 1400);
    try {
      const response = await apiRequest("POST", "/api/public/power-gap-intakes", {
        origin: "SITE_SCOUT",
        contactName: name,
        workEmail: email,
        company,
        role: String(fields.get("role") || ""),
        siteName: (siteName.trim() || "Site Scout — " + location).slice(0, 180),
        siteLocation: location,
        utility: utility.trim() || "Unknown — to verify",
        isoRto,
        requiredFirmMw: Number(requiredMw),
        firmSupplyMw: isSupplyDocumented && parsedSupply !== null ? parsedSupply : undefined,
        targetPowerTiming: targetDate,
        constraintType: "NOT_SURE",
        bridgeDuration: "",
        existingResources: [],
        reliabilityNotes: "",
        notes,
        consent: fields.get("consent") === "on",
        website: String(fields.get("website") || ""),
      });
      const saved = (await response.json()) as { submissionId?: string };
      setSubmissionId(saved.submissionId || "received");
      form.reset();
    } catch (reason) {
      console.error("Site Scout lead submission failed:", reason);
      setError("We could not save your request. Please try again or email contact@ecoxchange.net.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="landing-page site-scout-page">
    <header><div className="header-inner">
      <Link href="/" className="brand"><span className="brand-name">EcoXchange</span><span className="brand-tag">Power-first site intelligence</span></Link>
      <nav>{PUBLIC_NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link className="nav-cta" href={REQUEST_ACCESS.href}>{REQUEST_ACCESS.label}</Link></nav>
    </div></header>

    <main>
      <section className="scout-hero">
        <div className="scout-hero-copy">
          <span className="label hero-eyebrow">Free early-stage screening · Data centers</span>
          <h1 className="hero-headline">Find a site.<br/><em>Think power first.</em></h1>
          <p className="hero-sub">Before committing to land, identify the power facts that matter. Screen a prospective location's MW need, target opening date, and unanswered utility questions—then move toward a real Power Access Plan.</p>
          <p className="scout-micro">No login required · No fabricated grid-capacity scores · Not a utility service commitment</p>
        </div>
        <div className="scout-hero-art" aria-label="Site assessment steps">
          <span className="label">Site Scout / Assessment path</span>
          <div className="scout-line"><b>01</b><span>Choose a location</span></div>
          <div className="scout-line"><b>02</b><span>Define the MW and date</span></div>
          <div className="scout-line"><b>03</b><span>Identify the unknowns</span></div>
          <div className="scout-line"><b>04</b><span>Request a power screen</span></div>
        </div>
      </section>

      <section className="scout-workspace" aria-labelledby="scout-title">
        <div className="section-header"><span className="label section-num">§ Site selection</span><h2 id="scout-title" className="section-title">Start with what you know.</h2></div>
        <p className="scout-intro">A utility letter is not required to start. Unknowns remain unknown; we never infer available MW from a nearby transmission line.</p>
        <div className="scout-layout">
          <form className="network-form scout-form" onSubmit={runScreen}>
            <label className="scout-span">Candidate location <span className="scout-hint">City/state, county, or address</span>
              <input name="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={180} minLength={2} placeholder="e.g. Newark, NJ or planned campus address" required />
            </label>
            <label>Project / site name <span className="scout-hint">Optional</span>
              <input value={siteName} onChange={(e) => setSiteName(e.target.value)} maxLength={180} placeholder="Working title is fine" />
            </label>
            <label>Site stage
              <select value={siteStatus} onChange={(e) => setSiteStatus(e.target.value)}>
                <option value="EXPLORING">Evaluating potential locations</option>
                <option value="CONTROLLED">Site control secured</option>
              </select>
            </label>
            <label>Required facility power (MW) <span className="scout-hint">Total facility draw, not just IT MW</span>
              <input type="number" inputMode="decimal" min=".1" max="10000" step=".1" value={requiredMw} onChange={(e) => setRequiredMw(e.target.value)} placeholder="e.g. 25" required />
            </label>
            <label>Target power / commissioning date
              <input value={targetDate} onChange={(e) => setTargetDate(e.target.value)} minLength={2} maxLength={80} placeholder="e.g. Q3 2028" required />
            </label>
            <label>Serving utility <span className="scout-hint">Optional / unknown is okay</span>
              <input value={utility} onChange={(e) => setUtility(e.target.value)} maxLength={160} placeholder="e.g. PSEG or Not sure" />
            </label>
            <label>Electricity market <span className="scout-hint">Optional / self-reported</span>
              <select value={isoRto} onChange={(e) => setIsoRto(e.target.value)}>
                <option value="">Unknown / not sure</option>
                {MARKETS.map((market) => <option key={market} value={market}>{market}</option>)}
              </select>
            </label>
            <label>Utility-documented usable MW <span className="scout-hint">Leave blank if unknown</span>
              <input type="number" inputMode="decimal" min="0" max="10000" step=".1" value={supplyMw} onChange={(e) => setSupplyMw(e.target.value)} placeholder="Unknown" />
            </label>
            <label className="check scout-span scout-check"><input type="checkbox" checked={isSupplyDocumented} onChange={(e) => setIsSupplyDocumented(e.target.checked)} /> I have documentation supporting the entered utility capacity by the target date (EcoXchange has not reviewed it).</label>
            <div className="scout-span scout-actions"><button className="btn btn-primary" type="submit">Run preliminary screen →</button><span>Free · Around 2 minutes</span></div>
          </form>

          <aside className="scout-side">
            <span className="label">Independent research / Public maps</span>
            <h3>Explore before you commit.</h3>
            <p>Use existing mapping tools to see publicly mapped transmission infrastructure. Open them separately and return here to request a verified technical review.</p>
            <a className="scout-research-link" href="https://www.wpptx.org/" target="_blank" rel="noopener noreferrer">Explore North American transmission map ↗</a>
            <a className="scout-research-link" href="https://openinframap.org/" target="_blank" rel="noopener noreferrer">Explore Open Infrastructure Map ↗</a>
            <a className="scout-research-link" href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(location || "United States")} target="_blank" rel="noopener noreferrer">Find candidate location on OpenStreetMap ↗</a>
            <p className="scout-fineprint">Third-party maps may be incomplete or outdated. Mapped lines and substations do not establish available service, upgrade cost, energization timing, water rights, fiber, land suitability, or permission to build.</p>
          </aside>
        </div>
      </section>

      {result && <section className="scout-results" id="site-scout-results" aria-live="polite" aria-labelledby="scout-results-title">
        <div className="section-header"><span className="label section-num">§ Screening result</span><h2 className="section-title" id="scout-results-title">Your power-readiness snapshot.</h2></div>
        <p className="scout-intro">{location} · {requiredMw} MW · Target {targetDate}</p>
        <div className="scout-result-banner">
          <div><span className="label">Preliminary · Visitor-supplied information</span><h3>{result.headline}</h3></div>
          <div className="scout-bridge">
            <span className="label">Reported MW shortfall</span>
            <strong>{result.bridgeMw === null ? "Unknown" : result.bridgeMw.toLocaleString() + " MW"}</strong>
            <small>{result.bridgeMw === null ? "Requires utility confirmation" : "Arithmetic only; not independently verified"}</small>
          </div>
        </div>
        <div className="scout-checklist">{result.checks.map((check) => <div className="scout-checkrow" key={check.label}>
          <div><span className={"scout-status " + (check.status === "PROVIDED" ? "scout-provided" : "scout-unknown")}>{check.status === "PROVIDED" ? "Visitor input" : "To verify"}</span><h4>{check.label}</h4></div>
          <p>{check.detail}</p>
        </div>)}</div>
        <p className="scout-legal">Not a feasibility study or grid availability determination. Utility studies, load service agreements, engineering, tariff rules, permits, and market access control actual delivery. EcoXchange does not guarantee energization, service capacity, financing, or savings.</p>

        <div className="scout-conversion">
          <div><span className="label">Next step / Power Access Plan</span><h3>Want us to examine this opportunity?</h3><p>Request a preliminary review of the site, MW requirement, and unanswered utility questions. We'll reach out if the project fits our power-development focus.</p></div>
          {submissionId ? <div className="network-success" role="status"><h3>Request received.</h3><p>Thank you. Your reference is <strong>{submissionId}</strong>.</p><Link className="btn btn-outline" href="/">Back to EcoXchange</Link></div> :
            <form className="network-form scout-lead-form" onSubmit={submitLead}>
              <label>Name<input name="contactName" autoComplete="name" minLength={2} maxLength={120} required /></label>
              <label>Work email<input name="workEmail" type="email" autoComplete="email" maxLength={320} required /></label>
              <label>Company<input name="company" autoComplete="organization" minLength={2} maxLength={160} required /></label>
              <label>Title / role<input name="role" autoComplete="organization-title" maxLength={120} /></label>
              <label className="check scout-span scout-check"><input name="consent" type="checkbox" required /> I agree EcoXchange may contact me about this project. See our <Link href="/privacy">privacy policy</Link>.</label>
              <label className="scout-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              {error && <p className="scout-span form-error" role="alert">{error}</p>}
              <div className="scout-span scout-actions"><button className="btn btn-lime" disabled={submitting} type="submit">{submitting ? "Saving…" : "Request preliminary review →"}</button><Link className="scout-other-link" href="/power-gap">Have a site with a confirmed gap? Start detailed intake →</Link></div>
            </form>
          }
        </div>
      </section>}
    </main>
    <footer><div className="footer-inner"><span className="footer-brand">EcoXchange</span><span className="footer-meta">Site Scout · Preliminary, not utility-verified</span><Link href="/privacy" className="footer-meta">Privacy</Link></div></footer>
  </div>;
}
