import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SectionTag } from "../ui/SectionTag.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { DataSourceAttribution } from "../../compliance/components/DataSourceAttribution.js";
import { palette } from "../../config/palette.js";
import {
  daylightFractionElapsed,
  getCurrentProductionKw,
  minutesToSolarNoon,
} from "../../utils/solar.js";

interface Props {
  projectName: string;
  latitude: number;
  longitude: number;
  capacityKw: number;
  /** Latest verified month's production (kWh) — anchors the accumulators. */
  monthlyKwh: number;
}

const TICK_MS = 2000;

// Gauge geometry: semicircle from 180° (0 kW) to 0° (capacity).
const GAUGE_W = 260;
const GAUGE_H = 140;
const CX = GAUGE_W / 2;
const CY = GAUGE_H - 10;
const R = 110;

function arcPath(startAngle: number, endAngle: number): string {
  const sx = CX + R * Math.cos(Math.PI - startAngle);
  const sy = CY - R * Math.sin(Math.PI - startAngle);
  const ex = CX + R * Math.cos(Math.PI - endAngle);
  const ey = CY - R * Math.sin(Math.PI - endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

/**
 * Simulated real-time production gauge (differentiation spec §2). Output
 * follows actual solar position at the project's coordinates: sine-of-
 * elevation base, ±5% tick noise, occasional cloud dips, zero at night
 * ("Awaiting sunrise"). Honestly labeled — real telemetry arrives with the
 * SolarEdge API once a project is onboarded.
 */
export function LiveProductionMeter({
  projectName,
  latitude,
  longitude,
  capacityKw,
  monthlyKwh,
}: Props) {
  const [outputKw, setOutputKw] = useState(() =>
    Math.round(getCurrentProductionKw(latitude, longitude, capacityKw, new Date())),
  );
  const [cloudy, setCloudy] = useState(false);
  const cloudFactorRef = useRef(1);

  useEffect(() => {
    // Cloud events: every 5–15 min the sky dips 10–30% for 1–3 min.
    let cloudTimer: ReturnType<typeof setTimeout>;
    const scheduleCloud = () => {
      cloudTimer = setTimeout(() => {
        cloudFactorRef.current = 1 - (0.1 + Math.random() * 0.2);
        setCloudy(true);
        setTimeout(() => {
          cloudFactorRef.current = 1;
          setCloudy(false);
          scheduleCloud();
        }, (60 + Math.random() * 120) * 1000);
      }, (300 + Math.random() * 600) * 1000);
    };
    scheduleCloud();

    const tick = () => {
      if (document.hidden) return;
      const noise = (1 + (Math.random() - 0.5) * 0.1) * cloudFactorRef.current;
      setOutputKw(
        Math.round(getCurrentProductionKw(latitude, longitude, capacityKw, new Date(), noise)),
      );
    };
    const interval = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(cloudTimer);
    };
  }, [latitude, longitude, capacityKw]);

  const now = new Date();
  const isNight = getCurrentProductionKw(latitude, longitude, capacityKw, now) === 0 && outputKw === 0;
  const pctCapacity = capacityKw > 0 ? (outputKw / capacityKw) * 100 : 0;

  // Accumulators anchored to the latest verified month.
  const dailyAvgKwh = monthlyKwh / 30;
  const todayKwh = Math.round(dailyAvgKwh * daylightFractionElapsed(latitude, longitude, now));
  const monthToDateMwh = Math.round((monthlyKwh / 1000) * 10) / 10;

  const noonMinutes = minutesToSolarNoon(longitude, now);
  const noonLabel =
    noonMinutes > 0
      ? `Solar noon in ${Math.floor(noonMinutes / 60)}h ${noonMinutes % 60}m`
      : `Solar noon ${Math.floor(-noonMinutes / 60)}h ${-noonMinutes % 60}m ago`;

  // Needle angle: 180° sweep, 0 kW = pointing left.
  const needleDeg = -90 + Math.max(0, Math.min(1, outputKw / capacityKw)) * 180;

  return (
    <section
      className="border border-darkBg/10 bg-white p-5"
      aria-label="Illustrative production gauge"
      data-testid="live-production-meter"
    >
      <SectionTag>Illustrative Production Gauge</SectionTag>
      <h2 className="font-heading text-xl text-darkBg">{projectName}</h2>

      {isNight ? (
        <div className="mt-6 flex flex-col items-center gap-2 py-8" data-testid="meter-night">
          <Moon className="h-10 w-10 text-lightGreen" aria-hidden />
          <p className="font-mono text-sm uppercase tracking-wider text-textMuted">
            Awaiting sunrise
          </p>
          <p className="text-xs text-textMuted">{noonLabel}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center" data-testid="meter-day">
          <svg viewBox={`0 0 ${GAUGE_W} ${GAUGE_H}`} className="w-full max-w-[320px]">
            <defs>
              <linearGradient id="gaugeArc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={palette.lightGreen} />
                <stop offset="55%" stopColor={palette.accentBrt} />
                <stop offset="100%" stopColor={palette.medGreen} />
              </linearGradient>
            </defs>
            <path
              d={arcPath(0, Math.PI)}
              fill="none"
              stroke={palette.paleGreen}
              strokeWidth={12}
              strokeLinecap="butt"
            />
            <path
              d={arcPath(0, Math.max(0.02, Math.min(1, outputKw / capacityKw)) * Math.PI)}
              fill="none"
              stroke="url(#gaugeArc)"
              strokeWidth={12}
              strokeLinecap="butt"
              style={{ transition: "d 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            {/* Needle — CSS spring-approximation transition on rotation. */}
            <g
              style={{
                transform: `rotate(${needleDeg}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
                transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <line
                x1={CX}
                y1={CY}
                x2={CX}
                y2={CY - R + 22}
                stroke={palette.darkBg}
                strokeWidth={2.5}
              />
              <circle cx={CX} cy={CY} r={5} fill={palette.darkBg} />
            </g>
          </svg>

          <p className="-mt-6 font-mono text-3xl font-semibold tabular-nums text-darkBg">
            <AnimatedNumber value={outputKw} format={(n) => Math.round(n).toLocaleString("en-US")} />{" "}
            <span className="text-base font-normal text-textMuted">kW</span>
          </p>
          <p className="font-mono text-xs tabular-nums text-textMuted">
            {pctCapacity.toFixed(1)}% capacity
          </p>

          {/* Linear capacity bar */}
          <div className="mt-3 flex w-full max-w-[320px] items-center gap-2 font-mono text-[10px] text-textMuted">
            <span>0 kW</span>
            <div className="h-2 flex-1 bg-paleGreen/50">
              <div
                className="h-full bg-accentBrt transition-all duration-700"
                style={{ width: `${Math.min(100, pctCapacity)}%` }}
              />
            </div>
            <span>{capacityKw.toLocaleString("en-US")} kW</span>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-baseline justify-center gap-x-8 gap-y-1 border-t border-darkBg/10 pt-4 font-mono text-sm tabular-nums text-darkBg">
        <span>
          <span className="text-textMuted">Today:</span> {todayKwh.toLocaleString("en-US")} kWh
        </span>
        <span>
          <span className="text-textMuted">This Month:</span> {monthToDateMwh.toLocaleString("en-US")} MWh
        </span>
      </div>

      {!isNight ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-textMuted">
          <Sun className="h-3.5 w-3.5 text-flagAmber" aria-hidden />
          {noonLabel} · {cloudy ? "Partly cloudy" : "Clear conditions"}
        </p>
      ) : null}

      <DataSourceAttribution
        sources={[
          { name: "Simulated (solar-position model)", type: "model" },
          { name: "Planned SolarEdge connector (not connected)", type: "inverter" },
        ]}
        isEstimate
      />
    </section>
  );
}
