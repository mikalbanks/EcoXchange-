import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "readiness" | "project" | "interest" | "checklist";
  className?: string;
}

export function StatusBadge({ status, type = "project", className }: StatusBadgeProps) {
  const getVariant = () => {
    const upperStatus = status.toUpperCase();
    
    if (type === "readiness") {
      switch (upperStatus) {
        case "GREEN":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "YELLOW":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "RED":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    if (type === "project") {
      switch (upperStatus) {
        case "APPROVED":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "SUBMITTED":
        case "IN_REVIEW":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "REJECTED":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        case "DRAFT":
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    if (type === "interest") {
      switch (upperStatus) {
        case "ACCEPTED_BY_DEV":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "SUBMITTED":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "DECLINED_BY_DEV":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        case "WITHDRAWN":
          return "bg-muted text-muted-foreground";
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    if (type === "checklist") {
      switch (upperStatus) {
        case "VERIFIED":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "UPLOADED":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        case "MISSING":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    return "bg-muted text-muted-foreground";
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
