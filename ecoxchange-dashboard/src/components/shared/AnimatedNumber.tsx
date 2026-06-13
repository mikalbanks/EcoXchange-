import { useAnimateNumber } from "../../hooks/useAnimateNumber.js";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

// Renders a numeric value with a count-up animation on mount. The formatter
// (e.g. formatUsd, formatPct) is applied to the in-flight animated value so the
// number reads correctly the whole way up.
export function AnimatedNumber({ value, format, duration }: Props) {
  const animated = useAnimateNumber(value, duration);
  return <>{format(animated)}</>;
}
