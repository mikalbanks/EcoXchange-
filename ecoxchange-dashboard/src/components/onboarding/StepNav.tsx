interface Props {
  current: number; // 1-indexed
  total: number;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  submitting?: boolean;
}

export function StepNav({
  current,
  total,
  onBack,
  onNext,
  nextLabel = "Next →",
  nextDisabled,
  submitting,
}: Props) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        className="text-medGreen hover:text-darkBg disabled:text-textMuted transition-colors duration-150"
        onClick={onBack}
        disabled={!onBack || submitting}
      >
        ← Back
      </button>
      <div className="text-sm text-textMuted">
        Step {current} of {total}
      </div>
      <button
        type="button"
        className="rounded-md bg-medGreen text-white px-4 py-2 hover:bg-darkBg disabled:bg-textMuted disabled:cursor-not-allowed transition-colors duration-150"
        onClick={onNext}
        disabled={nextDisabled || submitting || !onNext}
      >
        {submitting ? "Submitting…" : nextLabel}
      </button>
    </div>
  );
}
