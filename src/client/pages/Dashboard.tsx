import React, { useState } from "react";
import {
  useSpvs,
  usePowerTelemetry,
  useYieldData,
  useIrradianceTelemetry,
  useWebSocket,
  useIngestion,
} from "../hooks/useScadaData";
import PowerChart from "../components/PowerChart";
import IrradianceChart from "../components/IrradianceChart";
import YieldTable from "../components/YieldTable";
import KpiCards from "../components/KpiCards";
import SpvHeader from "../components/SpvHeader";
import IngestionPanel from "../components/IngestionPanel";

export default function Dashboard() {
  const { spvs, loading: spvsLoading } = useSpvs();
  const [selectedSpvId, setSelectedSpvId] = useState<number | null>(null);
  const { connected } = useWebSocket();

  const activeSpv = spvs.find((s) => s.id === selectedSpvId) || spvs[0] || null;
  const spvId = activeSpv?.id || null;

  const { data: powerData, loading: powerLoading } = usePowerTelemetry(spvId);
  const { data: irradianceData } = useIrradianceTelemetry(spvId);
  const { entries: yieldEntries, summary, loading: yieldLoading } = useYieldData(spvId);
  const { triggerIngestion, ingesting, result: ingestionResult, error: ingestionError } = useIngestion();

  if (spvsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-eco-400 text-lg">Loading EcoXchange Platform...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            EcoXchange <span className="text-eco-400">Virtual SCADA</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Digital Securities Platform — Reg D 506(c) Compliant
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              connected
                ? "bg-eco-900/50 text-eco-400 border border-eco-700"
                : "bg-red-900/50 text-red-400 border border-red-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-eco-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* SPV Selector */}
      {activeSpv && (
        <SpvHeader
          spv={activeSpv}
          allSpvs={spvs}
          onSelect={(id) => setSelectedSpvId(id)}
        />
      )}

      {/* Ingestion Controls */}
      <IngestionPanel
        spvId={spvId}
        onIngest={triggerIngestion}
        ingesting={ingesting}
        result={ingestionResult}
        error={ingestionError}
      />

      {/* KPI Cards */}
      {summary && <KpiCards summary={summary} />}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            AC Power Output (P<sub>ac</sub>)
          </h3>
          {powerLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading telemetry...
            </div>
          ) : powerData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No power data yet. Run ingestion to populate.
            </div>
          ) : (
            <PowerChart data={powerData} />
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Solar Irradiance (GHI / DNI / DHI)
          </h3>
          {irradianceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No irradiance data yet. Run ingestion to populate.
            </div>
          ) : (
            <IrradianceChart data={irradianceData} />
          )}
        </div>
      </div>

      {/* Yield Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Yield Ledger — Revenue per Token (Reg D 506(c) SPV)
        </h3>
        {yieldLoading ? (
          <div className="text-gray-500">Loading yield data...</div>
        ) : yieldEntries.length === 0 ? (
          <div className="text-gray-500">No yield data yet. Run ingestion to populate.</div>
        ) : (
          <YieldTable entries={yieldEntries} totalTokens={activeSpv?.totalTokens || 10000} />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-xs">
        <p>
          EcoXchange Digital Securities Platform | Reg D 506(c) | Accredited
          Investors Only
        </p>
        <p className="mt-1">
          Virtual SCADA: GOES-16 + NASA POWER → Perez Model → pvlib → P
          <sub>ac</sub> → Yield
        </p>
      </footer>
    </div>
  );
}
