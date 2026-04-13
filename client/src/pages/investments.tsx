import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Building2,
  MapPin,
  Zap,
  BarChart3,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  location: string;
  capacity_mw: number | string | null;
  status: string;
  [key: string]: unknown;
}

function StatusBadgeCell({ status }: { status: string }) {
  if (status === "Under SGT Review") {
    return (
      <span className="relative inline-flex">
        <Badge className="border-yellow-500/40 bg-yellow-500/15 text-yellow-400 shadow-none">
          {status}
        </Badge>
        <span className="absolute inset-0 rounded-md bg-yellow-400/20 animate-pulse" />
      </span>
    );
  }

  const map: Record<string, string> = {
    Active: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    Approved: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    Pending: "border-orange-500/40 bg-orange-500/15 text-orange-400",
    Rejected: "border-red-500/40 bg-red-500/15 text-red-400",
    Draft: "border-zinc-500/40 bg-zinc-500/15 text-zinc-400",
  };

  const colors =
    map[status] ?? "border-zinc-500/40 bg-zinc-500/15 text-zinc-400";

  return (
    <Badge className={`${colors} shadow-none`}>
      {status}
    </Badge>
  );
}

function formatCapacity(value: number | string | null): string {
  if (value === null || value === undefined) return "--";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "--";
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 1 })} MW`;
}

async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Project[];
}

export default function InvestmentDashboard() {
  const {
    data: projects,
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["supabase-projects"],
    queryFn: fetchProjects,
  });

  const totalCapacity = projects?.reduce((sum, p) => {
    const val =
      typeof p.capacity_mw === "string"
        ? parseFloat(p.capacity_mw)
        : p.capacity_mw ?? 0;
    return sum + (isNaN(val as number) ? 0 : (val as number));
  }, 0);

  const underReview =
    projects?.filter((p) => p.status === "Under SGT Review").length ?? 0;

  return (
    <DashboardLayout
      title="Investment Dashboard"
      description="Portfolio overview across all energy projects"
    >
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {projects?.length ?? 0}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Aggregate Capacity
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {totalCapacity?.toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    MW
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
              <BarChart3 className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Under SGT Review</p>
              {isLoading ? (
                <Skeleton className="h-7 w-10 mt-1" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {underReview}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projects</CardTitle>
          <CardDescription>
            All energy projects sourced from Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-4 opacity-60" />
              <p className="font-medium text-destructive">
                Failed to load projects
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error).message}
              </p>
            </div>
          ) : !projects?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
              <p className="font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add projects to your Supabase &ldquo;projects&rdquo; table to
                see them here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[35%]">Name</TableHead>
                  <TableHead className="w-[30%]">Location</TableHead>
                  <TableHead className="w-[15%] text-right">
                    Capacity
                  </TableHead>
                  <TableHead className="w-[20%] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {project.location || "--"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCapacity(project.capacity_mw)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadgeCell status={project.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
