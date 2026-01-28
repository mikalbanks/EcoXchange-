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
  Store, 
  DollarSign,
  TrendingUp,
  Calendar,
  Sun,
  Wind,
  Zap,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import type { Offering } from "@shared/schema";

interface MarketplaceOffering extends Offering {
  projectName: string;
  assetType: string;
}

const assetTypeIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDROGEN: Zap,
  OTHER: HelpCircle,
};

export default function InvestorMarketplace() {
  const { data: offerings, isLoading } = useQuery<MarketplaceOffering[]>({
    queryKey: ["/api/offerings/marketplace"],
  });

  return (
    <DashboardLayout
      title="Marketplace"
      description="Browse open investment opportunities"
      breadcrumbs={[
        { label: "Investor", href: "/investor" },
        { label: "Marketplace" }
      ]}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !offerings?.length ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Store}
              title="No open offerings"
              description="There are no offerings available for investment at this time. Check back soon!"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offerings.map((offering) => {
            const Icon = assetTypeIcons[offering.assetType] || HelpCircle;
            
            return (
              <Card key={offering.id} className="hover-elevate relative overflow-visible">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold" data-testid={`text-offering-name-${offering.id}`}>
                          {offering.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{offering.projectName}</p>
                      </div>
                    </div>
                    <StatusBadge status={offering.status} type="offering" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">Target Raise</span>
                      </div>
                      <p className="font-medium text-sm">${Number(offering.targetRaise).toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">Min Investment</span>
                      </div>
                      <p className="font-medium text-sm">${Number(offering.minInvestment).toLocaleString()}</p>
                    </div>
                    {offering.expectedIrr && (
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">Expected IRR</span>
                        </div>
                        <p className="font-medium text-sm text-primary">{offering.expectedIrr}%</p>
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">Distribution</span>
                      </div>
                      <p className="font-medium text-sm capitalize">{offering.distributionFrequency.toLowerCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {offering.securityType.toLowerCase()}
                    </Badge>
                    <Link href={`/investor/offerings/${offering.id}`}>
                      <Button size="sm" className="gap-1" data-testid={`button-view-offering-${offering.id}`}>
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
