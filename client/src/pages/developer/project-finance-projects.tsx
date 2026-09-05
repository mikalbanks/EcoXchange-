import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Archive, FolderKanban, Plus } from "lucide-react";
import { humanize, pfApi, type ProjectRecord } from "@/lib/project-finance-api";

const capacity = (p:ProjectRecord) => p.capacity_mw_ac == null ? "—" : `${Number(p.capacity_mw_ac).toLocaleString(undefined,{maximumFractionDigits:2})} MW AC`;

export default function ProjectFinanceProjects() {
  const qc=useQueryClient(); const [,navigate]=useLocation();
  const projects=useQuery({queryKey:["project-finance","projects"],queryFn:pfApi.listProjects});
  const archive=useMutation({mutationFn:(id:string)=>pfApi.archiveProject(id),onSuccess:()=>qc.invalidateQueries({queryKey:["project-finance","projects"]})});
  const active=(projects.data??[]).filter(p=>!p.archived_at);
  const scenarioQueries=useQueries({queries:active.map(p=>({queryKey:["project-finance","scenarios",p.id],queryFn:()=>pfApi.listScenarios(p.id)}))});
  const latestScenarios=active.map((_,i)=>(scenarioQueries[i]?.data??[]).find(s=>s.status!=="ARCHIVED"));
  const underwritingQueries=useQueries({queries:active.map((_,i)=>({queryKey:["project-finance","underwriting-history",latestScenarios[i]?.id??"none"],queryFn:()=>pfApi.listUnderwritingRuns(latestScenarios[i]!.id),enabled:!!latestScenarios[i]?.id}))});

  return <DashboardLayout title="Project Finance" description="Guided sponsor-side project and underwriting workspace." actions={<Button asChild><Link href="/developer/project-finance/projects/new"><Plus className="mr-2 h-4 w-4"/>Create Project</Link></Button>}>
    {projects.error?<Alert variant="destructive"><AlertTitle>Projects could not be loaded</AlertTitle><AlertDescription>{(projects.error as Error).message}</AlertDescription></Alert>:null}
    {projects.isLoading?<div className="grid gap-4 md:grid-cols-2"><div className="h-44 animate-pulse rounded-lg bg-muted"/><div className="h-44 animate-pulse rounded-lg bg-muted"/></div>:null}
    {!projects.isLoading && active.length===0?<Card><CardHeader><CardTitle>No projects</CardTitle><CardDescription>Create your first project to begin an indicative financing analysis.</CardDescription></CardHeader><CardContent><Button onClick={()=>navigate("/developer/project-finance/projects/new")}><Plus className="mr-2 h-4 w-4"/>Create Project</Button></CardContent></Card>:null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((p,i)=>{const scenario=latestScenarios[i];const latestUw=underwritingQueries[i]?.data?.[0];return <Card key={p.id} className="flex flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{p.name}</CardTitle><CardDescription>{humanize(p.technology)} · {p.state_code||"State not set"}</CardDescription></div><Badge variant="outline">{humanize(p.development_status)}</Badge></div></CardHeader><CardContent className="flex flex-1 flex-col gap-4"><div className="grid grid-cols-2 gap-3 text-sm"><div><div className="text-muted-foreground">Capacity</div><div className="font-medium">{capacity(p)}</div></div><div><div className="text-muted-foreground">Latest scenario</div><div className="font-medium">{scenario?.name||"None"}</div></div><div><div className="text-muted-foreground">Scenario state</div><div className="font-medium">{scenario?humanize(scenario.status):"None"}</div></div><div><div className="text-muted-foreground">Latest underwriting</div><div className="font-medium">{latestUw?.overall_status?humanize(latestUw.overall_status):"None"}</div></div></div><div className="text-xs text-muted-foreground">Last updated {new Date(p.updated_at).toLocaleString()}</div><div className="mt-auto flex gap-2"><Button className="flex-1" asChild><Link href={`/developer/project-finance/projects/${p.id}`}><FolderKanban className="mr-2 h-4 w-4"/>Open Project</Link></Button><Button variant="outline" size="icon" aria-label={`Archive ${p.name}`} disabled={archive.isPending} onClick={()=>archive.mutate(p.id)}><Archive className="h-4 w-4"/></Button></div></CardContent></Card>})}</div>
  </DashboardLayout>;
}
