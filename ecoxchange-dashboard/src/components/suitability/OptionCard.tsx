import { Check } from "lucide-react";
import { iconFor } from "./icons.js";
import type { QuestionOption } from "../../types/suitability.js";

interface Props {
  option: QuestionOption;
  selected: boolean;
  onSelect: () => void;
}

// Selectable option card (icon + label + description) with a highlight state.
export function OptionCard({ option, selected, onSelect }: Props) {
  const Icon = iconFor(option.icon);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors duration-150 ${
        selected
          ? "border-medGreen bg-paleGreen/30 ring-1 ring-medGreen"
          : "border-paleGreen/60 bg-white hover:border-medGreen/60"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected ? "bg-medGreen text-white" : "bg-paleGreen/40 text-medGreen"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-darkBg">{option.label}</span>
        <span className="mt-0.5 block text-sm text-textMuted">
          {option.description}
        </span>
      </span>
      {selected ? (
        <Check className="mt-1 h-5 w-5 shrink-0 text-medGreen" />
      ) : null}
    </button>
  );
}
