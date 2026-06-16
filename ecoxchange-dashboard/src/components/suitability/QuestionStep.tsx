import { OptionCard } from "./OptionCard.js";
import type { SuitabilityQuestion } from "../../types/suitability.js";

type AnswerValue = string | string[] | boolean | undefined;

interface Props {
  question: SuitabilityQuestion;
  value: AnswerValue;
  onChange: (value: string | string[] | boolean) => void;
}

export function QuestionStep({ question, value, onChange }: Props) {
  function isSelected(optValue: string): boolean {
    if (question.type === "multi_select") {
      return Array.isArray(value) && value.includes(optValue);
    }
    if (question.type === "boolean") {
      return value !== undefined && String(value) === optValue;
    }
    return value === optValue;
  }

  function handleSelect(optValue: string) {
    if (question.type === "multi_select") {
      const arr = Array.isArray(value) ? value : [];
      onChange(
        arr.includes(optValue)
          ? arr.filter((v) => v !== optValue)
          : [...arr, optValue],
      );
    } else if (question.type === "boolean") {
      onChange(optValue === "true");
    } else {
      onChange(optValue);
    }
  }

  return (
    <div>
      <h2 className="font-heading text-2xl text-darkBg">{question.question}</h2>
      {question.subtitle ? (
        <p className="mt-2 text-sm text-textMuted">{question.subtitle}</p>
      ) : null}
      <div className="mt-6 grid grid-cols-1 gap-3">
        {question.options.map((opt) => (
          <OptionCard
            key={opt.value}
            option={opt}
            selected={isSelected(opt.value)}
            onSelect={() => handleSelect(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}
