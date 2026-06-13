import { MapPin } from "lucide-react";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
}

const ZOOM = 9;
const TILE_PX = 256;

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  );
}

/**
 * Lightweight location preview: a single static OpenStreetMap tile with the
 * project coordinates marked. No interactive map library — reliable anywhere.
 */
export function LocationPicker({ latitude, longitude }: LocationPickerProps) {
  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  if (!hasCoords) {
    return (
      <div
        className="flex h-48 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
        data-testid="location-preview-empty"
      >
        <MapPin className="mr-2 h-4 w-4" />
        Enter latitude and longitude to preview the site
      </div>
    );
  }

  const xf = lonToTileX(longitude!, ZOOM);
  const yf = latToTileY(latitude!, ZOOM);
  const xTile = Math.floor(xf);
  const yTile = Math.floor(yf);
  const leftPct = (xf - xTile) * 100;
  const topPct = (yf - yTile) * 100;
  const tileUrl = `https://tile.openstreetmap.org/${ZOOM}/${xTile}/${yTile}.png`;

  return (
    <div className="space-y-2" data-testid="location-preview">
      <div
        className="relative mx-auto overflow-hidden rounded-md border border-border"
        style={{ width: TILE_PX, height: TILE_PX, maxWidth: "100%" }}
      >
        <img
          src={tileUrl}
          alt={`Map near ${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`}
          width={TILE_PX}
          height={TILE_PX}
          loading="lazy"
          className="block"
        />
        <MapPin
          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-full text-red-600 drop-shadow"
          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {latitude!.toFixed(4)}°, {longitude!.toFixed(4)}° · © OpenStreetMap
      </p>
    </div>
  );
}
