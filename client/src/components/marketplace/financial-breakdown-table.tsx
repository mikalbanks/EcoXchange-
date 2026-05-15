import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ConfidenceBadge } from "./confidence-badge";

type Confidence = "KNOWN" | "ESTIMATED" | "MARKET_PROXY";

export interface FinancialField<T> {
  value: T;
  confidence: Confidence;
  source: string;
  asOf: string;
}

interface BreakdownRow {
  label: string;
  field: FinancialField<number>;
  format: "usd" | "usd_per_kwh" | "kwh" | "pct" | "multiple";
}

function format(value: number, kind: BreakdownRow["format"]): string {
  if (!Number.isFinite(value)) return "—";
  switch (kind) {
    case "usd":
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value >= 1000 ? 0 : 2,
      });
    case "usd_per_kwh":
      return `$${value.toFixed(4)}/kWh`;
    case "kwh":
      return `${Math.round(value).toLocaleString("en-US")} kWh`;
    case "pct":
      return `${value.toFixed(2)}%`;
    case "multiple":
      return `${value.toFixed(2)}×`;
  }
}

export function FinancialBreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  return (
    <Table>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label} data-testid={`breakdown-${row.label.replace(/\s+/g, "-").toLowerCase()}`}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right font-mono">{format(row.field.value, row.format)}</TableCell>
            <TableCell className="w-32">
              <ConfidenceBadge confidence={row.field.confidence} source={row.field.source} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
