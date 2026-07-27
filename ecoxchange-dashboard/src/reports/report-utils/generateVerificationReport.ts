// Thin orchestrator for the verification report download: wait for the
// brand fonts, let the offscreen pages lay out, then hand the .pdf-page
// divs to the shared jsPDF pipeline at US Letter size.

import { downloadPdfFromPages } from "../pdf.js";

export async function generateVerificationReport(
  container: HTMLElement,
  filename: string,
): Promise<void> {
  // Playfair Display / IBM Plex Mono must be resolved before capture or
  // html2canvas rasterizes fallback fonts.
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  // Let the freshly-mounted offscreen template complete layout (same 80ms
  // discipline as DeveloperLOI / Benchmark / ProjectDetail).
  await new Promise((r) => setTimeout(r, 80));

  const pages = Array.from(
    container.querySelectorAll<HTMLElement>(".pdf-page"),
  );
  await downloadPdfFromPages(pages, filename, "letter");
}
