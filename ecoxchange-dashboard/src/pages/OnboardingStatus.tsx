import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchStatus } from "../data/onboarding.js";
import type { StatusResponse } from "../utils/onboarding-types.js";
import { Shimmer } from "../components/Skeleton.js";

const STAGES: Array<{ key: StatusResponse["status"]; label: string }> = [
  { key: "submitted", label: "Submitted" },
  { key: "validating", label: "Validating location & credentials" },
  { key: "backtesting", label: "Running 12-month satellite backtest" },
  { key: "reconciling", label: "Reconciling with inverter data" },
  { key: "report_ready", label: "Report ready" },
];

function stageIndex(status: StatusResponse["status"]): number {
  const i = STAGES.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  if (status === "rejected") return -1;
  return STAGES.length;
}

export function OnboardingStatus() {
  const { id = "" } = useParams();
  const [state, setState] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await fetchStatus(id);
        if (cancelled) return;
        setState(s);
        if (s.status === "report_ready") {
          navigate(`/onboard/report/${id}`);
        }
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      }
    };
    void tick();
    const handle = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [id, navigate]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/onboard"
          className="text-medGreen hover:text-darkBg transition-colors duration-150"
        >
          ← Back to onboarding
        </Link>
        <div className="rounded-md bg-amber-50 border border-flagAmber/40 px-4 py-3 text-flagAmber">
          {error}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-9 w-72" />
        <Shimmer className="h-4 w-96 max-w-full" />
        <Shimmer className="h-40 w-full" />
      </div>
    );
  }

  const current = stageIndex(state.status);
  const rejected = state.status === "rejected";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl text-darkBg">
          Processing your submission
        </h1>
        <p className="text-textMuted mt-1">Submission {id}</p>
      </div>

      <div className="bg-white rounded-lg border border-paleGreen/60 p-6">
        <ol className="space-y-3">
          {STAGES.map((s, i) => {
            const done = i < current || state.status === "report_ready";
            const active = i === current && !rejected;
            return (
              <li key={s.key} className="flex items-center gap-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-accentBrt text-white"
                      : active
                        ? "bg-medGreen text-white animate-pulse"
                        : "bg-paleGreen/60 text-textMuted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    active
                      ? "text-textDark font-medium"
                      : done
                        ? "text-textDark"
                        : "text-textMuted"
                  }
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        {rejected ? (
          <div className="mt-6 rounded-md bg-amber-50 border border-flagAmber/40 px-4 py-3 text-flagAmber">
            Submission rejected: {state.notes ?? "unknown reason"}
          </div>
        ) : null}
        {state.status === "report_ready" ? (
          <div className="mt-6">
            <Link
              to={`/onboard/report/${id}`}
              className="rounded-md bg-medGreen text-white px-4 py-2 hover:bg-darkBg transition-colors duration-150"
            >
              View Report →
            </Link>
          </div>
        ) : null}
      </div>

      <details className="text-sm text-textMuted">
        <summary className="cursor-pointer hover:text-textDark">
          History
        </summary>
        <ul className="mt-2 space-y-1">
          {state.status_history.map((h, i) => (
            <li key={i}>
              <span className="font-mono">{h.ts}</span> — {h.status}
              {h.note ? `: ${h.note}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
