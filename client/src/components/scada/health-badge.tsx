import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScadaHealthStatus {
  overall: "HEALTHY" | "WARNING" | "CRITICAL" | "NO_DATA";
  dataSource: {
    status: string;
    sourceType: string;
    providerName: string | null;
    lastSyncAt: string | null;
    dataQuality: string;
  };
  checks: Array<{
    name: string;
    status: "PASS" | "WARN" | "FAIL";
    message: string;
  }>;
}

const healthConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string; badgeClass: string }> = {
  HEALTHY: { icon: CheckCircle, color: "text-emerald-400", label: "Healthy", badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" },
  WARNING: { icon: AlertTriangle, color: "text-amber-400", label: "Warning", badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/50" },
  CRITICAL: { icon: XCircle, color: "text-red-400", label: "Critical", badgeClass: "bg-red-500/20 text-red-400 border-red-500/50" },
  NO_DATA: { icon: HelpCircle, color: "text-muted-foreground", label: "No Data", badgeClass: "bg-muted text-muted-foreground border-muted" },
};

interface HealthBadgeProps {
  projectId: string;
  size?: "sm" | "md";
  showTooltip?: boolean;
  usePublicApi?: boolean;
}

export function HealthBadge({ projectId, size = "sm", showTooltip = true, usePublicApi = false }: HealthBadgeProps) {
  const basePath = usePublicApi ? "/api/public/projects" : "/api/projects";
  const { data } = useQuery<ScadaHealthStatus>({
    queryKey: [basePath, projectId, "scada", "health"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${projectId}/scada/health`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch health");
      return res.json();
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  if (!data) return null;

  const config = healthConfig[data.overall] || healthConfig.NO_DATA;
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        config.badgeClass,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
      data-testid={`badge-health-${projectId}`}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {config.label}
    </Badge>
  );

  if (!showTooltip || !data.checks.length) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1.5">
          <p className="font-medium text-xs">SCADA Health Checks</p>
          {data.checks.map((check, i) => {
            const statusIcon = check.status === "PASS" ? "text-emerald-400" : check.status === "WARN" ? "text-amber-400" : "text-red-400";
            return (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <Activity className={cn("h-3 w-3 mt-0.5 shrink-0", statusIcon)} />
                <span>{check.name}: {check.message}</span>
              </div>
            );
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
