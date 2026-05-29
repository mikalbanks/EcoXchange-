interface Props {
  obs: number;
  confidencePct?: number;
  n?: number;
  className?: string;
}

/** Spec §1.3: "OBS. 84 · 99.74% CONFIDENCE · N = 8,760 HRS". */
export function ConfidenceAnnotation({
  obs,
  confidencePct = 99.74,
  n = 8760,
  className = "",
}: Props) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-tag text-eco-text-muted ${className}`}
    >
      OBS. {obs} · {confidencePct.toFixed(2)}% CONFIDENCE · N = {n.toLocaleString("en-US")} HRS
    </p>
  );
}
