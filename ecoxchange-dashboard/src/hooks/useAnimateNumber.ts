import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Count-up animation for stat values. Eases from 0 to `target` over `duration`
// ms on mount / when the target changes. Skips straight to the final value when
// the user prefers reduced motion. Returns the current animated number.
export function useAnimateNumber(target: number, duration = 800): number {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0 || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}
