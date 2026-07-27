// Shared chrome for the Production Verification Report PDF pages:
// page shell (US Letter .pdf-page div), running header (pages 2–4),
// footer, § section headers, and the dark stat band. Print-static — no
// animation, no interactivity (html2canvas captures these divs).

import type { ReactNode } from "react";
import { LETTER_PAGE_H, LETTER_PAGE_W } from "../pdf.js";

export function ReportPage({
  children,
  page,
  total,
  withHeader = true,
}: {
  children: ReactNode;
  page: number;
  total: number;
  withHeader?: boolean;
}) {
  return (
    <div
      className="pdf-page relative flex flex-col overflow-hidden bg-white px-12 py-12 text-textDark"
      style={{
        width: `${LETTER_PAGE_W}px`,
        height: `${LETTER_PAGE_H}px`,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {withHeader ? <ReportHeader /> : null}
      <div className="flex-1">{children}</div>
      <ReportFooter page={page} total={total} />
    </div>
  );
}

export function ReportHeader() {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-darkBg pb-2">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 bg-accentBrt" aria-hidden />
        <span className="font-heading text-sm italic text-darkBg">
          EcoXchange
        </span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-textMuted">
        Production Verification Report
      </span>
    </div>
  );
}

export function ReportFooter({ page, total }: { page: number; total: number }) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-paleGreen pt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-textMuted">
      <span>
        Page {page} of {total}
      </span>
      <span>EcoXchange, Inc. · Confidential</span>
    </div>
  );
}

export function ReportSectionHeader({ children }: { children: string }) {
  return (
    <h2 className="mb-3 mt-6 border-b border-paleGreen pb-1 font-heading text-[16px] italic text-darkBg">
      § {children}
    </h2>
  );
}

export interface StatBandItem {
  value: string;
  label: string;
}

export function ReportStatBand({ items }: { items: StatBandItem[] }) {
  return (
    <div className="flex bg-darkBg">
      {items.map((item) => (
        <div key={item.label} className="flex-1 px-4 py-4 text-center">
          <div className="font-mono text-[22px] font-bold text-accentBrt tabular-nums">
            {item.value}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-white">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportDisclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="border border-paleGreen bg-cream p-3 font-mono text-[8px] leading-[1.7] text-textMuted">
      {children}
    </div>
  );
}

export function ReportTermRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-paleGreen/60 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.04em] text-textMuted">
        {label}
      </dt>
      <dd className="font-mono text-[11.5px] tabular-nums text-textDark">
        {value}
      </dd>
    </div>
  );
}
