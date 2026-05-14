import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "readiness" | "project" | "interest" | "checklist";
  className?: string;
}

export function StatusBadge({ status, type = "project", className }: StatusBadgeProps) {
  const positive = "bg-primary/15 text-primary border-primary/35";
  const warning = "bg-amber-500/15 text-amber-600 border-amber-500/35";
  const negative = "bg-red-500/15 text-red-600 border-red-500/35";
  const neutral = "bg-muted text-muted-foreground border-border";

  const getVariant = () => {
    const upperStatus = status.toUpperCase();
    
    if (type === "readiness") {
      switch (upperStatus) {
        case "GREEN":
          return positive;
        case "YELLOW":
          return warning;
        case "RED":
          return negative;
        default:
          return neutral;
      }
    }

    if (type === "project") {
      switch (upperStatus) {
        case "APPROVED":
          return positive;
        case "SUBMITTED":
        case "IN_REVIEW":
          return warning;
        case "REJECTED":
          return negative;
        case "DRAFT":
        default:
          return neutral;
      }
    }

    if (type === "interest") {
      switch (upperStatus) {
        case "ACCEPTED_BY_DEV":
          return positive;
        case "SUBMITTED":
          return warning;
        case "DECLINED_BY_DEV":
          return negative;
        case "WITHDRAWN":
          return neutral;
        default:
          return neutral;
      }
    }

    if (type === "checklist") {
      switch (upperStatus) {
        case "VERIFIED":
          return positive;
        case "UPLOADED":
          return "bg-accent/20 text-accent border-accent/40";
        case "MISSING":
          return negative;
        default:
          return neutral;
      }
    }

    return neutral;
  };

  const formatStatus = (s: string) => {
    return s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border", getVariant(), className)}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {formatStatus(status)}
    </Badge>
  );
}
