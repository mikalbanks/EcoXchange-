import React from "react";
import type { YieldSummary } from "../hooks/useScadaData";

interface Props {
  summary: YieldSummary;
}

export default function KpiCards({ summary }: Props) {
  const cards = [
    {
      label: "Total Energy",
      value: `${summary.totalEnergyMwh.toFixed(2)} MWh`,
      sub: `${Math.round(summary.totalEnergyKwh).toLocaleString()} kWh`,
      color: "text-eco-400",
      bgColor: "bg-eco-900/20 border-eco-800",
    },
    {
      label: "PPA Revenue",
      value: `$${summary.totalRevenueUsd.toFixed(2)}`,
      sub: `${summary.recordCount} billing periods`,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20 border-blue-800",
    },
    {
      label: "Yield Per Token",
      value: `$${summary.totalYieldPerToken.toFixed(4)}`,
      sub: `${summary.spv?.totalTokens.toLocaleString() || "10,000"} tokens outstanding`,
      color: "text-amber-400",
      bgColor: "bg-amber-900/20 border-amber-800",
    },
    {
      label: "Avg Capacity Factor",
      value: `${(summary.avgCapacityFactor * 100).toFixed(1)}%`,
      sub: `${summary.spv?.capacityKw.toLocaleString() || "4,700"} kW nameplate`,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20 border-purple-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-5 ${card.bgColor}`}
        >
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            {card.label}
          </p>
          <p className={`text-2xl font-bold mt-2 ${card.color}`}>
            {card.value}
          </p>
          <p className="text-gray-500 text-xs mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
