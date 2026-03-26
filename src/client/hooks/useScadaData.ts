import { useState, useEffect, useCallback, useRef } from "react";

export interface SPV {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacityKw: number;
  trackingType: string;
  ppaRateCentsKwh: number;
  regDExemption: string;
  totalTokens: number;
  tokenPriceUsd: number;
}

export interface PowerReading {
  id: number;
  spvId: number;
  timestamp: string;
  poaGlobalWm2: number;
  cellTemperatureC: number;
  dcPowerKw: number;
  acPowerKw: number;
  inverterEfficiency: number;
  capacityFactor: number;
}

export interface YieldEntry {
  id: number;
  spvId: number;
  periodStart: string;
  periodEnd: string;
  periodType: string;
  energyKwh: number;
  revenueUsd: number;
  yieldPerToken: number;
  avgCapacityFactor: number;
}

export interface YieldSummary {
  totalEnergyKwh: number;
  totalEnergyMwh: number;
  totalRevenueUsd: number;
  totalYieldPerToken: number;
  avgCapacityFactor: number;
  recordCount: number;
  spv: SPV | null;
}

export interface IrradianceReading {
  id: number;
  spvId: number;
  timestamp: string;
  ghiWm2: number;
  dniWm2: number;
  dhiWm2: number;
  solarZenithDeg: number;
  solarAzimuthDeg: number;
  airTemperatureC: number;
  windSpeedMs: number;
  cloudFraction: number;
}

const API_BASE = "/api";

export function useSpvs() {
  const [spvs, setSpvs] = useState<SPV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/spvs`)
      .then((r) => r.json())
      .then(setSpvs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { spvs, loading };
}

export function usePowerTelemetry(spvId: number | null, hours = 72) {
  const [data, setData] = useState<PowerReading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spvId) return;
    setLoading(true);
    fetch(`${API_BASE}/scada/power/${spvId}?hours=${hours}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [spvId, hours]);

  return { data, loading };
}

export function useIrradianceTelemetry(spvId: number | null, hours = 72) {
  const [data, setData] = useState<IrradianceReading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spvId) return;
    setLoading(true);
    fetch(`${API_BASE}/scada/irradiance/${spvId}?hours=${hours}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [spvId, hours]);

  return { data, loading };
}

export function useYieldData(spvId: number | null) {
  const [entries, setEntries] = useState<YieldEntry[]>([]);
  const [summary, setSummary] = useState<YieldSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spvId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/yield/${spvId}`).then((r) => r.json()),
      fetch(`${API_BASE}/yield/${spvId}/summary`).then((r) => r.json()),
    ])
      .then(([entries, summary]) => {
        setEntries(entries);
        setSummary(summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [spvId]);

  return { entries, summary, loading };
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        setLastMessage(JSON.parse(e.data));
      } catch {}
    };

    return () => ws.close();
  }, []);

  return { connected, lastMessage };
}

export function useIngestion() {
  const [ingesting, setIngesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerIngestion = useCallback(
    async (startDate?: string, endDate?: string, spvId?: number) => {
      setIngesting(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/scada/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate, endDate, spvId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data);
        return data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIngesting(false);
      }
    },
    []
  );

  return { triggerIngestion, ingesting, result, error };
}
