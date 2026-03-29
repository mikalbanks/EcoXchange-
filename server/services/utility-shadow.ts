export interface NetMeterShadowResult {
  consumptionKw: number;
  netMeterKw: number;
  solarActualKw: number;
  capacityKw: number;
  consumptionRatio: number;
  noiseApplied: number;
  timestamp: string;
}

export function getNetMeterShadow(
  capacityKw: number,
  solarActualKw: number,
): NetMeterShadowResult {
  const capacityMw = capacityKw / 1000;
  const consumptionRatio = capacityMw <= 5 ? 0.40 : 0.02;

  const baseConsumptionKw = capacityKw * consumptionRatio;

  const noise = 1 + (Math.random() * 0.10 - 0.05);
  const consumptionKw = baseConsumptionKw * noise;

  const netMeterKw = consumptionKw - solarActualKw;

  return {
    consumptionKw: Number(consumptionKw.toFixed(4)),
    netMeterKw: Number(netMeterKw.toFixed(4)),
    solarActualKw: Number(solarActualKw.toFixed(4)),
    capacityKw,
    consumptionRatio,
    noiseApplied: Number(noise.toFixed(6)),
    timestamp: new Date().toISOString(),
  };
}
