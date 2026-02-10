import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  Loader2,
} from "lucide-react";

interface PersonaStatusResponse {
  personaStatus: string;
  personaVerifiedAt: string | null;
  personaInquiryId: string | null;
}

export function IdentityVerificationCard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const personaClientRef = useRef<any>(null);

  const { data: statusData } = useQuery<PersonaStatusResponse>({
    queryKey: ["/api/persona/status"],
    enabled: !!user && user.role !== "ADMIN",
    refetchInterval: user?.personaStatus === "pending" ? 10000 : false,
  });

  const personaStatus = statusData?.personaStatus || user?.personaStatus || "not_started";
  const verifiedAt = statusData?.personaVerifiedAt;

  const startVerification = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await apiRequest("POST", "/api/persona/inquiry");
      const data = await res.json();

      if (data.status === "completed") {
        toast({ title: "Already Verified", description: "Your identity has been verified." });
        await refreshUser();
        setIsStarting(false);
        return;
      }

      const { inquiryId, sessionToken } = data;

      const Persona = await import("persona");
      const client = new Persona.Client({
        inquiryId,
        sessionToken,
        environment: "sandbox",
        onComplete: async ({ inquiryId: completedId, status }: { inquiryId: string; status: string }) => {
          queryClient.invalidateQueries({ queryKey: ["/api/persona/status"] });
          await refreshUser();
          toast({
            title: "Verification Submitted",
            description: "Your identity verification is being reviewed.",
          });
        },
        onCancel: ({ inquiryId: cancelledId, sessionToken: cancelledToken }: { inquiryId?: string; sessionToken?: string }) => {
          toast({
            title: "Verification Cancelled",
            description: "You can resume verification at any time.",
          });
        },
        onError: (error: any) => {
          console.error("Persona error:", error);
          toast({
            title: "Verification Error",
            description: "An error occurred during verification. Please try again.",
            variant: "destructive",
          });
        },
      });

      personaClientRef.current = client;
      client.open();
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message || "Failed to start verification",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }, [refreshUser, toast]);

  if (!user || user.role === "ADMIN") return null;

  const getStatusConfig = () => {
    switch (personaStatus) {
      case "completed":
        return {
          icon: ShieldCheck,
          iconClass: "text-emerald-400",
          badge: <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verified</Badge>,
          description: verifiedAt
            ? `Verified on ${new Date(verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : "Identity verification complete",
          buttonText: null,
        };
      case "pending":
        return {
          icon: Clock,
          iconClass: "text-amber-400",
          badge: <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>,
          description: "Your verification is being reviewed",
          buttonText: "Continue Verification",
        };
      case "failed":
        return {
          icon: ShieldAlert,
          iconClass: "text-red-400",
          badge: <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>,
          description: "Verification unsuccessful. You can retry.",
          buttonText: "Retry Verification",
        };
      default:
        return {
          icon: ShieldQuestion,
          iconClass: "text-muted-foreground",
          badge: <Badge variant="outline" className="bg-muted text-muted-foreground">Not Verified</Badge>,
          description: "Verify your identity to access all platform features",
          buttonText: "Verify Identity",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card data-testid="card-identity-verification">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${config.iconClass}`} />
          Identity Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {config.badge}
            <span className="text-sm text-muted-foreground" data-testid="text-persona-status-description">
              {config.description}
            </span>
          </div>
          {config.buttonText && (
            <Button
              variant={personaStatus === "not_started" ? "default" : "outline"}
              size="sm"
              onClick={startVerification}
              disabled={isStarting}
              data-testid="button-verify-identity"
            >
              {isStarting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {config.buttonText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
