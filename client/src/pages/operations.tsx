import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Database,
  Upload,
  Link2,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Shield,
  Server,
  FileUp,
  FileCheck,
  ArrowUpRight,
  Info,
  XCircle,
} from "lucide-react";

interface OperationsDataSource {
  id: string;
  projectId: string;
  sourceType: string;
  providerName: string;
  status: string;
  dataQuality: string;
  lastSyncAt: string | null;
  recordCount: number;
  connectorId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  technology: string;
  capacityMW: string | null;
}

interface ProjectDataSources {
  project: ProjectSummary;
  sources: OperationsDataSource[];
}

interface ScadaConnector {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  supportedTechnologies: string | null;
}

interface IngestionEvent {
  id: string;
  timestamp: string;
  source: string;
  project: string;
  records: number;
  status: "SUCCESS" | "WARNING" | "FAILED";
  qualityChecks: string[];
  message: string;
}

const DEMO_INGESTION_LOG: IngestionEvent[] = [
  {
    id: "evt-1",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    source: "NREL PVDAQ (System 9068)",
    project: "Colorado Sun CdTe I",
    records: 12,
    status: "SUCCESS",
    qualityChecks: ["Schema validation passed", "Range check passed", "Completeness: 100%"],
    message: "Monthly production data synced successfully. 12 records ingested with HIGH quality rating.",
  },
  {
    id: "evt-2",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: "Manual Entry",
    project: "Sunfield Solar I",
    records: 12,
    status: "WARNING",
    qualityChecks: ["Schema validation passed", "Range check: 2 outliers flagged", "Completeness: 100%"],
    message: "Manual production data entered. 2 months show capacity factor deviation >15% from expected range.",
  },
  {
    id: "evt-3",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source: "NREL PVDAQ (System 9068)",
    project: "Colorado Sun CdTe I",
    records: 1,
    status: "SUCCESS",
    qualityChecks: ["Schema validation passed", "Range check passed", "Completeness: 100%"],
    message: "Incremental sync: December 2025 production record added.",
  },
  {
    id: "evt-4",
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    source: "CSV Import",
    project: "Desert Sun Community Solar",
    records: 0,
    status: "FAILED",
    qualityChecks: ["Schema validation failed: missing 'production_mwh' column"],
    message: "CSV upload rejected. Required column 'production_mwh' not found in uploaded file.",
  },
  {
    id: "evt-5",
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    source: "NREL PVDAQ (System 9068)",
    project: "Colorado Sun CdTe I",
    records: 12,
    status: "SUCCESS",
    qualityChecks: ["Schema validation passed", "Range check passed", "Completeness: 100%", "Cross-validation with PPA records: matched"],
    message: "Full historical backfill completed. 12 months of verified telemetry data loaded.",
  },
];

