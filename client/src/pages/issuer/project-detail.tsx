import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Sun, 
  Wind, 
  Zap, 
  HelpCircle,
  MapPin,
  Gauge,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  FileStack
} from "lucide-react";
import type { Project, Offering } from "@shared/schema";

const assetTypeIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDROGEN: Zap,
  OTHER: HelpCircle,
};

const assetTypeColors: Record<string, string> = {
  SOLAR: "text-yellow-500 bg-yellow-500/10",
  WIND: "text-cyan-500 bg-cyan-500/10",
  HYDROGEN: "text-emerald-500 bg-emerald-500/10",
  OTHER: "text-muted-foreground bg-muted",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/issuer/projects", id],
  });

  const { data: offerings } = useQuery<Offering[]>({
    queryKey: ["/api/issuer/projects", id, "offerings"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/issuer" },
          { label: "Projects", href: "/issuer/projects" },
          { label: "Loading..." }
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: "Issuer", href: "/issuer" },
          { label: "Projects", href: "/issuer/projects" },
          { label: "Not Found" }
        ]}
      >
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Project not found</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const Icon = assetTypeIcons[project.assetType] || HelpCircle;
  const colorClass = assetTypeColors[project.assetType] || assetTypeColors.OTHER;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Projects", href: "/issuer/projects" },
        { label: project.name }
      ]}
      actions={
        <Link href={`/issuer/offerings/new?projectId=${project.id}`}>
          <Button className="gap-2" data-testid="button-create-offering">
            <Plus className="h-4 w-4" />
            Create Offering
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${colorClass}`}>
                <Icon className="h-8 w-8" />
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold" data-testid="text-project-name">
                    {project.name}
                  </h1>
                  <StatusBadge status={project.status} type="project" />
                </div>
                
                <p className="text-muted-foreground mb-4 capitalize">
                  {project.assetType.toLowerCase()} Project
                </p>

                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {project.description}
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{project.location}</span>
                  </div>
                  {project.capacityMW && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{project.capacityMW} MW</span>
                    </div>
                  )}
                  {project.ppaCounterparty && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{project.ppaCounterparty}</span>
                    </div>
                  )}
                  {project.ppaTenorYears && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{project.ppaTenorYears} year PPA</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Project Offerings</CardTitle>
            <Link href={`/issuer/offerings/new?projectId=${project.id}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                New Offering
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!offerings?.length ? (
              <div className="text-center py-8">
                <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No offerings for this project yet</p>
                <Link href={`/issuer/offerings/new?projectId=${project.id}`}>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Offering
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {offerings.map((offering) => (
                  <Link 
                    key={offering.id} 
                    href={`/issuer/offerings/${offering.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{offering.name}</span>
                        <StatusBadge status={offering.status} type="offering" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Target: ${Number(offering.targetRaise).toLocaleString()}
                        </span>
                        <span className="capitalize">{offering.securityType.toLowerCase()}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {offering.distributionFrequency.toLowerCase()}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
