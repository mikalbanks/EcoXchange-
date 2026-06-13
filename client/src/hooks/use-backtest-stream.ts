import { useCallback, useRef, useState } from "react";
import type {
  BacktestCompletePayload,
  BacktestProgressEvent,
  BacktestRequest,
  MonthlyBacktestResult,
} from "@shared/developer-backtest";

export type BacktestStreamStatus =
  | "idle"
  | "streaming"
  | "complete"
  | "error";

interface BacktestStreamState {
  status: BacktestStreamStatus;
  progressPct: number;
  message: string;
  months: MonthlyBacktestResult[];
  result: BacktestCompletePayload | null;
  error: string | null;
}

const INITIAL: BacktestStreamState = {
  status: "idle",
  progressPct: 0,
  message: "",
  months: [],
  result: null,
  error: null,
};

/**
 * Drives a Server-Sent-Events backtest. Native EventSource can't POST a body,
 * so we POST the project and read the SSE stream off the fetch ReadableStream,
 * parsing `event:`/`data:` frames manually.
 */
export function useBacktestStream() {
  const [state, setState] = useState<BacktestStreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  const start = useCallback(async (request: BacktestRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...INITIAL, status: "streaming" });

    try {
      const res = await fetch("/api/developer/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          handleFrame(frame, setState);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Backtest failed",
      }));
    }
  }, []);

  return { ...state, start, reset };
}

function handleFrame(
  frame: string,
  setState: React.Dispatch<React.SetStateAction<BacktestStreamState>>,
) {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  if (event === "progress") {
    const p = payload as BacktestProgressEvent;
    setState((s) => ({
      ...s,
      progressPct: p.progress_pct,
      message: p.message,
      months: p.month_results ? [...s.months, p.month_results] : s.months,
    }));
  } else if (event === "complete") {
    const result = payload as BacktestCompletePayload;
    setState((s) => ({
      ...s,
      status: "complete",
      progressPct: 100,
      message: "Backtest complete",
      months: result.monthly_results,
      result,
    }));
  } else if (event === "error") {
    const e = payload as { message: string };
    setState((s) => ({ ...s, status: "error", error: e.message }));
  }
}
