import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Defer rendering children until the placeholder scrolls near the viewport
 * (IntersectionObserver, 200px rootMargin, one-shot). Environments without
 * IntersectionObserver mount immediately.
 */
export function LazyMount({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder: ReactNode;
}) {
  const anchor = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (visible || !anchor.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, [visible]);

  if (visible) return <>{children}</>;
  return <div ref={anchor}>{placeholder}</div>;
}
