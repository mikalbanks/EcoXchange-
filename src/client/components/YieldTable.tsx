import React, { useState } from "react";
import type { YieldEntry } from "../hooks/useScadaData";

interface Props {
  entries: YieldEntry[];
  totalTokens: number;
}

export default function YieldTable({ entries, totalTokens }: Props) {
  const [page, setPage] = useState(0);
  const perPage = 24;
  const totalPages = Math.ceil(entries.length / perPage);
  const visible = entries.slice(page * perPage, (page + 1) * perPage);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-3">Period</th>
              <th className="text-right py-3 px-3">Energy (kWh)</th>
              <th className="text-right py-3 px-3">Revenue ($)</th>
              <th className="text-right py-3 px-3">Yield/Token ($)</th>
              <th className="text-right py-3 px-3">Capacity Factor</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="py-2.5 px-3 text-gray-300">
                  {new Date(entry.periodStart).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-2.5 px-3 text-right text-white font-mono">
                  {entry.energyKwh.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-right text-eco-400 font-mono">
                  ${entry.revenueUsd.toFixed(4)}
                </td>
                <td className="py-2.5 px-3 text-right text-amber-400 font-mono">
                  ${entry.yieldPerToken.toFixed(6)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span
                    className={`font-mono ${
                      entry.avgCapacityFactor > 0.5
                        ? "text-eco-400"
                        : entry.avgCapacityFactor > 0.2
                          ? "text-amber-400"
                          : "text-gray-500"
                    }`}
                  >
                    {(entry.avgCapacityFactor * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">
            Page {page + 1} of {totalPages} ({entries.length} entries)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
