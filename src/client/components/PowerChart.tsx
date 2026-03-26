import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PowerReading } from "../hooks/useScadaData";

interface Props {
  data: PowerReading[];
}

export default function PowerChart({ data }: Props) {
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    acPowerKw: Math.round(d.acPowerKw * 10) / 10,
    dcPowerKw: Math.round(d.dcPowerKw * 10) / 10,
    capacityFactor: Math.round(d.capacityFactor * 1000) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="acGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="time"
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          label={{
            value: "kW",
            angle: -90,
            position: "insideLeft",
            fill: "#9ca3af",
          }}
        />
        <Tooltip
          contentStyle={{
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: 12,
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="dcPowerKw"
          name="DC Power (kW)"
          stroke="#3b82f6"
          fill="url(#dcGrad)"
          strokeWidth={1.5}
        />
        <Area
          type="monotone"
          dataKey="acPowerKw"
          name="AC Power (kW)"
          stroke="#22c55e"
          fill="url(#acGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
