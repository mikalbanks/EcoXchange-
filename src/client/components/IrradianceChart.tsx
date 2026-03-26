import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IrradianceReading } from "../hooks/useScadaData";

interface Props {
  data: IrradianceReading[];
}

export default function IrradianceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    ghi: Math.round(d.ghiWm2),
    dni: Math.round(d.dniWm2),
    dhi: Math.round(d.dhiWm2),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
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
            value: "W/m²",
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
        <Line
          type="monotone"
          dataKey="ghi"
          name="GHI (W/m²)"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="dni"
          name="DNI (W/m²)"
          stroke="#ef4444"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="dhi"
          name="DHI (W/m²)"
          stroke="#8b5cf6"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
