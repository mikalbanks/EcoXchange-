import { AlertTriangle } from "lucide-react";

interface Props {
  message?: string;
  onRetry?: () => void;
}

// Human-readable error card. Never surfaces raw error strings — copy is
// reassuring and offers a retry. Used by pages when a data load rejects.
export function ErrorState({
  message = "We couldn’t load this data. This might be a temporary issue — try again in a moment.",
  onRetry,
}: Props) {
  return (
    <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-xl p-8 text-center flex flex-col items-center gap-3">
      <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-red-600" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-xl text-darkBg">Something went wrong</h3>
      <p className="text-sm text-textMuted max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center rounded-md bg-medGreen px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-darkBg"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
