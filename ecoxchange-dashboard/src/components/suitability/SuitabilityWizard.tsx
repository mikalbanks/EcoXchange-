import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProgressBar } from "./ProgressBar.js";
import { QuestionStep } from "./QuestionStep.js";
import { SUITABILITY_QUESTIONS } from "../../config/suitability-questions.js";
import type { SuitabilityAnswers } from "../../types/suitability.js";

type AnswerMap = Partial<Record<keyof SuitabilityAnswers, string | string[] | boolean>>;

interface Props {
  onComplete: (answers: SuitabilityAnswers) => void;
}

export function SuitabilityWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({ impact_priorities: [] });

  const question = SUITABILITY_QUESTIONS[step];
  const isLast = step === SUITABILITY_QUESTIONS.length - 1;
  const value = answers[question.field];

  // multi-select is optional; single/boolean require a choice to advance.
  const answered =
    question.type === "multi_select" ? true : value !== undefined;

  function setValue(v: string | string[] | boolean) {
    setAnswers((prev) => ({ ...prev, [question.field]: v }));
  }

  function next() {
    if (!answered) return;
    if (isLast) {
      onComplete({
        impact_priorities: [],
        solar_experience: false,
        ...answers,
      } as SuitabilityAnswers);
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">
          Investor Profile
        </div>
        <div className="mt-2">
          <ProgressBar current={step + 1} total={SUITABILITY_QUESTIONS.length} />
        </div>
      </div>

      <QuestionStep question={question} value={value} onChange={setValue} />

      <div className="flex items-center justify-between border-t border-paleGreen/50 pt-5">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-darkBg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="inline-flex items-center gap-1 rounded-lg bg-medGreen px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? "See Recommendations" : "Next"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
