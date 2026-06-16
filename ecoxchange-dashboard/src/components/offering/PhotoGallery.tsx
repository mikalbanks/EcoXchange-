import { ImageIcon } from "lucide-react";

// Horizontal scroll of site photos. Renders a branded placeholder when an
// offering has no photos yet (common for pre-COD projects).
export function PhotoGallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 rounded-xl border border-dashed border-paleGreen/70 bg-cream/50 text-sm text-textMuted">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
        Site photos coming soon
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {photos.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Site photo ${i + 1}`}
          className="h-40 w-64 shrink-0 rounded-xl border border-paleGreen/60 object-cover"
        />
      ))}
    </div>
  );
}
