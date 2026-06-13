import React from "react";
import { Svg, Rect, Line, Text, Polyline } from "@react-pdf/renderer";
import { colors, MONO } from "../styles/reportStyles";

export interface BarDatum {
  label: string; // x-axis label (e.g. "Jan")
  value: number; // primary series
  value2?: number; // optional secondary (overlaid as outline)
}

interface BarChartSVGProps {
  data: BarDatum[];
  width: number;
  height: number;
  color?: string; // primary bar fill
  color2?: string; // secondary outline stroke
  /** Format a value for the y-axis ticks. */
  yFormatter?: (v: number) => string;
  /** Draw ±tolerance dashed band around the primary series (fraction, e.g. 0.15). */
  tolerance?: number;
  /** Draw a dashed horizontal reference line at this value (data units). */
  averageLine?: number;
  averageLabel?: string;
}

const padL = 40;
const padR = 14;
const padT = 12;
const padB = 20;

export function BarChartSVG({
  data,
  width,
  height,
  color = colors.darkGreen,
  color2,
  yFormatter = (v) => String(Math.round(v)),
  tolerance,
  averageLine,
  averageLabel,
}: BarChartSVGProps) {
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = Math.max(1, data.length);

  const rawMax = Math.max(
    ...data.map((d) => Math.max(d.value, d.value2 ?? 0)),
    averageLine ?? 0,
    1,
  );
  const upperBand = tolerance ? rawMax * (1 + tolerance) : rawMax;
  const maxVal = Math.max(rawMax, upperBand) * 1.1;

  const slot = plotW / n;
  const grouped = data.some((d) => d.value2 != null);
  const barW = grouped ? slot * 0.3 : slot * 0.55;

  const xCenter = (i: number) => padL + slot * i + slot / 2;
  const yOf = (v: number) => padT + plotH * (1 - v / maxVal);
  const baseY = padT + plotH;

  const ticks = [0, maxVal / 2, maxVal];

  const upperPoints = data
    .map((d, i) => `${xCenter(i)},${yOf(d.value * (1 + (tolerance ?? 0)))}`)
    .join(" ");
  const lowerPoints = data
    .map((d, i) => `${xCenter(i)},${yOf(d.value * (1 - (tolerance ?? 0)))}`)
    .join(" ");

  return (
    <Svg width={width} height={height}>
      {/* Gridlines + y ticks */}
      {ticks.map((t, i) => (
        <React.Fragment key={`g${i}`}>
          <Line
            x1={padL}
            y1={yOf(t)}
            x2={padL + plotW}
            y2={yOf(t)}
            stroke={colors.border}
            strokeWidth={0.5}
          />
          <Text
            x={padL - 4}
            y={yOf(t) + 2}
            style={{ fontFamily: MONO, fontSize: 6, fill: colors.muted }}
            textAnchor="end"
          >
            {yFormatter(t)}
          </Text>
        </React.Fragment>
      ))}

      {/* Axes */}
      <Line x1={padL} y1={padT} x2={padL} y2={baseY} stroke={colors.muted} strokeWidth={0.75} />
      <Line x1={padL} y1={baseY} x2={padL + plotW} y2={baseY} stroke={colors.muted} strokeWidth={0.75} />

      {/* Tolerance band */}
      {tolerance && (
        <>
          <Polyline
            points={upperPoints}
            fill="none"
            stroke={colors.medGreen}
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
          <Polyline
            points={lowerPoints}
            fill="none"
            stroke={colors.medGreen}
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        </>
      )}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = xCenter(i);
        if (grouped) {
          const gap = 1.5;
          const x1 = cx - barW - gap / 2;
          const x2 = cx + gap / 2;
          return (
            <React.Fragment key={`b${i}`}>
              <Rect x={x1} y={yOf(d.value)} width={barW} height={baseY - yOf(d.value)} fill={color} />
              {d.value2 != null && (
                <Rect
                  x={x2}
                  y={yOf(d.value2)}
                  width={barW}
                  height={baseY - yOf(d.value2)}
                  fill={colors.paleGreen}
                  stroke={color2 ?? colors.lime}
                  strokeWidth={0.75}
                />
              )}
            </React.Fragment>
          );
        }
        return (
          <Rect
            key={`b${i}`}
            x={cx - barW / 2}
            y={yOf(d.value)}
            width={barW}
            height={baseY - yOf(d.value)}
            fill={color}
          />
        );
      })}

      {/* Average line */}
      {averageLine != null && (
        <>
          <Line
            x1={padL}
            y1={yOf(averageLine)}
            x2={padL + plotW}
            y2={yOf(averageLine)}
            stroke={colors.lime}
            strokeWidth={0.9}
            strokeDasharray="3 2"
          />
          {averageLabel && (
            <Text
              x={padL + plotW}
              y={yOf(averageLine) - 2}
              style={{ fontFamily: MONO, fontSize: 6, fill: colors.medGreen }}
              textAnchor="end"
            >
              {averageLabel}
            </Text>
          )}
        </>
      )}

      {/* X labels */}
      {data.map((d, i) => (
        <Text
          key={`x${i}`}
          x={xCenter(i)}
          y={baseY + 10}
          style={{ fontFamily: MONO, fontSize: 6, fill: colors.muted }}
          textAnchor="middle"
        >
          {d.label}
        </Text>
      ))}
    </Svg>
  );
}
