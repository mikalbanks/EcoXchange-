import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  FileWarning,
  Satellite,
  PlugZap,
  Workflow,
  Landmark,
  Coins,
  Play,
  MapPin,
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
    source: "SGT Handshake (Solcast + Utility Shadow)",
    project: "Lancaster Sun Ranch",
    records: 96,
    status: "SUCCESS",
    qualityChecks: ["Sky Oracle telemetry verified", "Utility Shadow reconciled", "SGT interval validated", "Waterfall settlement complete"],
    message: "Full SGT pipeline executed. 96 intervals generated via Sky Oracle satellite data + Utility Shadow net metering. Waterfall settlement distributed to all accounts.",
  },
  {
    id: "evt-2",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: "Manual Entry",
    project: "Imperial Valley Solar I",
    records: 12,
    status: "WARNING",
    qualityChecks: ["Schema validation passed", "Range check: 2 outliers flagged", "Completeness: 100%"],
    message: "Manual production data entered. 2 months show capacity factor deviation >15% from expected range.",
  },
  {
    id: "evt-3",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source: "Utility Shadow (Net Meter Sim)",
    project: "Imperial Valley Solar I",
    records: 96,
    status: "SUCCESS",
    qualityChecks: ["Consumption ratio calibrated (2% utility-scale)", "Noise band ±5% applied", "Net meter reconciled with Sky Oracle"],
    message: "Utility Shadow simulation completed for 12MW utility-scale project. Net meter data generated with 2% self-consumption ratio.",
  },
  {
    id: "evt-4",
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    source: "Waterfall Engine",
    project: "Lancaster Sun Ranch",
    records: 30,
    status: "SUCCESS",
    qualityChecks: ["Double-entry balanced", "REVENUE_CLEARING debited", "All 5 tiers credited", "FOR UPDATE SKIP LOCKED acquired"],
    message: "Waterfall settlement processed 30 days of SGT intervals. Revenue distributed across debt service, OpEx, reserves, platform fee, and investor yield.",
  },
  {
    id: "evt-5",
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    source: "Sky Oracle (Solcast Satellite)",
    project: "Pecos Flat Solar Farm",
    records: 48,
    status: "SUCCESS",
    qualityChecks: ["Satellite PV estimate received", "Irradiance cross-check passed", "Capacity factor within expected range", "GPS coordinates validated"],
    message: "Sky Oracle satellite sweep for Pecos County, TX. 48 half-hour PV power estimates ingested from Solcast world_pv_power endpoint (5.5MW capacity).",
  },
];

