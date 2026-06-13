interface MethodologyNoteProps {
  engine?: string;
}

/**
 * Standard methodology disclaimer shown on every results page. Honest framing,
 * not promotional — these are documented estimates, not bankable assessments.
 */
export function MethodologyNote({ engine }: MethodologyNoteProps) {
  const isFallback = !engine || engine.includes("hay_davies");
  return (
    <p className="text-xs leading-relaxed text-muted-foreground" data-testid="text-methodology-note">
      Expected generation is calculated from historical satellite irradiance
      (NASA POWER){" "}
      {isFallback
        ? "using an in-process Hay-Davies transposition model. Cell temperature is estimated from ambient air temperature and plane-of-array irradiance (NOCT model)."
        : "using the pvlib physics engine (Perez transposition, SAPM cell-temperature model)."}{" "}
      Simulated inverter production applies realistic measurement noise to the
      modeled expectation for illustration. These are methodology-documented
      estimates, not bankable energy assessments. Engine: {engine ?? "hay_davies"}.
    </p>
  );
}
