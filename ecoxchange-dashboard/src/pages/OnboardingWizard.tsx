import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DeveloperInfo } from "../components/onboarding/DeveloperInfo.js";
import { ProjectDetails } from "../components/onboarding/ProjectDetails.js";
import { InverterSetup } from "../components/onboarding/InverterSetup.js";
import { OfftakeAndRaise } from "../components/onboarding/OfftakeAndRaise.js";
import { StepNav } from "../components/onboarding/StepNav.js";
import { submitIntake } from "../data/onboarding.js";
import {
  DEFAULT_INTAKE,
  type IntakeForm,
} from "../utils/onboarding-types.js";

const STORAGE_KEY = "ecoxchange.onboarding.form";
const TOTAL_STEPS = 4;

function loadFromStorage(): IntakeForm {
  if (typeof window === "undefined") return DEFAULT_INTAKE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INTAKE;
    return { ...DEFAULT_INTAKE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INTAKE;
  }
}

function validateStep(step: number, form: IntakeForm): string | null {
  if (step === 1) {
    if (form.developer_name.trim().length < 2)
      return "Please enter your name.";
    if (!/^.+@.+\..+/.test(form.developer_email))
      return "Please enter a valid email.";
  }
  if (step === 2) {
    if (form.project_name.trim().length < 2)
      return "Please enter a project name.";
    if (form.latitude < 24 || form.latitude > 50)
      return "Latitude must be within the continental US (24–50°).";
    if (form.longitude < -130 || form.longitude > -60)
      return "Longitude must be within the continental US (-130 to -60°).";
    if (form.capacity_kw_dc < 100 || form.capacity_kw_dc > 20000)
      return "Capacity must be between 100 kW and 20 MW.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.commissioning_date))
      return "Commissioning date must be YYYY-MM-DD.";
  }
  return null;
}

export function OnboardingWizard() {
  const [form, setForm] = useState<IntakeForm>(() => loadFromStorage());
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // sessionStorage may be unavailable in some embeds
    }
  }, [form]);

  const update = (patch: Partial<IntakeForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const next = async () => {
    const err = validateStep(step, form);
    if (err) {
      setError(err);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    // Final submit
    setSubmitting(true);
    try {
      const { submission_id } = await submitIntake(form);
      sessionStorage.removeItem(STORAGE_KEY);
      navigate(`/onboard/status/${submission_id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">
          Developer Onboarding
        </h1>
        <p className="text-textMuted mt-1">
          Get a 12-month production backtest in under 24 hours.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-paleGreen/60 p-6">
        {step === 1 ? <DeveloperInfo form={form} update={update} /> : null}
        {step === 2 ? <ProjectDetails form={form} update={update} /> : null}
        {step === 3 ? <InverterSetup form={form} update={update} /> : null}
        {step === 4 ? <OfftakeAndRaise form={form} update={update} /> : null}
        {error ? (
          <div className="mt-4 rounded-md bg-amber-50 border border-flagAmber/40 px-3 py-2 text-sm text-flagAmber">
            {error}
          </div>
        ) : null}
        <StepNav
          current={step}
          total={TOTAL_STEPS}
          onBack={step > 1 ? back : undefined}
          onNext={next}
          nextLabel={step === TOTAL_STEPS ? "Submit & Run →" : "Next →"}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
