import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface Options {
  /** Wait for the element (via the returned ref) to enter the viewport before
   *  animating; runs once (Spec 03 count-up behavior). Default false keeps the
   *  original animate-on-mount behavior for existing call sites. */
  startOnView?: boolean;
}

// Count-up animation for stat values. Eases (easeOutQuart) from 0 to `target`
// over `duration` ms — on mount, or on first viewport entry when startOnView
// is set. Skips straight to the final value under prefers-reduced-motion.
export function useAnimateNumber(
  target: number,
  duration = 800,
  { startOnView = false }: Options = {},
): { value: number; ref: React.RefObject<HTMLSpanElement> } {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const [inView, setInView] = useState(!startOnView);
  const frameRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView || inView) return;
    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView, inView]);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion() || duration <= 0 || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutQuart (Spec 03 motion system)
      const eased = 1 - Math.pow(1 - t, 4);
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
  }, [target, duration, inView]);

  return { value, ref: elementRef };
}
