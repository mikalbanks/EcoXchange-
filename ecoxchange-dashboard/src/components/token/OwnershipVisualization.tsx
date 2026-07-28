import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { SectorProps } from "recharts";
import { activeNetwork, shortAddress } from "../../config/contracts.js";
import { DEMO_OFFERING } from "../../data/demo-offering.js";
import { DEMO_HOLDERS } from "../../data/demo-wallets.js";
import { formatUsd } from "../../utils/formatters.js";

// Canonical token economics (data/demo-offering.ts): 25,000 ESN total supply at
// $100/token — the demo user's 100 ESN is exactly the 0.4% (40 bps) share used
// across Portfolio, distributions, and the USDC simulation. Cap table derives
// straight from DEMO_HOLDERS so there is a single source of truth.
export const TOKEN_TOTAL_SUPPLY = DEMO_OFFERING.total_tokens;
export const TOKEN_PRICE_USD = DEMO_OFFERING.token_price_usd;

interface HolderSlice {
  label: string;
  address: string;
  tokenCount: number;
  ownershipPct: number;
  isUser: boolean;
}

const HOLDERS: HolderSlice[] = DEMO_HOLDERS.map((h) => ({
  label: h.label,
  address: h.address,
  tokenCount: (TOKEN_TOTAL_SUPPLY * h.shareBps) / 10_000,
  ownershipPct: h.shareBps / 100,
  isUser: h.label === "Your Wallet",
}));

const USER = HOLDERS.find((h) => h.isUser)!;
const USER_INDEX = HOLDERS.indexOf(USER);

// Graduated brand greens for non-user slices; user slice gets accentBrt.
const SLICE_COLORS = ["#2E7D52", "#3D8B60", "#4C996E", "#5BA77C", "#6AB58A", "#8DC4A4", "#9CCDB0", "#ABD6BC", "#BADFC8", "#C8E8D4", "#7A9B6D"];

function sliceColor(index: number, isUser: boolean): string {
  if (isUser) return "#76C945";
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

// The user's slice renders with a +6px extended radius (spec criterion 18).
function renderSlice(props: SectorProps & { isUser?: boolean }) {
  const extend = props.isUser ? 6 : 0;
  return (
    <Sector
      {...props}
      outerRadius={(props.outerRadius ?? 0) + extend}
      stroke="#FFFFFF"
      strokeWidth={1}
    />
  );
}

const TOP_N = 5;
const topHolders = [...HOLDERS].sort((a, b) => b.ownershipPct - a.ownershipPct).slice(0, TOP_N);
const othersPct = Math.round((100 - topHolders.reduce((s, h) => s + h.ownershipPct, 0)) * 10) / 10;
const maxTopPct = topHolders[0]?.ownershipPct ?? 1;

/**
 * ESN cap-table visualization (differentiation spec §4): donut of all 12
 * holders (user slice highlighted + extended), center supply/holder label,
 * user position panel with a BaseScan address link, and a top-5 bar list.
 */
export function OwnershipVisualization() {
  return (
    <div
      className="border border-darkBg/10 bg-white p-5"
      data-testid="ownership-visualization"
    >
      <p className="font-mono text-xs text-textMuted">
        ESN-SAV-5MW · {TOKEN_TOTAL_SUPPLY.toLocaleString("en-US")} total supply
      </p>

      <div className="mt-3 grid gap-6 sm:grid-cols-[1fr_220px]">
        <div className="relative h-64" data-testid="ownership-donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={HOLDERS}
                dataKey="ownershipPct"
                nameKey="label"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={1}
                activeIndex={USER_INDEX}
                activeShape={(props: SectorProps) => renderSlice({ ...props, isUser: true })}
                isAnimationActive
                animationDuration={800}
              >
                {HOLDERS.map((holder, i) => (
                  <Cell key={holder.address} fill={sliceColor(i, holder.isUser)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, item) => {
                  const h = item?.payload as HolderSlice | undefined;
                  return [
                    `${h?.tokenCount.toLocaleString("en-US")} ESN · ${value.toFixed(1)}%`,
                    h?.label ?? "",
                  ];
                }}
                contentStyle={{ borderRadius: 0, border: "1px solid #C8E8D4", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-xl font-semibold tabular-nums text-darkBg">
              {TOKEN_TOTAL_SUPPLY.toLocaleString("en-US")}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-textMuted">
              ESN total
            </p>
            <p className="mt-1 font-mono text-[10px] text-textMuted">
              {HOLDERS.length} holders
            </p>
          </div>
        </div>

        {/* User position panel */}
        <div className="border border-accentBrt/40 bg-accentBrt/10 p-4" data-testid="user-position">
          <p className="font-mono text-[10px] uppercase tracking-wider text-medGreen">
            Your Wallet
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-darkBg">
            {USER.tokenCount.toLocaleString("en-US")} ESN
          </p>
          <p className="mt-1 font-mono text-sm tabular-nums text-darkBg">
            {USER.ownershipPct.toFixed(1)}% share
          </p>
          <p className="font-mono text-sm tabular-nums text-darkBg">
            {formatUsd(USER.tokenCount * TOKEN_PRICE_USD)} value
          </p>
          <a
            href={`${activeNetwork.explorerUrl}/address/${activeNetwork.contracts.token}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs font-medium text-medGreen underline-offset-2 hover:underline"
          >
            View on BaseScan →
          </a>
        </div>
      </div>

      {/* Top-5 holders */}
      <div className="mt-5" data-testid="top-holders">
        <p className="font-mono text-[10px] uppercase tracking-wider text-textMuted">
          Top {TOP_N} Holders
        </p>
        <div className="mt-2 space-y-1.5">
          {topHolders.map((holder) => (
            <div key={holder.address} className="flex items-center gap-3 font-mono text-xs">
              <span className="w-24 truncate text-darkBg">{holder.label}</span>
              <div className="h-3 flex-1 bg-paleGreen/30">
                <div
                  className="h-full"
                  style={{
                    width: `${(holder.ownershipPct / maxTopPct) * 100}%`,
                    backgroundColor: holder.isUser ? "#76C945" : "#2E7D52",
                  }}
                />
              </div>
              <span className="w-20 text-right tabular-nums text-textMuted">
                {holder.ownershipPct.toFixed(1)}% · {shortAddress(holder.address)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="w-24 text-textMuted">Others</span>
            <div className="h-3 flex-1 bg-paleGreen/30">
              <div
                className="h-full bg-lightGreen/60"
                style={{ width: `${(othersPct / maxTopPct) * 100}%` }}
              />
            </div>
            <span className="w-20 text-right tabular-nums text-textMuted">{othersPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
