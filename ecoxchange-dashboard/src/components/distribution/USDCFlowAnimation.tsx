import { useEffect, useRef, useState } from "react";
import { palette } from "../../config/palette.js";
import { shortAddress } from "../../config/contracts.js";
import { holderAmountUsd, type DemoHolder } from "../../data/demo-wallets.js";
import { formatUsd } from "../../utils/formatters.js";
import { useAnimateNumber } from "../../hooks/useAnimateNumber.js";

interface Props {
  holders: DemoHolder[];
  poolUsd: number;
  /** Kicks off the radiating animation (step 3 turning active). */
  playing: boolean;
}

const W = 640;
const H = 420;
const CX = W / 2;
const CY = H / 2;
const RX = 250;
const RY = 158;
const STAGGER_MS = 120;
const TRAVEL_MS = 900;
const FRAME_MS = 1000 / 30; // 30fps cap, same discipline as SolarParticles

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * SVG visualization of step 3: the distribution contract at the center with
 * USDC dots radiating to each holder wallet (50–120ms stagger). When a dot
 * arrives its wallet node lights up and shows the received amount; once all
 * arrive the center counts up the total distributed. Desktop-only — mobile
 * and reduced-motion render <USDCFlowList/> instead (parent decides).
 */
export function USDCFlowAnimation({ holders, poolUsd, playing }: Props) {
  const [progress, setProgress] = useState<number[]>(() => holders.map(() => 0));
  const [allArrived, setAllArrived] = useState(false);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const { value: totalAnimated } = useAnimateNumber(allArrived ? poolUsd : 0, 800);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;

    const tick = (ts: number) => {
      if (cancelled) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      if (delta >= FRAME_MS) {
        lastTsRef.current = ts;
        // Tab hidden: hold elapsed time so the flow resumes, not skips.
        if (!document.hidden) elapsedRef.current += delta;
        const t = elapsedRef.current;
        const next = holders.map((_, i) => {
          const local = (t - i * STAGGER_MS) / TRAVEL_MS;
          return Math.max(0, Math.min(1, local));
        });
        setProgress(next);
        if (next.every((p) => p >= 1)) {
          setAllArrived(true);
          return; // animation finished
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    elapsedRef.current = 0;
    lastTsRef.current = null;
    setAllArrived(false);
    setProgress(holders.map(() => 0));
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, holders]);

  const nodes = holders.map((holder, i) => {
    const angle = (i / holders.length) * Math.PI * 2 - Math.PI / 2;
    return {
      holder,
      x: CX + RX * Math.cos(angle),
      y: CY + RY * Math.sin(angle),
      arrived: progress[i] >= 1,
      p: easeOutQuad(progress[i] ?? 0),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`USDC distribution: ${formatUsd(poolUsd)} flowing from the distribution contract to ${holders.length} holder wallets`}
      data-testid="usdc-flow-animation"
    >
      {/* connection lines */}
      {nodes.map(({ holder, x, y }) => (
        <line
          key={`line-${holder.address}`}
          x1={CX}
          y1={CY}
          x2={x}
          y2={y}
          stroke={palette.paleGreen}
          strokeWidth={1}
        />
      ))}

      {/* traveling USDC dots */}
      {nodes.map(({ holder, x, y, p, arrived }) =>
        p > 0 && !arrived ? (
          <circle
            key={`dot-${holder.address}`}
            cx={CX + (x - CX) * p}
            cy={CY + (y - CY) * p}
            r={5}
            fill={palette.accentBrt}
            opacity={0.9}
          />
        ) : null,
      )}

      {/* wallet nodes */}
      {nodes.map(({ holder, x, y, arrived }) => (
        <g key={`node-${holder.address}`}>
          <circle
            cx={x}
            cy={y}
            r={7}
            fill={arrived ? palette.accentBrt : palette.cream}
            stroke={arrived ? palette.medGreen : palette.lightGreen}
            strokeWidth={1.5}
          />
          <text
            x={x}
            y={y < CY ? y - 46 : y + 32}
            textAnchor="middle"
            fontSize={12.5}
            fontFamily="IBM Plex Mono, monospace"
            fill={palette.textMuted}
          >
            {shortAddress(holder.address)}
          </text>
          {arrived ? (
            <text
              x={x}
              y={y < CY ? y - 30 : y + 48}
              textAnchor="middle"
              fontSize={14}
              fontWeight={600}
              fontFamily="IBM Plex Mono, monospace"
              fill={palette.medGreen}
            >
              +{formatUsd(holderAmountUsd(poolUsd, holder.shareBps))}
            </text>
          ) : null}
        </g>
      ))}

      {/* center: distribution contract */}
      <rect
        x={CX - 74}
        y={CY - 34}
        width={148}
        height={68}
        fill={palette.darkBg}
        stroke={allArrived ? palette.accentBrt : palette.medGreen}
        strokeWidth={2}
      />
      <text
        x={CX}
        y={CY - 10}
        textAnchor="middle"
        fontSize={11.5}
        fontFamily="IBM Plex Mono, monospace"
        letterSpacing={1}
        fill={palette.paleGreen}
      >
        DISTRIBUTOR
      </text>
      <text
        x={CX}
        y={CY + 16}
        textAnchor="middle"
        fontSize={17}
        fontWeight={600}
        fontFamily="IBM Plex Mono, monospace"
        fill={palette.accentBrt}
      >
        {allArrived ? formatUsd(Math.round(totalAnimated)) : formatUsd(poolUsd)}
      </text>
    </svg>
  );
}

/**
 * Accessible fallback for mobile widths and prefers-reduced-motion: the same
 * information as the animation, as a plain stacked list.
 */
export function USDCFlowList({ holders, poolUsd }: Omit<Props, "playing">) {
  return (
    <ul className="divide-y divide-darkBg/5 border border-darkBg/10 bg-white" data-testid="usdc-flow-list">
      {holders.map((holder) => (
        <li key={holder.address} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-darkBg">{holder.label}</p>
            <p className="font-mono text-[11px] text-textMuted">{shortAddress(holder.address)}</p>
          </div>
          <span className="font-mono text-sm font-medium tabular-nums text-medGreen">
            +{formatUsd(holderAmountUsd(poolUsd, holder.shareBps))}
          </span>
        </li>
      ))}
    </ul>
  );
}
