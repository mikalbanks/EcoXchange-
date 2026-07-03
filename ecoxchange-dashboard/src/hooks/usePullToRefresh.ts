import { useEffect, useRef, useState } from "react";

const THRESHOLD_PX = 80; // pull distance that triggers a refresh
const RESISTANCE = 0.5; // finger travel -> indicator travel damping
const MAX_PULL_PX = 120;

interface Options {
  /** Gate: e.g. only in Supabase/live mode on a mobile viewport. */
  enabled: boolean;
  onRefresh: () => Promise<unknown>;
}

/**
 * Dependency-free pull-to-refresh for a document-scrolled page.
 *
 * Attach `containerRef` to the page root. Touch listeners are registered
 * natively (non-passive) because React's synthetic touchmove cannot reliably
 * preventDefault, and we must suppress native scroll/PTR only while a pull
 * gesture is actually in progress.
 */
export function usePullToRefresh({ enabled, onRefresh }: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startY: 0, pulling: false });
  const busy = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (busy.current || window.scrollY > 0) return;
      state.current = { startY: e.touches[0].clientY, pulling: true };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!state.current.pulling || busy.current) return;
      const dy = e.touches[0].clientY - state.current.startY;
      if (dy <= 0 || window.scrollY > 0) {
        setPullPx(0);
        return;
      }
      // Actively pulling downward from the top: claim the gesture.
      e.preventDefault();
      setPullPx(Math.min(MAX_PULL_PX, dy * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (!state.current.pulling) return;
      state.current.pulling = false;
      setPullPx((current) => {
        if (current >= THRESHOLD_PX && !busy.current) {
          busy.current = true;
          navigator.vibrate?.(10);
          setRefreshing(true);
          void onRefresh().finally(() => {
            busy.current = false;
            setRefreshing(false);
            setPullPx(0);
          });
          return THRESHOLD_PX * RESISTANCE + 20; // hold indicator while refreshing
        }
        return 0;
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, onRefresh]);

  return { containerRef, pullPx, refreshing };
}
