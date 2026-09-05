import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProjectFinanceModelPlaceholder(){
  const {projectId="",scenarioId="",calculationRunId=""}=useParams<{projectId:string;scenarioId:string;calculationRunId:string}>();
  return <DashboardLayout title="Detailed Financial Model" description="Reserved for Ticket 16: annual cash flows, debt schedule, sources & uses, sponsor cash flows, and formula trace." breadcrumbs={[{label:"Project Finance",href:"/developer/project-finance/projects"},{label:"Inputs",href:`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`},{label:"Detailed Model"}]}><Card className="max-w-2xl"><CardHeader><CardTitle>Detailed model route is reserved</CardTitle><CardDescription>The immutable calculation run is preserved for the next product layer. Ticket 15 does not duplicate the 25-year model on the executive underwriting dashboard.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Calculation run</div><div className="break-all font-mono text-sm">{calculationRunId}</div></div><Button asChild><Link href={`/developer/project-finance/projects/${projectId}/scenarios/${scenarioId}/inputs`}>Back to Inputs</Link></Button></CardContent></Card></DashboardLayout>;
}
