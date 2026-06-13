import React from "react";
import { Svg, Rect, Line, Text, Polyline, Circle } from "@react-pdf/renderer";
import { colors, MONO } from "../styles/reportStyles";

export interface DualDatum {
  label: string;
  bar: number; // left axis (capacity factor %)
  line: number; // right axis (cell temp °C)
}

interface DualAxisChartSVGProps {
  data: DualDatum[];
  width: number;
  height: number;
  barColor?: string;
  lineColor?: string;
  /** Horizontal reference line in right-axis (line) units, e.g. 25°C STC. */
  refLine?: number;
  refLabel?: string;
  leftFormatter?: (v: number) => string;
  rightFormatter?: (v: number) => string;
}

const padL = 30;
const padR = 30;
const padT = 12;
const padB = 20;

export function DualAxisChartSVG({
  data,
  width,
  height,
  barColor = colors.darkGreen,
  lineColor = colors.lime,
  refLine,
  refLabel,
  leftFormatter = (v) => `${Math.round(v)}`,
  rightFormatter = (v) => `${Math.round(v)}`,
}: DualAxisChartSVGProps) {
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = Math.max(1, data.length);

  const maxBar = Math.max(...data.map((d) => d.bar), 1) * 1.15;
  const maxLine = Math.max(...data.map((d) => d.line), refLine ?? 0, 1) * 1.15;

  const slot = plotW / n;
  const barW = slot * 0.5;
  const xCenter = (i: number) => padL + slot * i + slot / 2;
  const baseY = padT + plotH;
  const yBar = (v: number) => padT + plotH * (1 - v / maxBar);
  const yLine = (v: number) => padT + plotH * (1 - v / maxLine);

  const linePoints = data.map((d, i) => `${xCenter(i)},${yLine(d.line)}`).join(" ");

  const leftTicks = [0, maxBar / 2, maxBar];
  const rightTicks = [0, maxLine / 2, maxLine];

  return (
    <Svg width={width} height={height}>
      {/* Left ticks + gridlines */}
      {leftTicks.map((t, i) => (
        <React.Fragment key={`l${i}`}>
          <Line x1={padL} y1={yBar(t)} x2={padL + plotW} y2={yBar(t)} stroke={colors.border} strokeWidth={0.5} />
          <Text x={padL - 3} y={yBar(t) + 2} style={{ fontFamily: MONO, fontSize: 6, fill: colors.muted }} textAnchor="end">
            {leftFormatter(t)}
          </Text>
        </React.Fragment>
      ))}

      {/* Right ticks */}
      {rightTicks.map((t, i) => (
        <Text
          key={`r${i}`}
          x={padL + plotW + 3}
          y={yLine(t) + 2}
          style={{ fontFamily: MONO, fontSize: 6, fill: lineColor }}
          textAnchor="start"
        >
          {rightFormatter(t)}
        </Text>
      ))}

      {/* Axes */}
      <Line x1={padL} y1={padT} x2={padL} y2={baseY} stroke={colors.muted} strokeWidth={0.75} />
      <Line x1={padL + plotW} y1={padT} x2={padL + plotW} y2={baseY} stroke={lineColor} strokeWidth={0.75} />
      <Line x1={padL} y1={baseY} x2={padL + plotW} y2={baseY} stroke={colors.muted} strokeWidth={0.75} />

      {/* Bars (left axis) */}
      {data.map((d, i) => (
        <Rect key={`b${i}`} x={xCenter(i) - barW / 2} y={yBar(d.bar)} width={barW} height={baseY - yBar(d.bar)} fill={barColor} />
      ))}

      {/* Reference line (right axis units) */}
      {refLine != null && (
        <>
          <Line
            x1={padL}
            y1={yLine(refLine)}
            x2={padL + plotW}
            y2={yLine(refLine)}
            stroke={colors.muted}
            strokeWidth={0.6}
            strokeDasharray="3 2"
          />
          {refLabel && (
            <Text x={padL + 2} y={yLine(refLine) - 2} style={{ fontFamily: MONO, fontSize: 6, fill: colors.muted }} textAnchor="start">
              {refLabel}
            </Text>
          )}
        </>
      )}

      {/* Temperature line (right axis) */}
      <Polyline points={linePoints} fill="none" stroke={lineColor} strokeWidth={1.2} />
      {data.map((d, i) => (
        <Circle key={`c${i}`} cx={xCenter(i)} cy={yLine(d.line)} r={1.4} fill={lineColor} />
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <Text key={`x${i}`} x={xCenter(i)} y={baseY + 10} style={{ fontFamily: MONO, fontSize: 6, fill: colors.muted }} textAnchor="middle">
          {d.label}
        </Text>
      ))}
    </Svg>
  );
}
