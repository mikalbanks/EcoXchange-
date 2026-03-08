import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Loader2,
  TrendingUp,
  DollarSign,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Target,
} from "lucide-react";

interface AIPrediction {
  summary: string;
  projectedAnnualRevenue: string;
  estimatedIRR: string;
  paybackPeriod: string;
  fiveYearReturn: string;
  tenYearReturn: string;
  yieldOnCost: string;
  riskFactors: string[];
  strengths: string[];
  recommendation: string;
}

interface AIPredictionCardProps {
  projectId: string;
  projectName: string;
}

export function AIPredictionCard({ projectId, projectName }: AIPredictionCardProps) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/ai-prediction`);
      return res.json();
    },
    onSuccess: (data) => {
      setPrediction(data);
    },
  });

  if (!prediction) {
    return (
      <Card data-testid="card-ai-prediction-trigger">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Financial Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate an AI-powered ROI prediction based on {projectName}'s production data, PPA terms, and capital structure.
          </p>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full"
            data-testid="button-generate-prediction"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Financial Data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI ROI Analysis
              </>
            )}
          </Button>
          {mutation.isError && (
            <p className="text-sm text-destructive mt-2" data-testid="text-prediction-error">
              Failed to generate prediction. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="card-ai-prediction-result">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Financial Analysis
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30" data-testid="badge-ai-generated">
              AI Generated
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="text-prediction-summary">{prediction.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          label="Estimated IRR"
          value={prediction.estimatedIRR}
          testId="metric-irr"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label="Payback Period"
          value={prediction.paybackPeriod}
          testId="metric-payback"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
          label="Annual Revenue"
          value={prediction.projectedAnnualRevenue}
          testId="metric-revenue"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4 text-blue-400" />}
          label="Yield on Cost"
          value={prediction.yieldOnCost}
          testId="metric-yield"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MetricCard
          icon={<Target className="h-4 w-4 text-emerald-400" />}
          label="5-Year Return"
          value={prediction.fiveYearReturn}
          testId="metric-5yr"
        />
        <MetricCard
          icon={<Target className="h-4 w-4 text-blue-400" />}
          label="10-Year Return"
          value={prediction.tenYearReturn}
          testId="metric-10yr"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" data-testid="list-strengths">
              {prediction.strengths.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" data-testid="list-risks">
              {prediction.riskFactors.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-1">Recommendation</p>
          <p className="text-sm text-muted-foreground" data-testid="text-recommendation">{prediction.recommendation}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          data-testid="button-regenerate-prediction"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          Regenerate
        </Button>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
