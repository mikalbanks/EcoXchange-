import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  CheckCircle,
  XCircle,
  ShieldCheck,
  Loader2
} from "lucide-react";
import type { User, InvestorProfile } from "@shared/schema";

interface InvestorUser {
  user: User;
  profile: InvestorProfile;
}

export default function AdminUsers() {
  const { toast } = useToast();

  const { data: investors, isLoading } = useQuery<InvestorUser[]>({
    queryKey: ["/api/admin/investors"],
  });

  const approveKycMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/approve-kyc`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "KYC Approved", description: "Investor verification has been approved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectKycMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/reject-kyc`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "KYC Rejected", description: "Investor verification has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setAccreditedMutation = useMutation({
    mutationFn: async ({ userId, accredited }: { userId: string; accredited: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/set-accredited`, { accredited });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({ 
        title: variables.accredited ? "Accredited" : "Accreditation Removed",
        description: `Investor accreditation status has been updated.`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout
      title="User Management"
      description="Manage investor KYC and accreditation"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Users" }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Investors</CardTitle>
          <CardDescription>
            Approve KYC and set accreditation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between p-4 border rounded-lg">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          ) : !investors?.length ? (
            <EmptyState
              icon={Users}
              title="No investors"
              description="Investor accounts will appear here"
            />
          ) : (
            <div className="space-y-4">
              {investors.map(({ user, profile }) => (
                <div 
                  key={user.id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border gap-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.email}</p>
                    {profile.fullName && (
                      <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <StatusBadge status={profile.kycStatus} type="kyc" />
                      {profile.accredited ? (
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Accredited
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not Accredited
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {profile.kycStatus === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveKycMutation.mutate(user.id)}
                          disabled={approveKycMutation.isPending}
                          className="gap-1"
                          data-testid={`button-approve-kyc-${user.id}`}
                        >
                          {approveKycMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve KYC
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectKycMutation.mutate(user.id)}
                          disabled={rejectKycMutation.isPending}
                          className="gap-1"
                          data-testid={`button-reject-kyc-${user.id}`}
                        >
                          {rejectKycMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {profile.kycStatus === "APPROVED" && !profile.accredited && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAccreditedMutation.mutate({ userId: user.id, accredited: true })}
                        disabled={setAccreditedMutation.isPending}
                        className="gap-1"
                        data-testid={`button-set-accredited-${user.id}`}
                      >
                        {setAccreditedMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Set Accredited
                      </Button>
                    )}

                    {profile.kycStatus === "APPROVED" && profile.accredited && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAccreditedMutation.mutate({ userId: user.id, accredited: false })}
                        disabled={setAccreditedMutation.isPending}
                        className="text-muted-foreground"
                      >
                        Remove Accreditation
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
