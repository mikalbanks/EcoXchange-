import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Activity, CalendarClock, Database, Search, Signal, Sun } from "lucide-react";

interface QueueProject {
  id: string;
  queueId: string;
  name: string;
  externalDeveloperEntity: string | null;
  county: string;
  state: string;
  capacityMW: string | null;
  queueStatus: string | null;
  queueIso: string | null;
  daysInQueue: number | null;
  proposedCod: string | null;
  source: string;
  status: string;
}

function formatDate(ts: string | null): string {
  if (!ts) return "N/A";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMw(value: string | null): string {
  if (!value) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toFixed(2)} MW`;
}

export default function QueueTerminal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: queueProjects = [], isLoading } = useQuery<QueueProject[]>({
    queryKey: ["/api/investor/live-queue"],
  });

  const buyInterest = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/investor/live-queue/${projectId}/buy-interest`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Failed to submit buy interest" }));
        throw new Error(err.message || "Failed to submit buy interest");
      }
      return response.json();
    },
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      const hit = queueProjects.find((p) => p.id === projectId);
      toast({
        title: "Buy interest sent",
        description: hit ? `Admin notified for ${hit.name}.` : "Admin notification created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queueProjects;
    return queueProjects.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.queueId.toLowerCase().includes(q) ||
        (item.externalDeveloperEntity || "").toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q) ||
        item.county.toLowerCase().includes(q) ||
        (item.queueIso || "").toLowerCase().includes(q)
      );
    });
  }, [queueProjects, search]);

  return (
    <DashboardLayout
      title="Live Queue"
      description="Digital replicas from CAISO and PJM interconnection queues."
      breadcrumbs={[
        { label: "Overview", href: "/investor" },
        { label: "Live Queue" },
      ]}
    >
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center text-sm">
          <span className="inline-flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Source: GRID_STATUS_LIVE
          </span>
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Queue Replica Status
          </span>
          <span className="inline-flex items-center gap-2">
            <Sun className="h-4 w-4 text-primary" />
            Solar / Storage only (1-70 MW)
          </span>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Search className="h-4 w-4" />
            Terminal Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="font-mono"
            placeholder="Search by queue id, project, developer, state, county, or ISO..."
            data-testid="input-live-queue-search"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">
            LIVE_QUEUE_STREAM[{filtered.length}]
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="font-mono text-sm text-muted-foreground" data-testid="text-live-queue-loading">
              Bootstrapping live queue terminal...
            </div>
          ) : filtered.length === 0 ? (
            <div className="font-mono text-sm text-muted-foreground" data-testid="text-live-queue-empty">
              No queue replicas found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="text-left p-2">Queue ID</th>
                    <th className="text-left p-2">Project</th>
                    <th className="text-left p-2">Developer/Entity</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Capacity</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Days in Queue</th>
                    <th className="text-left p-2">Proposed COD</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 align-top" data-testid={`row-live-queue-${item.id}`}>
                      <td className="p-2">{item.queueId}</td>
                      <td className="p-2">
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                          <Signal className="h-3 w-3" />
                          {item.queueIso || "N/A"}
                        </div>
                      </td>
                      <td className="p-2">{item.externalDeveloperEntity || "N/A"}</td>
                      <td className="p-2">{item.county}, {item.state}</td>
                      <td className="p-2">{formatMw(item.capacityMW)}</td>
                      <td className="p-2">{item.queueStatus || item.status}</td>
                      <td className="p-2">{item.daysInQueue ?? "N/A"}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(item.proposedCod)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          className="font-mono"
                          onClick={() => buyInterest.mutate(item.id)}
                          disabled={buyInterest.isPending}
                          data-testid={`button-buy-interest-${item.id}`}
                        >
                          Buy Interest
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
