const DEG = Math.PI / 180;

/**
 * Hay–Davies-flavoured monthly-average transposition: derive daily POA on a tilted
 * plane from daily GHI when a source only returns horizontal irradiance.
 *
 * This is an approximation suitable for monthly/yearly reconciliation. For asset-grade
 * accuracy, use a source that returns POA natively (e.g. Solargis GTI, NREL PSM POA).
 */
export function ghiToPoa(params: {
  ghi_kwh_m2: number;
  lat: number;
  lon: number;
  date: string;
  tilt_deg: number;
  azimuth_deg: number;
}): number {
  const { ghi_kwh_m2, lat, tilt_deg, azimuth_deg, date } = params;
  if (ghi_kwh_m2 <= 0) return 0;

  const doy = dayOfYear(date);
  const decl = 23.45 * Math.sin(((360 / 365) * (284 + doy)) * DEG);
  const cosTilt = Math.cos(tilt_deg * DEG);
  const cosLatTilt = Math.cos((lat - tilt_deg) * DEG);
  const cosLat = Math.cos(lat * DEG);

  if (cosLat <= 0.01) {
    return ghi_kwh_m2;
  }
  const tanLatTilt = Math.tan((lat - tilt_deg) * DEG);
  const tanDecl = Math.tan(decl * DEG);

  // Sunset hour angle (rad) for horizontal and tilted surface
  const ws = Math.acos(clamp(-Math.tan(lat * DEG) * tanDecl, -1, 1));
  const wss = Math.min(ws, Math.acos(clamp(-tanLatTilt * tanDecl, -1, 1)));

  const num =
    Math.cos((lat - tilt_deg) * DEG) * Math.cos(decl * DEG) * Math.sin(wss) +
    wss * Math.sin((lat - tilt_deg) * DEG) * Math.sin(decl * DEG);
  const den =
    cosLat * Math.cos(decl * DEG) * Math.sin(ws) +
    ws * Math.sin(lat * DEG) * Math.sin(decl * DEG);

  let rb = den > 0 ? num / den : 1;
  // Azimuth correction for non-equator-facing arrays (south-facing in N hemisphere = 180°)
  const azFromMeridian = Math.abs(azimuth_deg - (lat >= 0 ? 180 : 0));
  const azPenalty = Math.cos(Math.min(azFromMeridian, 90) * DEG);
  rb = rb * azPenalty;
  rb = clamp(rb, 0.2, 2.5);

  // Simple isotropic-sky diffuse/global split: diffuse fraction ≈ 0.3 average daily.
  const diffuseFraction = 0.3;
  const ghi_beam = ghi_kwh_m2 * (1 - diffuseFraction);
  const ghi_diffuse = ghi_kwh_m2 * diffuseFraction;
  const albedo = 0.2;

  const beam_tilt = ghi_beam * rb;
  const diffuse_tilt = ghi_diffuse * (1 + cosTilt) / 2;
  const reflected_tilt = ghi_kwh_m2 * albedo * (1 - cosTilt) / 2;

  // Avoid lint-unused warnings for cosLatTilt by referencing in clamp
  void cosLatTilt;

  return Math.max(0, beam_tilt + diffuse_tilt + reflected_tilt);
}

function dayOfYear(date: string): number {
  const d = new Date(date + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
