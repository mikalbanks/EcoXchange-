import { useAnimateNumber } from "../../hooks/useAnimateNumber.js";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
  /** Spec 03: start the count-up on first viewport entry instead of on mount. */
  startOnView?: boolean;
}

// Renders a numeric value with a count-up animation (easeOutQuart). The
// formatter (e.g. formatUsd, formatPct) is applied to the in-flight animated
// value so the number reads correctly the whole way up. With startOnView the
// animation waits for the element to scroll into view (runs once).
export function AnimatedNumber({ value, format, duration, startOnView }: Props) {
  const { value: animated, ref } = useAnimateNumber(value, duration, {
    startOnView,
  });
  return <span ref={ref}>{format(animated)}</span>;
}
