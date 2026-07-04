// Client-side HTML -> PDF pipeline shared by the Production Verification
// Report and the LOI builder. Both libraries are lazy-imported so they stay
// out of the entry bundle (same discipline as ShareImpactCard's html2canvas
// use). Each element passed in is one A4 page rendered at 794x1123 CSS px
// (96dpi), captured at 2x scale for print sharpness.

export const PAGE_W = 794;
export const PAGE_H = 1123;

/**
 * Rasterize a list of fixed-size page elements into a single A4 PDF and
 * trigger a download. Elements must be attached to the document (an
 * offscreen fixed-position container works) and laid out at PAGE_W x PAGE_H.
 */
export async function downloadPdfFromPages(
  pages: HTMLElement[],
  filename: string,
): Promise<void> {
  if (pages.length === 0) throw new Error("No pages to render");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidthMm = doc.internal.pageSize.getWidth();
  const pageHeightMm = doc.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: "#FFFFFF",
      logging: false,
    });
    if (i > 0) doc.addPage();
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      pageWidthMm,
      pageHeightMm,
    );
  }

  doc.save(filename);
}

/** "Savannah Community Solar 5MW" -> "Savannah_Community_Solar_5MW" */
export function slugForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
