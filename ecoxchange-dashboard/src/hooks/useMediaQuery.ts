import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. SSR-safe: returns false when `window` is
 * unavailable, and re-evaluates on mount so hydration converges.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // Sync in case the query changed between render and effect.
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Convenience hooks keyed to the Tailwind breakpoints (md=768, lg=1024).
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () =>
  useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/**
 * True on devices with a real hover pointer (mouse/trackpad). Used to gate
 * hover-only affordances; touch devices get tap-to-expand patterns instead.
 */
export const useHoverCapable = () =>
  useMediaQuery("(hover: hover) and (pointer: fine)");