function DataSourcesTab() {
  const { data, isLoading } = useQuery<ProjectDataSources[]>({
    queryKey: ["/api/operations/data-sources"],
    queryFn: async () => {
      const res = await fetch("/api/operations/data-sources", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch data sources");
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Connected SCADA data sources across all projects</p>
        <Badge variant="outline" className="text-xs gap-1">
          <Info className="h-3 w-3" /> Demo Data
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground py-12">
            <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No data sources configured yet.</p>
            <p className="text-xs mt-1">Data sources will appear here once projects have SCADA integrations.</p>
          </CardContent>
        </Card>
      ) : (
        data.map(({ project, sources }) =>
          sources.map((ds) => (
            <Card key={ds.id} data-testid={`card-datasource-${ds.id}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                      {ds.sourceType === "PVDAQ_VERIFIED" ? <Shield className="h-5 w-5" /> :
                       ds.sourceType === "CSV_UPLOAD" ? <FileUp className="h-5 w-5" /> :
                       <Database className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm" data-testid={`text-ds-name-${ds.id}`}>{project.name}</h4>
                        <QualityBadge quality={ds.dataQuality} />
                        <StatusBadge status={ds.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{ds.providerName} &middot; {ds.sourceType.replace(/_/g, " ")}</p>
                      {ds.notes && <p className="text-xs text-muted-foreground/70 max-w-lg">{ds.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                    <div className="text-center">
                      <p className="font-medium text-foreground text-sm" data-testid={`text-ds-records-${ds.id}`}>{ds.recordCount}</p>
                      <p>Records</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground text-sm">
                        {ds.lastSyncAt ? formatRelativeTime(ds.lastSyncAt) : "Never"}
                      </p>
                      <p>Last Sync</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )
      )}
    </div>
  );
}

function QualityBadge({ quality }: { quality: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    HIGH: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "High" },
    MEDIUM: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Medium" },
    LOW: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Low" },
    UNKNOWN: { color: "bg-muted text-muted-foreground border-border", label: "Unknown" },
  };
  const v = variants[quality] || variants.UNKNOWN;
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${v.color}`} data-testid={`badge-quality-${quality.toLowerCase()}`}>{v.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="h-2.5 w-2.5" /> Active</span>;
  if (status === "PENDING") return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Clock className="h-2.5 w-2.5" /> Pending</span>;
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"><AlertTriangle className="h-2.5 w-2.5" /> {status}</span>;
}

function CsvUploadTab() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function handleFileDrop() {
    setSelectedFile("production_data_q4_2025.csv");
    setShowPreview(true);
  }

  function handleUpload() {
    toast({
      title: "Upload Simulated",
      description: "In production, this CSV would be parsed, validated, and ingested into the SCADA pipeline. This is a demo placeholder.",
    });
    setSelectedFile(null);
    setShowPreview(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Upload CSV production data for manual ingestion</p>
        <Badge variant="outline" className="text-xs gap-1">
          <Info className="h-3 w-3" /> Demo / Prototype
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/50"); }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary/50"); handleFileDrop(); }}
            data-testid="zone-csv-upload"
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">
              {selectedFile ? selectedFile : "Drop CSV file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: .csv, .xlsx &middot; Max size: 50MB
            </p>
            {selectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
                <FileCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">{selectedFile}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Field Mapping Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="csv-field-mapping">
              <div className="grid grid-cols-3 gap-3 text-xs font-medium text-muted-foreground border-b border-border pb-2">
                <span>CSV Column</span>
                <span>Maps To</span>
                <span>Status</span>
              </div>
              {[
                { csv: "date", maps: "periodStart", ok: true },
                { csv: "production_kwh", maps: "productionMwh (÷1000)", ok: true },
                { csv: "capacity_factor", maps: "capacityFactor", ok: true },
                { csv: "inverter_efficiency", maps: "(unmapped)", ok: false },
                { csv: "ambient_temp_c", maps: "(unmapped)", ok: false },
              ].map((field, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 text-xs items-center">
                  <span className="font-mono text-foreground">{field.csv}</span>
                  <span className={field.ok ? "text-foreground" : "text-muted-foreground"}>{field.maps}</span>
                  <span>
                    {field.ok ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3 w-3" /> Mapped</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-400"><AlertTriangle className="h-3 w-3" /> Skipped</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" onClick={handleUpload} data-testid="button-csv-upload">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Ingest Data
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedFile(null); setShowPreview(false); }} data-testid="button-csv-cancel">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">CSV Requirements</p>
              <p>Required columns: <span className="font-mono">date</span>, <span className="font-mono">production_kwh</span> or <span className="font-mono">production_mwh</span></p>
              <p>Optional columns: <span className="font-mono">capacity_factor</span>, <span className="font-mono">inverter_efficiency</span>, <span className="font-mono">ambient_temp_c</span></p>
              <p>Date format: YYYY-MM-DD or MM/DD/YYYY. One row per reporting period (monthly or daily).</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectorsTab() {
  const { toast } = useToast();
  const { data: connectors, isLoading } = useQuery<ScadaConnector[]>({
    queryKey: ["/api/scada/connectors"],
    queryFn: async () => {
      const res = await fetch("/api/scada/connectors", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  function handleConnect(connector: ScadaConnector) {
    if (connector.status === "AVAILABLE") {
      toast({
        title: `${connector.name} Connected`,
        description: `In production, this would initiate the OAuth/API key flow for ${connector.name}. This is a demo placeholder.`,
      });
    } else {
      toast({
        title: "Coming Soon",
        description: `${connector.name} integration is planned for a future release. We'll notify you when it becomes available.`,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Available SCADA monitoring platform connectors</p>
        <Badge variant="outline" className="text-xs gap-1">
          <Info className="h-3 w-3" /> Demo / Prototype
        </Badge>
      </div>

      {!isLoading && (!connectors || connectors.length === 0) ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground py-12">
            <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No connectors available.</p>
            <p className="text-xs mt-1">SCADA platform connectors will appear here when configured.</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(connectors || []).map((connector) => (
          <Card key={connector.id} data-testid={`card-connector-${connector.slug}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground">
                    {connector.slug === "pvdaq" ? <Shield className="h-5 w-5 text-primary" /> :
                     connector.slug === "enphase" ? <Zap className="h-5 w-5" /> :
                     connector.slug === "solaredge" ? <Zap className="h-5 w-5" /> :
                     connector.slug === "alsoenergy" ? <Server className="h-5 w-5" /> :
                     <Link2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm" data-testid={`text-connector-name-${connector.slug}`}>{connector.name}</h4>
                    <p className="text-xs text-muted-foreground">{(connector.supportedTechnologies ?? "").replace(/,/g, " · ")}</p>
                  </div>
                </div>
                {connector.status === "AVAILABLE" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Available</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{connector.description ?? ""}</p>
              <Button
                size="sm"
                variant={connector.status === "AVAILABLE" ? "default" : "outline"}
                className="w-full"
                onClick={() => handleConnect(connector)}
                data-testid={`button-connect-${connector.slug}`}
              >
                {connector.status === "AVAILABLE" ? (
                  <><Link2 className="h-3.5 w-3.5 mr-1.5" /> Configure</>
                ) : (
                  <><Clock className="h-3.5 w-3.5 mr-1.5" /> Coming Soon</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

function ReconciliationLogTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">History of data ingestion events and quality checks</p>
        <Badge variant="outline" className="text-xs gap-1">
          <Info className="h-3 w-3" /> Demo Data
        </Badge>
      </div>

      {DEMO_INGESTION_LOG.map((event) => (
        <Card key={event.id} data-testid={`card-log-${event.id}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-0.5">
                {event.status === "SUCCESS" ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                ) : event.status === "WARNING" ? (
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm" data-testid={`text-log-project-${event.id}`}>{event.project}</h4>
                  <span className="text-xs text-muted-foreground">&middot;</span>
                  <span className="text-xs text-muted-foreground">{event.source}</span>
                  {event.records > 0 && (
                    <Badge variant="outline" className="text-[10px]">{event.records} records</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{event.message}</p>
                <div className="flex flex-wrap gap-1.5">
                  {event.qualityChecks.map((check, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                        check.toLowerCase().includes("failed") || check.toLowerCase().includes("missing")
                          ? "bg-red-500/10 text-red-400"
                          : check.toLowerCase().includes("outlier") || check.toLowerCase().includes("deviation")
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {check.toLowerCase().includes("failed") || check.toLowerCase().includes("missing") ? (
                        <XCircle className="h-2.5 w-2.5" />
                      ) : check.toLowerCase().includes("outlier") || check.toLowerCase().includes("deviation") ? (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      ) : (
                        <CheckCircle className="h-2.5 w-2.5" />
                      )}
                      {check}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                <p>{formatRelativeTime(event.timestamp)}</p>
                <p className="text-[10px]">{new Date(event.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PublishMetricsSection() {
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handlePublish() {
    setShowConfirm(false);
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      toast({
        title: "Metrics Published",
        description: "Updated SCADA metrics have been pushed to the public performance views. In production, this would refresh cached data and update investor-facing dashboards.",
      });
    }, 1500);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Publish Updated Metrics</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Push refreshed SCADA data to public-facing performance views and investor dashboards.
                This action simulates a cache refresh and metrics recalculation.
              </p>
              <Badge variant="outline" className="text-[10px] gap-1 mt-1.5">
                <Info className="h-2.5 w-2.5" /> Demo / Prototype
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={publishing}
            className="shrink-0"
            data-testid="button-publish-metrics"
          >
            {publishing ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Publishing...</>
            ) : (
              <><ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Publish Now</>
            )}
          </Button>
        </div>

        {showConfirm && (
          <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30" data-testid="dialog-publish-confirm">
            <p className="text-sm font-medium mb-1">Confirm Publish</p>
            <p className="text-xs text-muted-foreground mb-3">
              This will push refreshed SCADA metrics to all public-facing performance views and investor dashboards.
              In production, this recalculates cached summaries and updates live data feeds.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePublish} data-testid="button-confirm-publish">
                <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Confirm Publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)} data-testid="button-cancel-publish">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function OperationsPage() {
  return (
    <DashboardLayout
      title="SCADA Operations"
      description="Manage data sources, connectors, and ingestion pipeline"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Operations" },
      ]}
      actions={
        <Badge variant="outline" className="gap-1 text-xs">
          <Activity className="h-3 w-3" /> Prototype
        </Badge>
      }
    >
      <PublishMetricsSection />

      <div className="mt-6">
        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="w-full justify-start" data-testid="tabs-operations">
            <TabsTrigger value="sources" className="gap-1.5" data-testid="tab-sources">
              <Database className="h-3.5 w-3.5" /> Data Sources
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5" data-testid="tab-upload">
              <Upload className="h-3.5 w-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="connectors" className="gap-1.5" data-testid="tab-connectors">
              <Link2 className="h-3.5 w-3.5" /> Connectors
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5" data-testid="tab-log">
              <FileText className="h-3.5 w-3.5" /> Reconciliation Log
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="sources">
              <DataSourcesTab />
            </TabsContent>
            <TabsContent value="upload">
              <CsvUploadTab />
            </TabsContent>
            <TabsContent value="connectors">
              <ConnectorsTab />
            </TabsContent>
            <TabsContent value="log">
              <ReconciliationLogTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