function DataSourcesTab({ onSwitchToUpload }: { onSwitchToUpload?: () => void }) {
  const { data, isLoading } = useQuery<ProjectDataSources[]>({
    queryKey: ["/api/operations/data-sources"],
    queryFn: async () => {
      const res = await fetch("/api/operations/data-sources", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch data sources");
      return res.json();
    },
    staleTime: 30000,
  });

  const hasRealData = data?.some(({ sources }) =>
    sources.some(s => s.sourceType === "CSV_UPLOAD" || s.sourceType === "CONNECTOR")
  ) ?? false;

  const totalRecords = data?.reduce((sum, { sources }) =>
    sum + sources.reduce((s, ds) => s + (ds.recordCount || 0), 0), 0
  ) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Connected SCADA data sources across all projects</p>
        {!hasRealData && (
          <Badge variant="outline" className="text-xs gap-1">
            <Info className="h-3 w-3" /> Simulated Sources
          </Badge>
        )}
        {hasRealData && (
          <Badge variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-400">
            <CheckCircle className="h-3 w-3" /> {totalRecords} Records Ingested
          </Badge>
        )}
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
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      ds.sourceType === "CSV_UPLOAD" ? "bg-blue-500/10 text-blue-400" :
                      ds.sourceType === "SGT_VERIFIED" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {ds.sourceType === "SGT_VERIFIED" ? <Shield className="h-5 w-5" /> :
                       ds.sourceType === "CSV_UPLOAD" ? <FileUp className="h-5 w-5" /> :
                       ds.sourceType === "CONNECTOR" ? <PlugZap className="h-5 w-5" /> :
                       <Database className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm" data-testid={`text-ds-name-${ds.id}`}>{project.name}</h4>
                        <QualityBadge quality={ds.dataQuality} />
                        <StatusBadge status={ds.status} />
                        {ds.sourceType === "CSV_UPLOAD" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Real Data
                          </span>
                        )}
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
                    {ds.sourceType === "CSV_UPLOAD" && onSwitchToUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={onSwitchToUpload}
                        data-testid={`button-reupload-${ds.id}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Re-upload
                      </Button>
                    )}
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

interface CsvPreviewData {
  success: boolean;
  fieldMapping: Array<{ csvColumn: string; mapsTo: string | null; status: "mapped" | "skipped" }>;
  validation: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    dateRange: { start: string; end: string } | null;
    gapsDetected: number;
    duplicatesDetected: number;
    unit: string;
    granularity: string;
    coveragePercent: number;
  };
  errors: string[];
  detectedGranularity: string;
  sampleRows: Array<{ timestamp: string; productionKwh: number; capacityFactor?: number }>;
}

function CsvUploadTab() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejectedFile, setRejectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("proj1");

  const { data: projectList } = useQuery<Array<{ id: string; name: string; technology: string; capacityMW: string | null }>>({
    queryKey: ["/api/projects/all-for-upload"],
    queryFn: async () => {
      const dsRes = await fetch("/api/operations/data-sources", { credentials: "include" });
      if (!dsRes.ok) return [];
      const dsList: ProjectDataSources[] = await dsRes.json();
      const seen = new Set<string>();
      const projects: Array<{ id: string; name: string; technology: string; capacityMW: string | null }> = [];
      for (const d of dsList) {
        if (!seen.has(d.project.id)) { seen.add(d.project.id); projects.push(d.project); }
      }
      return projects;
    },
    staleTime: 60000,
  });

  const allProjects = projectList || [];

  const ALLOWED_EXTENSIONS = [".csv"];

  function isValidFile(filename: string): boolean {
    return ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  async function handleFileSelected(file: File) {
    setRejectedFile(null);
    setPreview(null);

    if (!isValidFile(file.name)) {
      setRejectedFile(file.name);
      setSelectedFile(null);
      toast({ title: "Invalid File Type", description: `"${file.name}" is not a supported format. Please upload a .csv file.`, variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setPreviewLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/operations/csv-upload/preview", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }
      const data: CsvPreviewData = await res.json();
      setPreview(data);
      if (!data.success) {
        toast({ title: "Parse Issues", description: data.errors.join("; "), variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to preview CSV";
      toast({ title: "Preview Failed", description: msg, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleBrowseClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelected(file);
    };
    input.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove("border-primary/50");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  }

  async function handleIngest() {
    if (!selectedFile || !preview?.success) return;
    setIngesting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", selectedProjectId);
      formData.append("replaceExisting", "false");
      const res = await fetch("/api/operations/csv-upload/ingest", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Ingestion failed");
      }
      const data = await res.json();
      toast({ title: "Data Ingested", description: `${data.recordsIngested} records imported successfully.` });
      setSelectedFile(null);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/operations/data-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/all-for-upload"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to ingest CSV";
      toast({ title: "Ingestion Failed", description: msg, variant: "destructive" });
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Upload CSV production data for ingestion into the SCADA pipeline</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Project</label>
            <select
              className="w-full max-w-xs bg-background border border-border rounded-md px-3 py-2 text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              data-testid="select-csv-project"
            >
              {allProjects.length > 0 ? (
                allProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.capacityMW} MW)</option>)
              ) : (
                <>
                  <option value="proj1">Imperial Valley Solar I (12 MW)</option>
                  <option value="proj3">Lancaster Sun Ranch (25 MW)</option>
                </>
              )}
            </select>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleBrowseClick}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50"); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/50"); }}
            onDrop={handleDrop}
            data-testid="zone-csv-upload"
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1">
              {selectedFile ? selectedFile.name : "Drop CSV file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported format: .csv &middot; Max size: 50MB
            </p>
            {selectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
                <FileCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">{selectedFile.name}</span>
              </div>
            )}
            {rejectedFile && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-md" data-testid="badge-rejected-file">
                <FileWarning className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">{rejectedFile} — unsupported format</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {previewLoading && (
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Parsing CSV...</div></CardContent></Card>
      )}

      {preview && !previewLoading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Field Mapping Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-muted/30 rounded-md p-2.5">
                <p className="text-muted-foreground">Valid Rows</p>
                <p className="font-medium text-foreground text-sm" data-testid="text-csv-valid-rows">{preview.validation.validRows}</p>
              </div>
              {preview.validation.dateRange && (
                <div className="bg-muted/30 rounded-md p-2.5">
                  <p className="text-muted-foreground">Date Range</p>
                  <p className="font-medium text-foreground text-sm" data-testid="text-csv-date-range">{preview.validation.dateRange.start} → {preview.validation.dateRange.end}</p>
                </div>
              )}
              <div className="bg-muted/30 rounded-md p-2.5">
                <p className="text-muted-foreground">Granularity</p>
                <p className="font-medium text-foreground text-sm" data-testid="text-csv-granularity">{preview.detectedGranularity}</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5">
                <p className="text-muted-foreground">Coverage</p>
                <p className="font-medium text-foreground text-sm" data-testid="text-csv-coverage">{preview.validation.coveragePercent}%</p>
              </div>
              <div className="bg-muted/30 rounded-md p-2.5">
                <p className="text-muted-foreground">Gaps / Duplicates</p>
                <p className="font-medium text-foreground text-sm">{preview.validation.gapsDetected} / {preview.validation.duplicatesDetected}</p>
              </div>
            </div>

            <div className="space-y-3" data-testid="csv-field-mapping">
              <div className="grid grid-cols-3 gap-3 text-xs font-medium text-muted-foreground border-b border-border pb-2">
                <span>CSV Column</span>
                <span>Maps To</span>
                <span>Status</span>
              </div>
              {preview.fieldMapping.map((field, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 text-xs items-center">
                  <span className="font-mono text-foreground">{field.csvColumn}</span>
                  <span className={field.status === "mapped" ? "text-foreground" : "text-muted-foreground"}>{field.mapsTo || "(unmapped)"}</span>
                  <span>
                    {field.status === "mapped" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3 w-3" /> Mapped</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-yellow-400"><AlertTriangle className="h-3 w-3" /> Skipped</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {preview.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-500/10 rounded-md text-xs text-red-400" data-testid="text-csv-errors">
                {preview.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" onClick={handleIngest} disabled={!preview.success || ingesting} data-testid="button-csv-upload">
                {ingesting ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                {ingesting ? "Ingesting..." : `Ingest ${preview.validation.validRows} Records`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedFile(null); setPreview(null); }} data-testid="button-csv-cancel">
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
                    {connector.slug === "solcast-sky-oracle" ? <Shield className="h-5 w-5 text-primary" /> :
                     connector.slug === "enphase" ? <Zap className="h-5 w-5 text-orange-400" /> :
                     connector.slug === "solaredge" ? <Zap className="h-5 w-5 text-red-400" /> :
                     connector.slug === "alsoenergy" ? <Server className="h-5 w-5 text-blue-400" /> :
                     connector.slug === "power-factors" ? <Activity className="h-5 w-5 text-cyan-400" /> :
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

interface PipelineProject {
  projectId: string;
  projectName: string;
  capacityMW: string;
  state: string;
  latitude: string;
  longitude: string;
  pipeline: Record<string, { status: string; provider: string }>;
}

interface PipelineStatus {
  pipelineVersion: string;
  totalProjects: number;
  solcastConnected: boolean;
  utilityShadowActive: boolean;
  projects: PipelineProject[];
}

const PIPELINE_STAGE_META: Record<string, { label: string; icon: typeof Satellite }> = {
  skyOracle: { label: "Sky Oracle", icon: Satellite },
  utilityShadow: { label: "Utility Shadow", icon: PlugZap },
  sgtHandshake: { label: "SGT Handshake", icon: Workflow },
  waterfallEngine: { label: "Waterfall Engine", icon: Landmark },
  securitizeBridge: { label: "Securitize Bridge", icon: Coins },
};

function PipelineStatusBadge({ status }: { status: string }) {
  const isGreen = ["CONNECTED", "ACTIVE", "READY", "CONFIGURED"].includes(status);
  const isYellow = ["FALLBACK_MODE", "MOCK"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${
      isGreen ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
      isYellow ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
      "bg-muted text-muted-foreground border-border"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isGreen ? "bg-emerald-400" : isYellow ? "bg-yellow-400" : "bg-muted-foreground"}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SgtPipelineTab() {
  const { toast } = useToast();
  const [handshakeLoading, setHandshakeLoading] = useState<string | null>(null);
  const [settleLoading, setSettleLoading] = useState<string | null>(null);
  const [lastHandshake, setLastHandshake] = useState<any>(null);
  const [lastSettlement, setLastSettlement] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery<PipelineStatus>({
    queryKey: ["/api/public/sgt-pipeline-status"],
    queryFn: async () => {
      const res = await fetch("/api/public/sgt-pipeline-status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30000,
  });

  async function triggerHandshake(projectId: string) {
    setHandshakeLoading(projectId);
    setLastHandshake(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sgt-handshake`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Handshake failed");
      }
      const result = await res.json();
      setLastHandshake(result);
      toast({ title: "SGT Handshake Complete", description: `Interval #${result.intervalId} created — ${result.syntheticGrossWh.toFixed(2)} Wh synthetic gross` });
      refetch();
    } catch (err: any) {
      toast({ title: "Handshake Failed", description: err.message, variant: "destructive" });
    } finally {
      setHandshakeLoading(null);
    }
  }

  async function triggerSettle(projectId: string) {
    setSettleLoading(projectId);
    setLastSettlement(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/settle`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Settlement failed");
      }
      const result = await res.json();
      setLastSettlement(result);
      toast({ title: "Settlement Complete", description: `${result.settlement.daysSettled} days settled — $${result.settlement.totalRevenueUsd.toFixed(2)} total revenue` });
    } catch (err: any) {
      toast({ title: "Settlement Failed", description: err.message, variant: "destructive" });
    } finally {
      setSettleLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Live SGT pipeline status and manual controls</p>
        {data && (
          <Badge variant="outline" className="text-xs gap-1">
            <Workflow className="h-3 w-3" /> {data.pipelineVersion}
          </Badge>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
          {Object.entries(PIPELINE_STAGE_META).map(([key, meta]) => {
            const IconComp = meta.icon;
            const statuses = data.projects.map(p => p.pipeline[key]?.status).filter(Boolean);
            const allConnected = statuses.every(s => ["CONNECTED", "ACTIVE", "READY", "CONFIGURED"].includes(s));
            const anyActive = statuses.some(s => ["CONNECTED", "ACTIVE", "READY", "CONFIGURED"].includes(s));
            return (
              <Card key={key}>
                <CardContent className="pt-4 pb-3 px-3 text-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full mx-auto mb-2 ${allConnected ? "bg-emerald-500/10 text-emerald-400" : anyActive ? "bg-yellow-500/10 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {allConnected ? "Online" : anyActive ? "Partial" : "Standby"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-28 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : data && data.projects.length > 0 ? (
        data.projects.map((proj) => (
          <Card key={proj.projectId} data-testid={`card-sgt-pipeline-${proj.projectId}`}>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm" data-testid={`text-sgt-name-${proj.projectId}`}>{proj.projectName}</h4>
                    <Badge variant="outline" className="text-[10px]">{proj.capacityMW} MW</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3" />
                    {proj.state} ({proj.latitude}, {proj.longitude})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(proj.pipeline).map(([key, val]) => (
                      <div key={key} className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{PIPELINE_STAGE_META[key]?.label || key}</p>
                        <PipelineStatusBadge status={val.status} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerHandshake(proj.projectId)}
                    disabled={handshakeLoading === proj.projectId}
                    data-testid={`button-handshake-${proj.projectId}`}
                  >
                    {handshakeLoading === proj.projectId ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running...</>
                    ) : (
                      <><Play className="h-3.5 w-3.5 mr-1.5" /> Handshake</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => triggerSettle(proj.projectId)}
                    disabled={settleLoading === proj.projectId}
                    data-testid={`button-settle-${proj.projectId}`}
                  >
                    {settleLoading === proj.projectId ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Settling...</>
                    ) : (
                      <><Landmark className="h-3.5 w-3.5 mr-1.5" /> Settle</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground py-12">
            <Workflow className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No approved projects with pipeline configuration.</p>
          </CardContent>
        </Card>
      )}

      {lastHandshake && (
        <Card className="border-primary/30" data-testid="card-handshake-result">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Last Handshake Result
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-muted-foreground">Interval ID</p>
                <p className="font-medium">#{lastHandshake.intervalId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Synthetic Gross</p>
                <p className="font-medium">{lastHandshake.syntheticGrossWh.toFixed(2)} Wh</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sky Oracle (kW)</p>
                <p className="font-medium">{lastHandshake.skyOracle.pvEstimateKw.toFixed(2)} kW</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source</p>
                <p className="font-medium">{lastHandshake.skyOracle.source.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lastHandshake.telemetrySources.map((src: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">{src}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lastSettlement && (
        <Card className="border-primary/30" data-testid="card-settlement-result">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Last Settlement Result
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1.5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-muted-foreground">Days Settled</p>
                <p className="font-medium">{lastSettlement.settlement.daysSettled}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Intervals</p>
                <p className="font-medium">{lastSettlement.settlement.totalIntervalsSettled}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-medium text-primary">${lastSettlement.settlement.totalRevenueUsd.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Distribution</p>
                <p className="font-medium">{lastSettlement.distribution?.success ? "Success" : "N/A"}</p>
              </div>
            </div>
            {lastSettlement.settlement.waterfallSummary && Object.keys(lastSettlement.settlement.waterfallSummary).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-muted-foreground mb-1">Waterfall Breakdown</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(lastSettlement.settlement.waterfallSummary).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[10px] text-muted-foreground">{key.replace(/_/g, " ")}</p>
                      <p className="font-medium">${(val as number).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
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
  const [activeTab, setActiveTab] = useState("sources");

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <TabsTrigger value="sgt-pipeline" className="gap-1.5" data-testid="tab-sgt-pipeline">
              <Workflow className="h-3.5 w-3.5" /> SGT Pipeline
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="sources">
              <DataSourcesTab onSwitchToUpload={() => setActiveTab("upload")} />
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
            <TabsContent value="sgt-pipeline">
              <SgtPipelineTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
