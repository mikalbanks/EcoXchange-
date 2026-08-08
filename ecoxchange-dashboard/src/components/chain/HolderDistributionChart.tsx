import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { palette } from "../../config/palette.js";
import { CopyableDid } from "./CopyableDid.js";
import { shortDid } from "./did.js";
import type { ChainHolder } from "../../types/chain.js";

/**
 * Spec 18 § 2.8 — holder concentration.
 *
 * Concentration, not just a holder list: a security whose supply sits in two
 * wallets is a materially different instrument from one spread across two
 * hundred, and that is the thing a reader needs to see at a glance. The top
 * holder's share is stated in words above the chart for exactly that reason.
 */

const BAR_COLORS = [
  palette.darkBg,
  palette.medGreen,
  palette.accentBrt,
  palette.lightGreen,
  palette.paleGreen,
];

const MAX_BARS = 10;

export function HolderDistributionChart({
  holders,
  snapshotAt,
}: {
  holders: ChainHolder[];
  snapshotAt: string | null;
}) {
  if (holders.length === 0) {
    return (
      <p className="border border-darkBg/10 bg-white p-5 text-sm text-textMuted">
        No holder snapshot yet. Holders appear after the first chain sync.
      </p>
    );
  }

  // Balances are decimal strings. Parsing to float here is acceptable and
  // confined to chart geometry and a one-decimal percentage — recharts needs
  // numbers for axes. The exact figures stay strings and are shown by
  // DistributionHistoryTable and AssetSummaryCard, which never parse.
  const shown = holders.slice(0, MAX_BARS);
  const remainder = holders.length - shown.length;
  const total = holders.reduce((sum, h) => sum + (Number(h.balance) || 0), 0);

  const data = shown.map((h) => {
    const balance = Number(h.balance) || 0;
    return {
      did: h.holder_did,
      label: shortDid(h.holder_did, 6, 4),
      balance,
      exact: h.balance,
      pct: total > 0 ? (balance / total) * 100 : 0,
    };
  });

  const topPct = data[0]?.pct ?? 0;

  return (
    <div className="border border-darkBg/10 bg-white p-5">
      <p className="mb-4 text-sm text-textMuted">
        <span className="font-mono tabular-nums text-textDark">
          {holders.length.toLocaleString()}
        </span>{" "}
        {holders.length === 1 ? "holder" : "holders"}; the largest holds{" "}
        <span className="font-mono tabular-nums text-textDark">
          {topPct.toFixed(1)}%
        </span>{" "}
        of supply.
        {snapshotAt ? (
          <>
            {" "}
            Snapshot{" "}
            <span className="font-mono tabular-nums">
              {new Date(snapshotAt).toISOString().slice(0, 10)}
            </span>
            .
          </>
        ) : null}
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={palette.paleGreen}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: palette.textMuted, fontFamily: "IBM Plex Mono" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={54}
            />
            <YAxis
              tick={{ fontSize: 10, fill: palette.textMuted, fontFamily: "IBM Plex Mono" }}
              width={56}
            />
            <Tooltip
              cursor={{ fill: palette.glowGreen }}
              contentStyle={{
                backgroundColor: palette.white,
                border: `1px solid ${palette.paleGreen}`,
                borderRadius: 0,
                fontSize: 12,
                fontFamily: "IBM Plex Mono",
              }}
              formatter={(_value: number, _name, entry: any) => [
                `${entry?.payload?.exact ?? "—"} (${entry?.payload?.pct?.toFixed(1)}%)`,
                "Balance",
              ]}
              labelFormatter={(_label, payload) =>
                (payload?.[0]?.payload?.did as string) ?? ""
              }
            />
            <Bar dataKey="balance" radius={[0, 0, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.did}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {remainder > 0 ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-olive">
          § Showing top {MAX_BARS} of {holders.length} holders
        </p>
      ) : null}

      <ul className="mt-4 space-y-1.5 border-t border-paleGreen/60 pt-4">
        {shown.map((h, i) => (
          <li key={h.holder_did} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
              />
              <CopyableDid did={h.holder_did} />
            </span>
            <span className="font-mono tabular-nums text-xs text-textDark">
              {data[i].pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
