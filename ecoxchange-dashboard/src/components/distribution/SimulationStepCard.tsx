import type { ReactNode } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { activeNetwork } from "../../config/contracts.js";
import type { StepState } from "../../lib/distribution/executor.js";

interface Props {
  stepNumber: number;
  title: string;
  state: StepState;
  /** Live runs link tx hashes to BaseScan; simulated runs must not. */
  isLive: boolean;
  children?: ReactNode;
}

/**
 * One stage of the 3-step distribution flow. Pending steps are muted; the
 * active step carries an accent border + spinner; complete steps show the
 * check plus tx metadata (hash / block / gas) when the step touched chain
 * state. Simulated tx hashes are labeled SIMULATED and deliberately not
 * linked — they do not exist on BaseScan until contracts deploy.
 */
export function SimulationStepCard({ stepNumber, title, state, isLive, children }: Props) {
  const { status } = state;
  const seconds =
    state.startedAt && state.completedAt
      ? ((state.completedAt - state.startedAt) / 1000).toFixed(1)
      : null;

  return (
    <section
      aria-label={`Step ${stepNumber}: ${title}`}
      data-status={status}
      className={`border bg-white p-5 transition-all duration-300 ${
        status === "active"
          ? "border-accentBrt shadow-md"
          : status === "complete"
            ? "border-medGreen/40"
            : status === "error"
              ? "border-statusError/60"
              : "border-darkBg/10 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-darkBg">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center border font-mono text-[11px] ${
              status === "complete"
                ? "border-medGreen bg-medGreen text-white"
                : status === "active"
                  ? "border-accentBrt text-darkBg"
                  : "border-darkBg/20 text-textMuted"
            }`}
          >
            {status === "complete" ? <Check className="h-3.5 w-3.5" /> : stepNumber}
          </span>
          Step {stepNumber}: {title}
        </h2>

        {status === "active" ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-medGreen">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Running
          </span>
        ) : status === "complete" ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-medGreen">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Complete{seconds ? ` · ${seconds}s` : ""}
          </span>
        ) : status === "error" ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-statusError">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Failed
          </span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-textMuted">
            Pending
          </span>
        )}
      </div>

      <div className="mt-4">{children}</div>

      {state.txHash ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-darkBg/10 pt-3 font-mono text-xs text-textMuted">
          <span className="tabular-nums">
            Tx: {state.txHash.slice(0, 10)}…{state.txHash.slice(-6)}
          </span>
          {state.blockNumber ? (
            <span className="tabular-nums">Block: {state.blockNumber.toLocaleString("en-US")}</span>
          ) : null}
          {state.gasUsed ? <span className="tabular-nums">Gas: {state.gasUsed}</span> : null}
          {isLive ? (
            <a
              href={`${activeNetwork.explorerUrl}/tx/${state.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-medGreen underline-offset-2 hover:underline"
            >
              View on BaseScan →
            </a>
          ) : (
            <span
              className="border border-flagAmber/40 bg-flagAmber/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-flagAmber"
              title="Pre-deployment pseudo-hash — becomes a real BaseScan transaction once the demo contracts are deployed"
            >
              Simulated
            </span>
          )}
        </div>
      ) : null}

      {state.error ? (
        <p className="mt-3 border border-statusError/30 bg-statusError/5 p-2 font-mono text-xs text-statusError">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
