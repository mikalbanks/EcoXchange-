import { MetricLabel } from "./MetricExplainer.js";

interface Props {
  obs: number;
  confidencePct?: number;
  n?: number;
  className?: string;
}

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
      OBS. {obs} -{" "}
      <MetricLabel metric="confidence_score">
        {confidencePct.toFixed(2)}% confidence
      </MetricLabel>{" "}
      - N = {n.toLocaleString("en-US")} HRS
    </p>
  );
}
