export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

export function pct(numerator: number, denominator: number): number {
  return (numerator / denominator) * 100;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Box-Muller transform: returns one sample from N(mean, std).
let _spare: number | null = null;
export function randomNormal(mean = 0, std = 1, rng: () => number = Math.random): number {
  if (_spare !== null) {
    const v = _spare;
    _spare = null;
    return mean + std * v;
  }
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const mag = Math.sqrt(-2.0 * Math.log(u));
  const z0 = mag * Math.cos(2.0 * Math.PI * v);
  const z1 = mag * Math.sin(2.0 * Math.PI * v);
  _spare = z1;
  return mean + std * z0;
}

export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
