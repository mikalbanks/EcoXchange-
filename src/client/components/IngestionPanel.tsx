import React, { useState } from "react";

interface Props {
  spvId: number | null;
  onIngest: (startDate?: string, endDate?: string, spvId?: number) => Promise<any>;
  ingesting: boolean;
  result: any;
  error: string | null;
}

export default function IngestionPanel({
  spvId,
  onIngest,
  ingesting,
  result,
  error,
}: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleIngest = () => {
    const start = startDate ? startDate.replace(/-/g, "") : undefined;
    const end = endDate ? endDate.replace(/-/g, "") : undefined;
    onIngest(start, end, spvId || undefined);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Virtual SCADA Pipeline — Data Ingestion
      </h3>
      <p className="text-gray-500 text-xs mb-4">
        GOES-16 Satellite (NOAA S3) + NASA POWER API → Perez Satellite-to-Irradiance
        → pvlib P<sub>ac</sub> → Yield Ledger
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="px-6 py-2 bg-eco-600 hover:bg-eco-700 disabled:bg-gray-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {ingesting ? "Ingesting..." : "Run SCADA Pipeline"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-4 p-3 bg-eco-900/30 border border-eco-800 rounded-lg text-eco-400 text-sm">
          Ingested {result.irradianceRecords} irradiance + {result.powerRecords}{" "}
          power records. Energy: {(result.totalEnergyKwh / 1000).toFixed(3)} MWh |
          Revenue: ${result.totalRevenueUsd?.toFixed(2)}
        </div>
      )}
    </div>
  );
}
