import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * CSS-only route transition (Spec 03 §4.2, framer-motion fallback posture):
 * keying the wrapper on the pathname re-mounts children on navigation, which
 * replays the page-enter animation (300ms fade + 8px rise, decelerate).
 * Exit animations are intentionally omitted — CSS cannot delay unmount.
 * The global prefers-reduced-motion rule collapses the animation to instant.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
