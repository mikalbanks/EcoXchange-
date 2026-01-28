import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "kyc" | "offering" | "project" | "commitment" | "distribution";
  className?: string;
}

export function StatusBadge({ status, type = "offering", className }: StatusBadgeProps) {
  const getVariant = () => {
    const upperStatus = status.toUpperCase();
    
    // KYC statuses
    if (type === "kyc") {
      switch (upperStatus) {
        case "APPROVED":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "PENDING":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "REJECTED":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        case "NOT_STARTED":
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    // Offering statuses
    if (type === "offering") {
      switch (upperStatus) {
        case "OPEN":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "DRAFT":
          return "bg-muted text-muted-foreground";
        case "CLOSED":
          return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    // Project statuses
    if (type === "project") {
      switch (upperStatus) {
        case "APPROVED":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "UNDER_REVIEW":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "INTAKE":
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    // Commitment statuses
    if (type === "commitment") {
      switch (upperStatus) {
        case "CONFIRMED":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "SUBMITTED":
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "CANCELED":
          return "bg-red-500/20 text-red-400 border-red-500/30";
        default:
          return "bg-muted text-muted-foreground";
      }
    }

    // Distribution statuses
    if (type === "distribution") {
      switch (upperStatus) {
        case "PAID":
          return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        case "PENDING":
        default:
          return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
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
