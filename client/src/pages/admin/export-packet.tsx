import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { Printer, ArrowLeft } from "lucide-react";
import type {
  Project,
  ReadinessScore,
  CapitalStack,
  DataRoomChecklistItem,
  Document,
} from "@shared/schema";

interface ExportPacketData {
  project: Project;
  readinessScore: ReadinessScore | null;
  capitalStack: CapitalStack | null;
  checklist: DataRoomChecklistItem[];
  documents: Document[];
  developer: {
    name: string;
    orgName: string | null;
    email: string;
  };
}

export default function AdminExportPacket() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<ExportPacketData>({
    queryKey: ["/api/admin/projects", id, "export"],
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load export data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { project, readinessScore, capitalStack, checklist, documents, developer } = data;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { 
            max-width: 100% !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #e5e7eb !important;
            margin-bottom: 1rem;
          }
          * {
            color: black !important;
            border-color: #d1d5db !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        <div className="no-print sticky top-0 z-40 flex items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur px-6 py-3">
          <Link href={`/admin/projects/${id}`}>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Review
            </Button>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Use browser print (Ctrl/Cmd + P) for PDF export
            </span>
            <Button
              onClick={() => window.print()}
              className="gap-2"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4" />
              Print Packet
            </Button>
          </div>
        </div>

        <div className="print-page max-w-4xl mx-auto p-8 space-y-8">
          <div className="print-section text-center py-8 border-b border-border">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">E</span>
              </div>
              <span className="text-2xl font-bold">EcoXchange</span>
            </div>
            <h1 className="text-3xl font-bold mt-4" data-testid="text-packet-title">
              Investor Packet
            </h1>
            <p className="text-lg text-muted-foreground mt-2" data-testid="text-packet-project-name">
              {project.name}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Prepared {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="print-section rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Developer</span>
                <p className="text-sm font-medium" data-testid="text-packet-developer">
                  {developer.name}
                  {developer.orgName && ` (${developer.orgName})`}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Technology</span>
                <p className="text-sm" data-testid="text-packet-technology">
                  {project.technology.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Stage</span>
                <p className="text-sm" data-testid="text-packet-stage">
                  {project.stage.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Capacity</span>
                <p className="text-sm" data-testid="text-packet-capacity">
                  {project.capacityMW ? `${project.capacityMW} MW` : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Location</span>
                <p className="text-sm" data-testid="text-packet-location">
                  {project.state}, {project.county}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Offtaker Type</span>
                <p className="text-sm" data-testid="text-packet-offtaker">
                  {project.offtakerType.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Interconnection</span>
                <p className="text-sm">{project.interconnectionStatus.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Permitting</span>
                <p className="text-sm">{project.permittingStatus.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Site Control</span>
                <p className="text-sm">{project.siteControlStatus.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">FEOC Attested</span>
                <p className="text-sm">{project.feocAttested ? "Yes" : "No"}</p>
              </div>
            </div>
            {project.summary && (
              <div className="mt-4">
                <span className="text-xs text-muted-foreground">Summary</span>
                <p className="text-sm mt-1" data-testid="text-packet-summary">{project.summary}</p>
              </div>
            )}
          </div>

          {readinessScore && (
            <div className="print-section rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Readiness Assessment</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold" data-testid="text-packet-readiness-score">
                  {readinessScore.score}/100
                </div>
                <StatusBadge status={readinessScore.rating} type="readiness" />
              </div>
              {readinessScore.reasons && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Assessment Reasons</span>
                  <p className="text-sm mt-1" data-testid="text-packet-readiness-reasons">
                    {readinessScore.reasons}
                  </p>
                </div>
              )}
              {readinessScore.flags && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Flags</span>
                  <p className="text-sm mt-1">{readinessScore.flags}</p>
                </div>
              )}
            </div>
          )}

          {capitalStack && (
            <div className="print-section rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Capital Stack</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Total CAPEX</span>
                  <p className="text-sm font-medium" data-testid="text-packet-capex">
                    ${Number(capitalStack.totalCapex ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tax Credit Type</span>
                  <p className="text-sm">{capitalStack.taxCreditType}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tax Credit Estimated</span>
                  <p className="text-sm">
                    ${Number(capitalStack.taxCreditEstimated ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Equity Needed</span>
                  <p className="text-sm font-medium" data-testid="text-packet-equity">
                    ${Number(capitalStack.equityNeeded ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Debt Placeholder</span>
                  <p className="text-sm">
                    ${Number(capitalStack.debtPlaceholder ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Transferability Ready</span>
                  <p className="text-sm">
                    {capitalStack.taxCreditTransferabilityReady ? "Yes" : "No"}
                  </p>
                </div>
              </div>
              {capitalStack.notes && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <p className="text-sm mt-1">{capitalStack.notes}</p>
                </div>
              )}
            </div>
          )}

          {checklist.length > 0 && (
            <div className="print-section rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Data Room Checklist</h2>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                    data-testid={`row-packet-checklist-${item.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.label}</span>
                      {item.required && (
                        <span className="text-xs text-muted-foreground">(Required)</span>
                      )}
                    </div>
                    <StatusBadge status={item.status} type="checklist" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div className="print-section rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Documents</h2>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                    data-testid={`row-packet-document-${doc.id}`}
                  >
                    <span className="text-sm">{doc.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {doc.type.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="print-section text-center py-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              EcoXchange Pilot -- Informational platform; not a broker-dealer; commitments are non-binding.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
