import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { 
  Plus, 
  FolderKanban, 
  Sun, 
  Wind, 
  Zap, 
  HelpCircle,
  MapPin,
  Gauge,
  ArrowRight
} from "lucide-react";
import type { Project } from "@shared/schema";

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

export default function IssuerProjects() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/issuer/projects"],
  });

  return (
    <DashboardLayout
      title="Projects"
      description="Manage your renewable energy projects"
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Projects" }
      ]}
      actions={
        <Link href="/issuer/projects/new">
          <Button className="gap-2" data-testid="button-new-project">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !projects?.length ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first renewable energy project to get started with securities issuance"
              action={
                <Link href="/issuer/projects/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const Icon = assetTypeIcons[project.assetType] || HelpCircle;
            const colorClass = assetTypeColors[project.assetType] || assetTypeColors.OTHER;

            return (
              <Link key={project.id} href={`/issuer/projects/${project.id}`}>
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <StatusBadge status={project.status} type="project" />
                    </div>
                    
                    <h3 className="font-semibold mb-1" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize mb-4">
                      {project.assetType.toLowerCase()}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{project.location}</span>
                      </div>
                      {project.capacityMW && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Gauge className="h-4 w-4" />
                          <span>{project.capacityMW} MW</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-border/50">
                      <span className="text-sm text-primary flex items-center gap-1">
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
