import type { BacktestRequest } from "@shared/developer-backtest";

/**
 * In-memory handoff for a freshly-submitted intake form. The wizard sets this
 * then navigates to /developer/backtest/new, which consumes it to start the
 * SSE run. Kept in module memory (SPA navigation preserves it); not persisted.
 */
let pending: BacktestRequest | null = null;

export function setPendingBacktest(request: BacktestRequest): void {
  pending = request;
}

export function takePendingBacktest(): BacktestRequest | null {
  const r = pending;
  pending = null;
  return r;
}
