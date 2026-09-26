import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle, ShieldCheck } from "./icons";
import { ButtonLink, trackEvent } from "./ui";

const initialForm = { firstName: "", lastName: "", email: "", company: "", title: "", location: "", projectStage: "", plannedMw: "", securedMw: "", energization: "", powerArrival: "", utilityStatus: "", gapHours: "", reliability: "", flexibleLoad: "", resources: "", constraint: "" };
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAB8KnRYXW3_8kHfO";
const contactRequired = { firstName: "Enter your first name.", lastName: "Enter your last name.", email: "Enter your work email.", company: "Enter your company." };
const siteRequired = { location: "Enter the site location.", projectStage: "Select the project stage.", constraint: "Describe the primary power constraint." };
function validate(form, step) {
  const errors = {};
  for (const [name, message] of Object.entries(step === 1 ? contactRequired : siteRequired)) if (!form[name].trim()) errors[name] = message;
  if (step === 1 && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address, such as name@company.com.";
  if (step === 2 && form.plannedMw.trim() && (!/^\d+(\.\d+)?$/.test(form.plannedMw.trim()) || Number(form.plannedMw) <= 0)) errors.plannedMw = "Enter a required load greater than zero, or leave this blank.";
  if (step === 2 && form.securedMw.trim() && (!/^\d+(\.\d+)?$/.test(form.securedMw.trim()) || Number(form.securedMw) < 0)) errors.securedMw = "Enter zero or a positive secured capacity, or leave this blank.";
  if (step === 2 && form.gapHours.trim() && (!/^\d+(\.\d+)?$/.test(form.gapHours.trim()) || Number(form.gapHours) <= 0 || Number(form.gapHours) > 24)) errors.gapHours = "Enter bridge hours between 0 and 24, or leave this blank.";
  return errors;
}
function Field({ name, label, form, update, errors, required, type = "text", full, options, emptyLabel = "Select an option", ...props }) {
  const shared = { id: name, name, value: form[name], onChange: update, required, "aria-invalid": errors[name] ? "true" : undefined, "aria-describedby": errors[name] ? `${name}-error` : undefined, ...props };
  return <div className={`field ${full ? "full" : ""}`}><label htmlFor={name}>{label}{required ? <span aria-hidden="true"> *</span> : <span className="optional"> (optional)</span>}</label>{options ? <select {...shared}><option value="">{emptyLabel}</option>{options.map(x => <option key={x}>{x}</option>)}</select> : type === "textarea" ? <textarea {...shared} rows={3} /> : <input {...shared} type={type} />}{errors[name] && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}</div>;
}
function HumanVerification({ onToken, resetKey }) {
  const container = useRef(null);
  const sitekey = turnstileSiteKey;
  useEffect(() => {
    if (!sitekey) return;
    let widget, active = true;
    const mount = () => {
      if (active && window.turnstile && widget === undefined && container.current) widget = window.turnstile.render(container.current, { sitekey, theme: "light", size: "flexible", action: "site_assessment", callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    };
    let script = document.querySelector("script[data-turnstile]");
    if (!script) { script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.dataset.turnstile = "true"; document.head.appendChild(script); }
    script.addEventListener("load", mount); mount();
    return () => { active = false; script.removeEventListener("load", mount); if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [sitekey, onToken, resetKey]);
  return sitekey ? <div className="verification"><p>Complete the verification to submit.</p><div ref={container} /></div> : null;
}
export function AssessmentPage() {
  const [step, setStep] = useState(1), [form, setForm] = useState(initialForm), [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"), [error, setError] = useState(""), [token, setToken] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [verificationReset, setVerificationReset] = useState(0);
  const heading = useRef(null), sending = useRef(false);
  const lastFocusState = useRef("1:false");
  const succeeded = status === "success";
  useEffect(() => {
    const key = `${step}:${succeeded}`;
    if (lastFocusState.current !== key) { heading.current?.focus(); lastFocusState.current = key; }
  }, [step, succeeded]);
  const update = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setErrors(current => { const next = { ...current }; delete next[name]; return next; });
  };
  const showErrors = issues => { setErrors(issues); requestAnimationFrame(() => document.getElementById(Object.keys(issues)[0])?.focus()); };
  const next = event => { event.preventDefault(); const issues = validate(form, 1); if (Object.keys(issues).length) return showErrors(issues); setErrors({}); setError(""); setStep(2); trackEvent("assessment_started"); };
  const submit = async event => {
    event.preventDefault(); if (sending.current) return;
    const issues = validate(form, 2); if (Object.keys(issues).length) return showErrors(issues);
    if (!token) { setError("Complete the verification before submitting."); return; }
    sending.current = true; setStatus("loading"); setError("");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
      const response = await fetch("/api/assessment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, turnstileToken: token }), signal: controller.signal });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        if ([404, 405, 503].includes(response.status) || (response.ok && result?.ok !== true)) throw new Error("Online submission is currently unavailable. Your details are still here. Try again later or contact contact@ecoxchange.net.");
        if (response.status === 403) throw new Error("Verification could not be completed. Please verify again and retry.");
        throw new Error("Your assessment could not be sent. Your details are still here. Please try again or contact contact@ecoxchange.net.");
      }
      setMeetingUrl(typeof result.meetingUrl === "string" && result.meetingUrl.startsWith("https://") ? result.meetingUrl : "/contact");
      setStatus("success"); trackEvent("assessment_completed", { projectStage: form.projectStage });
    } catch (err) {
      setError(err.name === "AbortError" ? "The request timed out. Your details are still here; please try again." : err instanceof TypeError ? "We could not connect. Check your connection and try again. Your details are still here." : err.message);
      setStatus("idle"); setToken(""); setVerificationReset(n => n + 1);
    } finally { clearTimeout(timeout); sending.current = false; }
  };
  const common = { form, update, errors };
  if (succeeded) return <section className="success-section container"><div className="success-panel"><CheckCircle weight="duotone" aria-hidden="true" /><p className="eyebrow">Power-gap assessment received</p><h1 tabIndex={-1} ref={heading}>A power-gap review is now queued.</h1><p>Thank you, {form.firstName}. Your MW, timing, utility, and site details have been received for review.</p><ButtonLink href={meetingUrl || "/contact"} onClick={() => trackEvent("scheduling_click")}>{meetingUrl.startsWith("https://") ? "Schedule a conversation" : "Contact EcoXchange"}</ButtonLink><a className="text-link" href="/">Return home<ArrowRight aria-hidden="true" /></a></div></section>;
  return <section className="assessment-section"><div className="container assessment-grid"><div className="assessment-intro"><p className="eyebrow">Power-gap assessment</p><h1>Start with the MW and the dates.</h1><p className="lead">Share what you know about required load, firm supply, ramp timing, utility timing, and site constraints. Unknowns are okay; the first job is to identify them.</p><ol className="assessment-progress" aria-label="Assessment steps"><li className={step === 1 ? "current" : "complete"} aria-current={step === 1 ? "step" : undefined}><span>{step === 2 ? <Check aria-hidden="true" /> : "1"}</span><div><strong>Your details</strong><small>Who we should connect with</small></div></li><li className={step === 2 ? "current" : ""} aria-current={step === 2 ? "step" : undefined}><span>2</span><div><strong>Power-gap context</strong><small>MW, timing, resources, and constraints</small></div></li></ol><div className="assessment-help"><ShieldCheck aria-hidden="true" /><p>A starting point for a technical conversation. No guarantee of power, financing, interconnection, market participation, or savings.</p></div></div><div className="assessment-form-wrap"><div className="form-heading"><p className="eyebrow">Step {step} of 2</p><h2 tabIndex={-1} ref={heading}>{step === 1 ? "Tell us about yourself." : "Define the power gap."}</h2><p>{step === 1 ? "Use your business contact details." : "Share what is known today. Optional details can be confirmed during the technical audit."} Fields marked * are required.</p></div><form noValidate onSubmit={step === 1 ? next : submit} aria-busy={status === "loading"}><fieldset disabled={status === "loading"}><legend className="sr-only">{step === 1 ? "Contact details" : "Site details"}</legend><div className="form-grid">{step === 1 ? <>
      <Field {...common} name="firstName" label="First name" autoComplete="given-name" maxLength={80} required />
      <Field {...common} name="lastName" label="Last name" autoComplete="family-name" maxLength={80} required />
      <Field {...common} name="email" label="Work email" type="email" autoComplete="email" maxLength={160} full required />
      <Field {...common} name="company" label="Company" autoComplete="organization" maxLength={160} full required />
      <Field {...common} name="title" label="Role / title" autoComplete="organization-title" maxLength={120} full />
    </> : <>
      <Field {...common} name="location" label="Site location" placeholder="City, state" maxLength={180} full required />
      <Field {...common} name="projectStage" label="Project stage" options={["Site evaluation", "Design / development", "Operating site", "Expansion planning"]} emptyLabel="Select stage" full required />
      <Field {...common} name="plannedMw" label="Required firm load at first ramp (MW)" inputMode="decimal" maxLength={30} />
      <Field {...common} name="securedMw" label="Firm utility MW available by that ramp" inputMode="decimal" maxLength={30} />
      <Field {...common} name="energization" label="First ramp / occupancy" type="month" />
      <Field {...common} name="powerArrival" label="Next firm power delivery" type="month" />
      <Field {...common} name="utilityStatus" label="Utility / service status" options={["No firm date yet", "Early utility discussion", "Application submitted", "Study / engineering in progress", "Service agreement / committed date", "Existing operating service"]} emptyLabel="Select utility status" full />
      <Field {...common} name="gapHours" label="Bridge requirement (hours per day)" inputMode="decimal" maxLength={30} />
      <Field {...common} name="reliability" label="Reliability requirement" options={["Continuous critical load", "Firm during a defined window", "Interruptible / flexible", "Not yet defined"]} emptyLabel="Select reliability requirement" />
      <Field {...common} name="flexibleLoad" label="Flexible or shiftable load" type="textarea" placeholder="Compute, cooling, charging, or other load that can move or curtail..." maxLength={1500} full />
      <Field {...common} name="resources" label="Existing or planned onsite resources" type="textarea" placeholder="BESS, UPS, generators, fuel cells, solar, microgrid, controls..." maxLength={1500} full />
      <Field {...common} name="constraint" label="Primary power constraint" type="textarea" placeholder="What is missing, delayed, constrained, or preventing the site from ramping?" maxLength={1500} full required />
    </>}</div>{step === 2 && <HumanVerification onToken={setToken} resetKey={verificationReset} />}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions">{step === 2 && <button type="button" className="text-button" onClick={() => { setStep(1); setErrors({}); setError(""); }}>Back</button>}<button className="button button--primary" type="submit" disabled={status === "loading"}>{step === 1 ? "Continue to site context" : status === "loading" ? "Sending assessment..." : "Submit assessment"}<ArrowRight aria-hidden="true" /></button></div></fieldset><p className="form-privacy">By submitting, you agree that EcoXchange may contact you about this site. <a href="/privacy">Read our privacy information.</a></p><p className="sr-only" role="status">{status === "loading" ? "Sending your assessment. Please wait." : ""}</p></form></div></div></section>;
}

