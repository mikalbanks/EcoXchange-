import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function ProjectFinanceResultHandoff(){
  const {projectId="",scenarioId="",underwritingRunId=""}=useParams<{projectId:string;scenarioId:string;underwritingRunId:string}>();
  const query=new URLSearchParams(window.location.search); const calculationRunId=query.get("calculationRunId");
  return <DashboardLayout title="Analysis completed" description="The calculation and indicative underwriting records were persisted successfully." breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:"Project",href:`/developer/project-finance/projects/${projectId}`},{label:"Inputs",href:`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`},{label:"Analysis"}]}>
    <div className="mx-auto max-w-2xl space-y-5"><Card><CardHeader><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/><CardTitle>Persisted analysis ready</CardTitle></div><CardDescription>Ticket 15 will provide the full capital-stack and credit-assessment dashboard. This handoff preserves the authoritative run identities.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Calculation run</div><div className="mt-1 break-all font-mono text-sm">{calculationRunId||"Not provided"}</div></div><div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Underwriting run</div><div className="mt-1 break-all font-mono text-sm">{underwritingRunId}</div></div><Badge variant="outline">Indicative underwriting</Badge><div className="flex flex-wrap gap-2"><Button asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}>Back to inputs</Link></Button><Button variant="outline" asChild><Link href={`/developer/project-finance/projects/${projectId}`}>Project overview</Link></Button></div></CardContent></Card></div>
  </DashboardLayout>;
}
