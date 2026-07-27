// Regression: ISSUE-001 — PDF export ran 13.5s per page with no progress
// feedback, so a 4-page report looked like a 54s hang during a live pitch.
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-5173-2026-07-27.md

import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadPdfFromPages } from "./pdf.js";

// Stub the two lazy-imported libraries so the util can run headless.
const addImage = vi.fn();
const addPage = vi.fn();
const save = vi.fn();

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    toDataURL: () => "data:image/jpeg;base64,AAAA",
  })),
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    };
    addImage = addImage;
    addPage = addPage;
    save = save;
    constructor(public opts: unknown) {}
  },
}));

function fakePages(n: number): HTMLElement[] {
  return Array.from({ length: n }, () => ({}) as HTMLElement);
}

afterEach(() => {
  addImage.mockClear();
  addPage.mockClear();
  save.mockClear();
});

describe("downloadPdfFromPages", () => {
  it("reports progress once per page, in order, with the correct total", async () => {
    const seen: Array<[number, number]> = [];
    await downloadPdfFromPages(fakePages(4), "x.pdf", "letter", (done, total) =>
      seen.push([done, total]),
    );
    expect(seen).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  });

  it("still renders every page and saves once", async () => {
    await downloadPdfFromPages(fakePages(4), "x.pdf", "letter");
    expect(addImage).toHaveBeenCalledTimes(4);
    expect(addPage).toHaveBeenCalledTimes(3); // no addPage before the first
    expect(save).toHaveBeenCalledWith("x.pdf");
  });

  it("works without a progress callback (back-compat for existing callers)", async () => {
    await expect(
      downloadPdfFromPages(fakePages(2), "loi.pdf"),
    ).resolves.toBeUndefined();
    expect(save).toHaveBeenCalledWith("loi.pdf");
  });

  it("rejects an empty page list rather than saving a blank PDF", async () => {
    await expect(downloadPdfFromPages([], "empty.pdf")).rejects.toThrow(
      /No pages to render/,
    );
    expect(save).not.toHaveBeenCalled();
  });
});
