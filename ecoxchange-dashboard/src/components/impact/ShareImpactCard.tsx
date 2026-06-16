import { useRef, useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import type { ImpactMetrics } from "../../types/impact.js";
import { fmtInt, fmtHomes, fmtTrees } from "./format.js";

// Shareable, downloadable impact card (rendered to PNG via html2canvas).
export function ShareImpactCard({ impact }: { impact: ImpactMetrics }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function render(): Promise<HTMLCanvasElement | null> {
    if (!cardRef.current) return null;
    // Lazy-load html2canvas so it stays out of the main bundle.
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(cardRef.current, {
      backgroundColor: "#1B4D35",
      scale: 2,
      logging: false,
    });
  }

  async function download() {
    setBusy(true);
    try {
      const canvas = await render();
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "ecoxchange-impact.png";
      a.click();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setBusy(true);
    try {
      const canvas = await render();
      if (!canvas) return;
      await new Promise<void>((resolve) =>
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && "write" in navigator.clipboard) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard image not supported — download instead */
              await download();
            }
          }
          resolve();
        }, "image/png"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* The card that gets rasterized. */}
      <div
        ref={cardRef}
        className="mx-auto max-w-md rounded-2xl bg-darkBg p-8 text-white"
      >
        <div className="text-sm font-semibold uppercase tracking-wide text-accentBrt">
          EcoXchange — Production-Verified Impact
        </div>
        <div className="mt-5 text-paleGreen">My solar investment has avoided</div>
        <div className="mt-2 font-mono text-4xl font-bold text-white">
          {fmtInt(impact.co2_avoided_kg)} kg CO₂
        </div>
        <div className="mt-5 leading-relaxed text-paleGreen">
          That's like planting {fmtTrees(impact.trees_equivalent)} trees 🌳
          <br />
          or powering {fmtHomes(impact.homes_powered_years)} homes for a year 🏠
        </div>
        <div className="mt-6 border-t border-white/15 pt-4 text-sm text-paleGreen">
          <span className="text-accentBrt">●</span> Verified by 3-source
          reconciliation
          <div className="mt-1 text-white/70">ecoxchange.net</div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-medGreen px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-darkBg disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> Download PNG
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-medGreen px-4 py-2 text-sm font-semibold text-medGreen transition-colors duration-150 hover:bg-paleGreen/40 disabled:opacity-60"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy image"}
        </button>
      </div>
    </div>
  );
}
