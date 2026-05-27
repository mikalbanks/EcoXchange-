import {
  mean,
  median,
  sampleStandardDeviation,
  sampleCorrelation,
} from "simple-statistics";

export function safeMean(xs: number[]): number {
  return xs.length > 0 ? mean(xs) : 0;
}

export function safeMedian(xs: number[]): number {
  return xs.length > 0 ? median(xs) : 0;
}

export function safeStdDev(xs: number[]): number {
  return xs.length >= 2 ? sampleStandardDeviation(xs) : 0;
}

export function safeCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  // simple-statistics requires variance in both series
  const sx = sampleStandardDeviation(xs);
  const sy = sampleStandardDeviation(ys);
  if (sx === 0 || sy === 0) return 0;
  return sampleCorrelation(xs, ys);
}
