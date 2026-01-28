import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileStack, 
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import type { Offering } from "@shared/schema";

interface OfferingWithProject extends Offering {
  projectName: string;
}

export default function IssuerOfferings() {
  const { data: offerings, isLoading } = useQuery<OfferingWithProject[]>({
    queryKey: ["/api/issuer/offerings"],
  });

  return (
    <DashboardLayout
      title="Offerings"
      description="Manage your securities offerings"
      breadcrumbs={[
        { label: "Issuer", href: "/issuer" },
        { label: "Offerings" }
      ]}
      actions={
        <Link href="/issuer/offerings/new">
          <Button className="gap-2" data-testid="button-new-offering">
            <Plus className="h-4 w-4" />
            New Offering
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !offerings?.length ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={FileStack}
              title="No offerings yet"
              description="Create your first offering to start raising capital from verified investors"
              action={
                <Link href="/issuer/offerings/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Offering
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offerings.map((offering) => (
            <Link key={offering.id} href={`/issuer/offerings/${offering.id}`}>
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold" data-testid={`text-offering-name-${offering.id}`}>
                          {offering.name}
                        </h3>
                        <StatusBadge status={offering.status} type="offering" />
                        <Badge variant="outline" className="capitalize">
                          {offering.securityType.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {offering.projectName}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Target: ${Number(offering.targetRaise).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Min: ${Number(offering.minInvestment).toLocaleString()}
                        </span>
                        {offering.expectedIrr && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            IRR: {offering.expectedIrr}%
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {offering.distributionFrequency.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-primary flex items-center gap-1">
                        Manage
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
