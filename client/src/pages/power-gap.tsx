import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import "./landing.css";
import "./power-gap.css";

const RESOURCE_OPTIONS = [
  "BESS / battery storage",
  "UPS capacity",
  "Natural-gas generation",
  "Fuel cells",
  "Solar / renewable generation",
  "Flexible compute or other curtailable load",
  "Existing demand response / VPP",
] as const;

export default function PowerGapPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const firmSupplyRaw = String(data.get("firmSupplyMw") || "").trim();
    const permanentPowerDate = String(data.get("permanentPowerDate") || "").trim();

    try {
      const response = await apiRequest("POST", "/api/public/power-gap-intakes", {
        contactName: String(data.get("contactName") || ""),
        workEmail: String(data.get("workEmail") || ""),
        company: String(data.get("company") || ""),
        role: String(data.get("role") || ""),
        siteName: String(data.get("siteName") || ""),
        siteLocation: String(data.get("siteLocation") || ""),
        utility: String(data.get("utility") || ""),
        isoRto: String(data.get("isoRto") || ""),
        requiredFirmMw: Number(data.get("requiredFirmMw")),
        firmSupplyMw: firmSupplyRaw ? Number(firmSupplyRaw) : undefined,
        targetPowerDate: String(data.get("targetPowerDate") || ""),
        permanentPowerDate: permanentPowerDate || undefined,
        constraintType: String(data.get("constraintType") || ""),
        bridgeDuration: String(data.get("bridgeDuration") || ""),
        existingResources: data.getAll("existingResources").map(String),
        reliabilityNotes: String(data.get("reliabilityNotes") || ""),
        notes: String(data.get("notes") || ""),
        consent: data.get("consent") === "on",
        website: String(data.get("website") || ""),
      });

      const result = (await response.json()) as { submissionId?: string };
      setSubmissionId(result.submissionId || "received");
      form.reset();
    } catch (err) {
      console.error("Power-gap intake submission failed:", err);
      setError("We could not save your intake. Please try again or email contact@ecoxchange.net.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="landing-page">
    <header>
      <div className="header-inner">
        <Link href="/" className="brand">
          <span className="brand-name">EcoXchange</span>
          <span className="brand-tag">Power Gap Assessment</span>
        </Link>
        <nav>
          <Link href="/">For Data Centers</Link>
          <Link href="/der-network">DER Network</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
      </div>
    </header>

    <main>
      <section className="hero power-gap-hero">
        <div className="hero-text">
          <div className="label hero-eyebrow">Data-center operators · developers · large-load owners</div>
          <h1 className="hero-headline">Have a power gap?<br/><em>Start with the MW and the date.</em></h1>
          <p className="hero-sub">Share the site, required firm load, target energization or ramp date, and what supply is already expected to be usable. EcoXchange will use those facts to determine whether there is a real bridge requirement before proposing a technology stack.</p>
        </div>
        <div className="power-gap-summary">
          <div className="label">What we calculate</div>
          <div className="equation">
            <span>Required firm load</span>
            <b>−</b>
            <span>Effective firm supply</span>
            <b>=</b>
            <strong>Net bridge requirement</strong>
          </div>
          <p>Requested, queued, studied, or announced capacity does not count as firm until it is usable by the required date.</p>
        </div>
      </section>

      <section className="problem power-gap-intake-section">
        <div className="section-header">
          <span className="label section-num">Power Gap Intake</span>
          <h2 className="section-title">Give us the facts that can prove—or kill—the thesis.</h2>
        </div>

        {submissionId ? (
          <div className="network-success" aria-live="polite">
            <div className="label">Intake received</div>
            <h3>We have the MW/time inputs.</h3>
            <p>We’ll review the load-versus-supply timing and use it to determine the next technical question. Reference: <strong>{submissionId}</strong>.</p>
            <Link href="/" className="btn btn-outline">Return home</Link>
          </div>
        ) : (
          <>
            <p className="problem-intro">You do not need a finished engineering package. If a figure is unknown, say so in the notes. The highest-value inputs are the required MW, when the load must be live, the firm supply expected by that date, and the utility territory.</p>

            <form className="network-form power-gap-form" onSubmit={submit}>
              <div className="form-section-label span-2">Contact</div>
              <label>Full name<input name="contactName" autoComplete="name" required /></label>
              <label>Work email<input type="email" name="workEmail" autoComplete="email" required /></label>
              <label>Company<input name="company" autoComplete="organization" required /></label>
              <label>Role / title<input name="role" autoComplete="organization-title" /></label>

              <div className="form-section-label span-2">Site and power requirement</div>
              <label>Site / campus / project name<input name="siteName" required /></label>
              <label>Site location<input name="siteLocation" placeholder="City, state" required /></label>
              <label>Electric utility / TSP / EDC<input name="utility" placeholder="Utility name or Not sure" required /></label>
              <label>ISO / RTO / market
                <select name="isoRto" defaultValue="">
                  <option value="">Not sure / other</option>
                  <option>ERCOT</option>
                  <option>PJM</option>
                  <option>MISO</option>
                  <option>CAISO</option>
                  <option>NYISO</option>
                  <option>ISO-NE</option>
                  <option>SPP</option>
                </select>
              </label>
              <label>Required firm load (MW)<input type="number" name="requiredFirmMw" min="0.1" max="10000" step="0.1" required /></label>
              <label>Firm / usable supply by that date (MW)<input type="number" name="firmSupplyMw" min="0" max="10000" step="0.1" placeholder="Leave blank if unknown" /></label>
              <label>Target power / ramp date<input type="date" name="targetPowerDate" required /></label>
              <label>Expected full permanent-power date<input type="date" name="permanentPowerDate" /></label>

              <div className="form-section-label span-2">Constraint and duty</div>
              <label>What best describes the issue?
                <select name="constraintType" required defaultValue="">
                  <option value="" disabled>Select</option>
                  <option value="TIMING_MISMATCH">Load ramps before permanent power arrives</option>
                  <option value="CAPACITY_SHORTFALL">Not enough firm MW at the required milestone</option>
                  <option value="RELIABILITY_RESILIENCE">Reliability / resilience requirement</option>
                  <option value="COST_FLEXIBILITY">Power is sufficient; economics / flexibility are the issue</option>
                  <option value="NOT_SURE">Not sure yet</option>
                </select>
              </label>
              <label>Expected constrained duration
                <select name="bridgeDuration" defaultValue="">
                  <option value="">Unknown</option>
                  <option value="UNDER_4_HOURS">Under 4 hours at a time</option>
                  <option value="4_TO_12_HOURS">4–12 hours at a time</option>
                  <option value="INTERMITTENT">Intermittent / seasonal</option>
                  <option value="MULTI_DAY">Near-continuous for days / weeks</option>
                  <option value="MULTI_MONTH">Near-continuous for months / years</option>
                </select>
              </label>

              <fieldset className="span-2">
                <legend>Existing or planned onsite / flexible resources</legend>
                <div className="resource-grid">
                  {RESOURCE_OPTIONS.map((resource) => (
                    <label className="check" key={resource}>
                      <input type="checkbox" name="existingResources" value={resource} />
                      {resource}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="span-2">Reliability / operating requirements
                <textarea name="reliabilityNotes" placeholder="e.g. critical MW, N+1, islanding, maximum interruption, commissioning load, workload flexibility" />
              </label>
              <label className="span-2">What else should we know?
                <textarea name="notes" placeholder="Utility tranche dates, interconnection status, fuel/site limits, customer milestones, or the one fact you still need to confirm." />
              </label>

              <label className="check span-2 consent-line">
                <input type="checkbox" name="consent" required />
                I agree EcoXchange may contact me about this site and its power requirements. Submitting this form does not guarantee interconnection, energization, financing, market access, savings, or a deployable solution.
              </label>

              <label className="power-gap-honeypot" aria-hidden="true">
                Website<input name="website" tabIndex={-1} autoComplete="off" />
              </label>

              {error && <p className="form-error span-2" role="alert">{error}</p>}
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Submit Power Gap"}
                </button>
                <span className="form-help">This intake starts a technical validation—not a generic sales demo.</span>
              </div>
            </form>
          </>
        )}
      </section>
    </main>

    <footer>
      <div className="footer-inner">
        <span className="footer-brand">EcoXchange</span>
        <span className="footer-meta">Distributed power for data centers · © MMXXVI</span>
        <Link href="/privacy" className="footer-meta">Privacy</Link>
      </div>
    </footer>
  </div>;
}
