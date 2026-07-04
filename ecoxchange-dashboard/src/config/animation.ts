// Motion tokens (Spec 03): timing functions, durations, and stagger used by
// the count-up hook, page transitions, and hover states.
export const animation = {
  easing: {
    standard: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    decelerate: "cubic-bezier(0.0, 0.0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0.0, 1, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  duration: {
    instant: "100ms",
    fast: "200ms",
    standard: "300ms",
    slow: "500ms",
    emphasis: "800ms",
  },
  stagger: "50ms",
} as const;
