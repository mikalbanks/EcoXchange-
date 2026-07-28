import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Scale, Zap } from "lucide-react";

export interface BuilderListing {
  id: string;
  source: "PROJECT" | "QUEUE";
  name: string;
  state: string;
  county: string | null;
  capacityMW: number;
  isOperating: boolean;
  cashYieldOnEquityPct: { value: number };
  unleveredCashYieldPct: { value: number };
}

export interface Allocation {
  listingId: string;
  listingSource: "PROJECT" | "QUEUE";
  weightPct: number;
}

interface Props {
  listings: BuilderListing[];
  allocations: Allocation[];
  hurdlePct: number;
  onChange: (next: Allocation[]) => void;
}

export function AllocationBuilder({ listings, allocations, hurdlePct, onChange }: Props) {
  const byId = new Map(listings.map((l) => [l.id, l]));
  const selected = new Set(allocations.map((a) => a.listingId));
  const total = allocations.reduce((s, a) => s + a.weightPct, 0);

  const add = (l: BuilderListing) => {
    // New positions come in at an equal share so the portfolio stays balanced
    // by default; the investor then tilts deliberately rather than by accident.
    const next = [...allocations, { listingId: l.id, listingSource: l.source, weightPct: 0 }];
    onChange(next.map((a) => ({ ...a, weightPct: Number((100 / next.length).toFixed(2)) })));
  };

  const remove = (listingId: string) => {
    onChange(allocations.filter((a) => a.listingId !== listingId));
  };

  const setWeight = (listingId: string, weightPct: number) => {
    onChange(
      allocations.map((a) =>
        a.listingId === listingId ? { ...a, weightPct: Math.max(0, Math.min(100, weightPct)) } : a,
      ),
    );
  };

  const normalize = () => {
    if (total <= 0) return;
    onChange(
      allocations.map((a) => ({ ...a, weightPct: Number(((a.weightPct / total) * 100).toFixed(2)) })),
    );
  };

  const equalWeight = () => {
    if (allocations.length === 0) return;
    const w = Number((100 / allocations.length).toFixed(2));
    onChange(allocations.map((a) => ({ ...a, weightPct: w })));
  };

  const tiltToYield = () => {
    // Weight in proportion to yield. Deliberately the most concentrated preset,
    // so the concentration warnings have something to argue with.
    const weights = allocations.map((a) => byId.get(a.listingId)?.cashYieldOnEquityPct.value ?? 0);
    const sum = weights.reduce((s, x) => s + x, 0);
    if (sum <= 0) return;
    onChange(
      allocations.map((a, i) => ({ ...a, weightPct: Number(((weights[i] / sum) * 100).toFixed(2)) })),
    );
  };

  const available = listings.filter((l) => !selected.has(l.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Your allocation</h3>
            <div className="flex items-center gap-2">
              <Badge
                variant={Math.abs(total - 100) < 0.5 ? "default" : "secondary"}
                data-testid="badge-total-weight"
              >
                {total.toFixed(1)}% allocated
              </Badge>
              <Button size="sm" variant="outline" onClick={normalize} data-testid="button-normalize">
                <Scale className="h-3.5 w-3.5 mr-1" />
                Normalize
              </Button>
              <Button size="sm" variant="outline" onClick={equalWeight} data-testid="button-equal-weight">
                Equal weight
              </Button>
              <Button size="sm" variant="outline" onClick={tiltToYield} data-testid="button-tilt-yield">
                <Zap className="h-3.5 w-3.5 mr-1" />
                Tilt to yield
              </Button>
            </div>
          </div>

          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No positions yet. Add assets below to build a portfolio.
            </p>
          ) : (
            <div className="space-y-2">
              {allocations.map((a) => {
                const l = byId.get(a.listingId);
                if (!l) return null;
                const clears = l.cashYieldOnEquityPct.value >= hurdlePct;
                return (
                  <div
                    key={a.listingId}
                    className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                    data-testid={`allocation-row-${a.listingId}`}
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="text-sm font-medium leading-tight">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.county ? `${l.county}, ` : ""}
                        {l.state} · {l.capacityMW.toFixed(1)} MW ·{" "}
                        {l.isOperating ? "Operating" : "Pre-COD"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono text-sm ${clears ? "" : "text-muted-foreground"}`}
                      >
                        {l.cashYieldOnEquityPct.value.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {l.unleveredCashYieldPct.value.toFixed(1)}% unlev
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={a.weightPct}
                        onChange={(e) => setWeight(a.listingId, Number(e.target.value))}
                        className="w-20 text-right font-mono"
                        data-testid={`input-weight-${a.listingId}`}
                        aria-label={`Weight for ${l.name}`}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(a.listingId)}
                      data-testid={`button-remove-${a.listingId}`}
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Available assets</h3>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Every listing is already allocated.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {available.map((l) => {
                const clears = l.cashYieldOnEquityPct.value >= hurdlePct;
                return (
                  <button
                    key={l.id}
                    onClick={() => add(l)}
                    className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-left hover:bg-muted/60 transition-colors"
                    data-testid={`button-add-${l.id}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.state} · {l.capacityMW.toFixed(1)} MW ·{" "}
                        {l.isOperating ? "Operating" : l.source === "QUEUE" ? "Queue" : "Pre-COD"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono text-sm ${clears ? "" : "text-muted-foreground"}`}>
                        {l.cashYieldOnEquityPct.value.toFixed(1)}%
                      </span>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
