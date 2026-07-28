import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

type Risk = "INCOME" | "BALANCED" | "GROWTH";
type Accreditation = "ACCREDITED" | "NOT_ACCREDITED" | "UNKNOWN";

const SLEEVES: Array<{ key: Risk; title: string; body: string }> = [
  {
    key: "INCOME",
    title: "Income",
    body: "Operating assets with long contracted tails. Lower yield, lowest recontracting risk.",
  },
  {
    key: "BALANCED",
    title: "Balanced",
    body: "Mix of operating assets and late-stage construction across resource regions.",
  },
  {
    key: "GROWTH",
    title: "Growth",
    body: "Higher current yield from shorter contract tails and pre-COD assets. More variance.",
  },
];

export function FundOptInCard({ sourcePortfolioId }: { sourcePortfolioId?: string }) {
  const [email, setEmail] = useState("");
  const [checkSize, setCheckSize] = useState("250000");
  const [risk, setRisk] = useState<Risk>("BALANCED");
  const [accreditation, setAccreditation] = useState<Accreditation>("UNKNOWN");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/portfolio/fund-interest", {
        email,
        checkSizeUsd: Number(checkSize) || undefined,
        riskPreference: risk,
        accreditationStatus: accreditation,
        message: message || undefined,
        sourcePortfolioId,
      });
      return res.json();
    },
  });

  if (mutation.isSuccess) {
    return (
      <Card data-testid="card-fund-optin-success">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-primary" />
          <p className="font-medium">Interest recorded.</p>
          <p className="text-sm text-muted-foreground mt-1">
            We'll be in touch before the fund opens. Nothing has been committed and no securities
            have been offered or sold.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-fund-optin">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">EcoXchange Diversified Yield Fund</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rather than picking assets yourself, register interest in a managed sleeve that spreads
          capital across resource regions, offtaker types and contract expiries.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          <strong>This fund is prospective and is not being offered.</strong> The form below records
          interest only. It is not a subscription, not an offer to sell, and not a solicitation. Any
          future offering would be made under Reg D 506(c) to verified accredited investors through
          formal offering documents.
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Which sleeve fits your mandate?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SLEEVES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setRisk(s.key)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  risk === s.key ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                }`}
                data-testid={`button-sleeve-${s.key}`}
              >
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.body}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="fund-email" className="text-xs">
              Email
            </Label>
            <Input
              id="fund-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@fund.com"
              data-testid="input-fund-email"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fund-check" className="text-xs">
              Indicative check size (USD)
            </Label>
            <Input
              id="fund-check"
              type="number"
              min={0}
              step={25000}
              value={checkSize}
              onChange={(e) => setCheckSize(e.target.value)}
              data-testid="input-fund-check"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Accreditation status</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ACCREDITED", "Accredited"],
                ["NOT_ACCREDITED", "Not accredited"],
                ["UNKNOWN", "Prefer not to say"],
              ] as Array<[Accreditation, string]>
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={accreditation === key ? "default" : "outline"}
                onClick={() => setAccreditation(key)}
                data-testid={`button-accreditation-${key}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="fund-message" className="text-xs">
            Anything we should know? (optional)
          </Label>
          <Textarea
            id="fund-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Mandate constraints, target hold period, geographic restrictions…"
            data-testid="input-fund-message"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive" data-testid="text-fund-error">
            {(mutation.error as Error).message}
          </p>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!email.includes("@") || mutation.isPending}
          data-testid="button-submit-fund-interest"
        >
          {mutation.isPending ? "Recording…" : "Register interest"}
        </Button>
      </CardContent>
    </Card>
  );
}
