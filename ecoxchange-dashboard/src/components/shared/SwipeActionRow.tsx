import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useHoverCapable } from "../../hooks/useMediaQuery.js";

const ACTION_WIDTH_PX = 96;
const SNAP_OPEN_PX = 48;

/**
 * Swipe-left-to-reveal quick action, touch devices only. On hover-capable
 * devices the wrapper is inert and simply renders its children.
 *
 * The action layer sits behind the content; the content translates with the
 * finger (clamped to the action width), snaps open past the halfway point,
 * and closes on tap or when a new swipe starts elsewhere.
 */
export function SwipeActionRow({
  action,
  children,
}: {
  /** The revealed quick action (already sized ~96px wide). */
  action: ReactNode;
  children: ReactNode;
}) {
  const hoverCapable = useHoverCapable();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const origin = useRef<{ x: number; y: number; base: number } | null>(null);

  if (hoverCapable) {
    return <>{children}</>;
  }

  const onTouchStart = (e: React.TouchEvent) => {
    origin.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      base: offset,
    };
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!origin.current) return;
    const dx = e.touches[0].clientX - origin.current.x;
    const dy = e.touches[0].clientY - origin.current.y;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll wins
    setOffset(Math.min(0, Math.max(-ACTION_WIDTH_PX, origin.current.base + dx)));
  };

  const onTouchEnd = () => {
    origin.current = null;
    setDragging(false);
    setOffset((o) => (o <= -SNAP_OPEN_PX ? -ACTION_WIDTH_PX : 0));
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: ACTION_WIDTH_PX }}
      >
        {action}
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClick={() => {
          if (offset !== 0) setOffset(0);
        }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
