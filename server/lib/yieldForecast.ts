export type MonthlyHistoryRow = {
  month: string;
  monthly_energy_kwh: number;
};

export type ForecastRow = {
  forecast_month: string;
  forecast_energy_kwh: number;
  forecast_revenue_usd: number;
};

export function buildSeasonalForecast(
  history: MonthlyHistoryRow[],
  assumedPpaUsdPerKwh = 0.085,
  degradationRateAnnual = 0.005,
  monthsForward = 12,
): ForecastRow[] {
  const byCalendarMonth = new Map<number, number[]>();

  history.forEach((row) => {
    const dt = new Date(`${row.month}-01T00:00:00Z`);
    const monthNum = dt.getUTCMonth() + 1;
    const arr = byCalendarMonth.get(monthNum) ?? [];
    arr.push(row.monthly_energy_kwh);
    byCalendarMonth.set(monthNum, arr);
  });

  const seasonalAvg = new Map<number, number>();
  byCalendarMonth.forEach((values, key) => {
    seasonalAvg.set(key, values.reduce((a, b) => a + b, 0) / values.length);
  });

  const lastMonth = new Date(`${history[history.length - 1].month}-01T00:00:00Z`);
  const forecast: ForecastRow[] = [];

  for (let i = 1; i <= monthsForward; i += 1) {
    const dt = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + i, 1));
    const monthNum = dt.getUTCMonth() + 1;
    const base = seasonalAvg.get(monthNum) ?? 0;
    const yearsAhead = i / 12;
    const factor = Math.pow(1 - degradationRateAnnual, yearsAhead);
    const forecastEnergy = base * factor;
    const monthLabel = `${dt.getUTCFullYear()}-${String(monthNum).padStart(2, '0')}`;
    forecast.push({
      forecast_month: monthLabel,
      forecast_energy_kwh: Number(forecastEnergy.toFixed(2)),
      forecast_revenue_usd: Number((forecastEnergy * assumedPpaUsdPerKwh).toFixed(2)),
    });
  }

  return forecast;
}
