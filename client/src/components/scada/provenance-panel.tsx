import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database, ShieldCheck, Clock, Layers } from "lucide-react";

export interface ScadaProvenance {
  sourceType: string;
  providerName: string | null;
  dataQuality: string;
  lastSyncAt: string | null;
  verificationStatus: string;
  recordCount: number;
}

const qualityColors: Record<string, string> = {
  HIGH: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  LOW: "bg-red-500/20 text-red-400 border-red-500/50",
  UNKNOWN: "bg-muted text-muted-foreground border-muted",
};

const verificationColors: Record<string, string> = {
  VERIFIED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  AUTOMATED: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  SELF_REPORTED: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  UNVERIFIED: "bg-muted text-muted-foreground border-muted",
};

interface ProvenancePanelProps {
  provenance: ScadaProvenance;
  compact?: boolean;
}

function formatSourceType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1 hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProvenancePanel({ provenance, compact = false }: ProvenancePanelProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="provenance-compact">
        <Badge variant="outline" className={cn("gap-1 text-[10px] border", verificationColors[provenance.verificationStatus] || verificationColors.UNVERIFIED)}>
          <ShieldCheck className="h-2.5 w-2.5" />
          {provenance.verificationStatus.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline" className={cn("gap-1 text-[10px] border", qualityColors[provenance.dataQuality] || qualityColors.UNKNOWN)}>
          {provenance.dataQuality}
        </Badge>
        {provenance.providerName && (
          <span className="text-muted-foreground">{provenance.providerName}</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2" data-testid="provenance-panel">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Provenance</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p className="font-medium text-xs">{formatSourceType(provenance.sourceType)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Verification</p>
            <Badge variant="outline" className={cn("text-[10px] border mt-0.5", verificationColors[provenance.verificationStatus] || verificationColors.UNVERIFIED)}>
              {provenance.verificationStatus.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Last Sync</p>
            <p className="font-medium text-xs">{provenance.lastSyncAt ? formatRelativeTime(provenance.lastSyncAt) : "N/A"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="font-medium text-xs">{provenance.recordCount.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {provenance.providerName && (
        <p className="text-xs text-muted-foreground">Provider: <span className="font-medium text-foreground">{provenance.providerName}</span></p>
      )}
    </div>
  );
}
