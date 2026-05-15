import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Confidence = "KNOWN" | "ESTIMATED" | "MARKET_PROXY";

const LABEL: Record<Confidence, string> = {
  KNOWN: "Known",
  ESTIMATED: "Estimated",
  MARKET_PROXY: "Market proxy",
};

const HELP: Record<Confidence, string> = {
  KNOWN: "Sourced from contracted data or recorded operational results.",
  ESTIMATED: "Modeled from physical assumptions (capacity, irradiance, industry averages).",
  MARKET_PROXY: "Derived from market reference prices (CAISO hub, LevelTen P25, jurisdiction benchmark).",
};

export function ConfidenceBadge({
  confidence,
  source,
  className,
}: {
  confidence: Confidence;
  source?: string;
  className?: string;
}) {
  const variant: "default" | "outline" | "secondary" =
    confidence === "KNOWN" ? "default" : confidence === "MARKET_PROXY" ? "secondary" : "outline";

  const ariaLabel = source ? `${LABEL[confidence]} — ${source}` : LABEL[confidence];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          className={className}
          data-testid={`confidence-${confidence}`}
          aria-label={ariaLabel}
        >
          {LABEL[confidence]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs max-w-xs">
          <div className="font-semibold">{LABEL[confidence]}</div>
          <div className="text-muted-foreground mt-1">{HELP[confidence]}</div>
          {source && <div className="mt-1 font-mono text-[10px]">{source}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
