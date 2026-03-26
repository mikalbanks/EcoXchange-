import React from "react";
import type { SPV } from "../hooks/useScadaData";

interface Props {
  spv: SPV;
  allSpvs: SPV[];
  onSelect: (id: number) => void;
}

export default function SpvHeader({ spv, allSpvs, onSelect }: Props) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {allSpvs.length > 1 ? (
              <select
                className="bg-gray-800 text-white text-xl font-bold rounded-lg px-3 py-1 border border-gray-700"
                value={spv.id}
                onChange={(e) => onSelect(parseInt(e.target.value))}
              >
                {allSpvs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-xl font-bold text-white">{spv.name}</h2>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-eco-900/50 text-eco-400 border border-eco-800">
              Reg D {spv.regDExemption}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{spv.location}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Nameplate</p>
            <p className="text-white font-semibold">
              {(spv.capacityKw / 1000).toFixed(1)} MW<sub>dc</sub>
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Tracking</p>
            <p className="text-white font-semibold capitalize">
              {spv.trackingType.replace("_", "-")}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">PPA Rate</p>
            <p className="text-white font-semibold">
              ${(spv.ppaRateCentsKwh / 100).toFixed(3)}/kWh
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Token Price</p>
            <p className="text-white font-semibold">
              ${spv.tokenPriceUsd.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
