import { useRef, useState } from "react";
import { Download, Eye, PencilLine } from "lucide-react";
import { SectionTag } from "../components/ui/SectionTag.js";
import { Button } from "../components/ui/Button.js";
import { SliderInput } from "../components/calculator/SliderInput.js";
import { LOIDocument } from "../components/loi/LOIDocument.js";
import demoSavannah from "../data/demo-savannah.json";
import {
  DEFAULT_TERMS,
  INTERCONNECTION_LABELS,
  OFFTAKE_LABELS,
  type InterconnectionStatus,
  type LOIData,
} from "../types/loi.js";
import type { IntakeForm } from "../utils/onboarding-types.js";

const INTAKE_KEY = "ecoxchange.onboarding.form";

const today = () =>
  new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/**
 * Prefill: the developer's own intake (sessionStorage, written by the
 * onboarding wizard) when present, else the Savannah demo project so the
 * builder always demos meaningfully.
 */
function initialLoiData(): LOIData {
  let intake: Partial<IntakeForm> | null = null;
  try {
    const raw = sessionStorage.getItem(INTAKE_KEY);
    if (raw) intake = JSON.parse(raw) as Partial<IntakeForm>;
  } catch {
    intake = null;
  }
  const hasIntake = Boolean(intake?.project_name);

  return {
    developer: {
      companyName: intake?.developer_company ?? "",
      contactName: intake?.developer_name ?? "",
      contactEmail: intake?.developer_email ?? "",
      contactTitle: "",
    },
    project: hasIntake
      ? {
          name: intake!.project_name!,
          location:
            intake!.latitude != null && intake!.longitude != null
              ? `${Math.abs(intake!.latitude!).toFixed(2)}°${intake!.latitude! >= 0 ? "N" : "S"}, ${Math.abs(intake!.longitude!).toFixed(2)}°${intake!.longitude! >= 0 ? "E" : "W"}`
              : "",
          latitude: intake!.latitude ?? 0,
          longitude: intake!.longitude ?? 0,
          capacityKwDc: intake!.capacity_kw_dc ?? 0,
          // Rough pre-backtest estimate: the wizard doesn't persist a backtest
          // result, so approximate from capacity at the Savannah-like CF.
          estimatedAnnualProductionMwh: Math.round((intake!.capacity_kw_dc ?? 0) * 1.62),
          offtakeType: intake!.offtake_type ?? "community_solar",
          ppaRate: intake!.ppa_rate_per_kwh,
          ppaEscalator: intake!.ppa_escalator,
          interconnectionStatus: "pending",
          commissioningDate: intake!.commissioning_date ?? "",
          inverterBrand: intake!.inverter_brand ?? "other",
        }
      : {
          name: demoSavannah.project.name,
          location: demoSavannah.project.location,
          latitude: demoSavannah.project.latitude,
          longitude: demoSavannah.project.longitude,
          capacityKwDc: demoSavannah.project.capacity_kw,
          estimatedAnnualProductionMwh: Math.round(demoSavannah.summary.annual_production_mwh),
          offtakeType: demoSavannah.project.offtake_type as LOIData["project"]["offtakeType"],
          ppaRate: demoSavannah.project.ppa_rate_per_kwh,
          ppaEscalator: 0.02,
          interconnectionStatus: "approved",
          commissioningDate: demoSavannah.project.commissioning_date,
          inverterBrand: "SolarEdge",
        },
    terms: { ...DEFAULT_TERMS, equityRaiseTarget: intake?.equity_raise_target ?? 2_500_000 },
    generatedDate: today(),
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-darkBg">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-paleGreen bg-white px-3 py-2 text-sm text-darkBg focus:border-medGreen focus:outline-none"
      />
    </label>
  );
}

export function DeveloperLOI() {
  const [data, setData] = useState<LOIData>(initialLoiData);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const patch = <K extends keyof LOIData>(key: K, value: Partial<LOIData[K]>) =>
    setData((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as object), ...(value as object) },
      generatedDate: today(),
    }));

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const pages = Array.from(
        docRef.current?.querySelectorAll<HTMLElement>(".pdf-page") ?? [],
      );
      const { downloadPdfFromPages, slugForFilename } = await import("../reports/pdf.js");
      const company = data.developer.companyName || "Developer";
      const date = new Date().toISOString().slice(0, 10);
      await downloadPdfFromPages(
        pages,
        `EcoXchange_LOI_${slugForFilename(company)}_${date}.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <SectionTag>LOI Builder</SectionTag>
        <h1 className="font-heading text-3xl text-darkBg">Letter of Intent</h1>
        <p className="mt-1 text-textMuted">
          Generate a non-binding Letter of Intent for your project
        </p>
      </div>

      <p
        className="border border-flagAmber/40 bg-flagAmber/10 px-4 py-3 text-sm text-darkBg"
        data-testid="loi-counsel-note"
      >
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-flagAmber">
          Non-binding template
        </span>{" "}
        — this LOI expresses mutual interest only and creates no legal obligation. All template
        language is subject to securities counsel review before use with developers.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
          data-testid="loi-preview-toggle"
        >
          {showPreview ? (
            <span className="inline-flex items-center gap-1.5">
              <PencilLine className="h-4 w-4" /> Edit Details
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> Preview LOI
            </span>
          )}
        </Button>
        <Button
          variant="accent"
          size="sm"
          loading={downloading}
          onClick={() => void downloadPdf()}
          data-testid="loi-download"
        >
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Download PDF
          </span>
        </Button>
      </div>

      {showPreview ? (
        <div className="overflow-x-auto border border-darkBg/10 bg-cream/60 p-4" data-testid="loi-preview">
          <div className="mx-auto w-[794px] space-y-6 shadow-lg">
            <LOIDocument data={data} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Developer information */}
          <section className="border border-darkBg/10 bg-white p-5">
            <SectionTag>Developer Information</SectionTag>
            <div className="mt-3 space-y-3">
              <Field
                label="Company Name"
                value={data.developer.companyName}
                onChange={(v) => patch("developer", { companyName: v })}
                placeholder="Savannah Solar Partners LLC"
              />
              <Field
                label="Contact Name"
                value={data.developer.contactName}
                onChange={(v) => patch("developer", { contactName: v })}
              />
              <Field
                label="Email"
                type="email"
                value={data.developer.contactEmail}
                onChange={(v) => patch("developer", { contactEmail: v })}
              />
              <Field
                label="Title"
                value={data.developer.contactTitle}
                onChange={(v) => patch("developer", { contactTitle: v })}
                placeholder="Managing Partner"
              />
            </div>
          </section>

          {/* Project (prefilled from intake or the Savannah demo) */}
          <section className="border border-darkBg/10 bg-white p-5">
            <SectionTag>Project</SectionTag>
            <div className="mt-3 space-y-3">
              <Field
                label="Project Name"
                value={data.project.name}
                onChange={(v) => patch("project", { name: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Location"
                  value={data.project.location}
                  onChange={(v) => patch("project", { location: v })}
                />
                <Field
                  label="Capacity (kW DC)"
                  type="number"
                  value={String(data.project.capacityKwDc)}
                  onChange={(v) => patch("project", { capacityKwDc: Number(v) || 0 })}
                />
                <Field
                  label="Est. Annual Production (MWh)"
                  type="number"
                  value={String(data.project.estimatedAnnualProductionMwh)}
                  onChange={(v) =>
                    patch("project", { estimatedAnnualProductionMwh: Number(v) || 0 })
                  }
                />
                <Field
                  label="Expected Commissioning"
                  value={data.project.commissioningDate}
                  onChange={(v) => patch("project", { commissioningDate: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-darkBg">Offtake</span>
                  <select
                    value={data.project.offtakeType}
                    onChange={(e) =>
                      patch("project", {
                        offtakeType: e.target.value as LOIData["project"]["offtakeType"],
                      })
                    }
                    className="mt-1 w-full rounded-sm border border-paleGreen bg-white px-3 py-2 text-sm text-darkBg focus:border-medGreen focus:outline-none"
                  >
                    {Object.entries(OFFTAKE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-darkBg">Interconnection</span>
                  <select
                    value={data.project.interconnectionStatus}
                    onChange={(e) =>
                      patch("project", {
                        interconnectionStatus: e.target.value as InterconnectionStatus,
                      })
                    }
                    className="mt-1 w-full rounded-sm border border-paleGreen bg-white px-3 py-2 text-sm text-darkBg focus:border-medGreen focus:outline-none"
                  >
                    {Object.entries(INTERCONNECTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* Deal terms */}
          <section className="border border-darkBg/10 bg-white p-5 lg:col-span-2">
            <SectionTag>Deal Terms</SectionTag>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <SliderInput
                label="Target Equity Raise"
                value={data.terms.equityRaiseTarget}
                min={500_000}
                max={5_000_000}
                step={50_000}
                format="currency"
                onChange={(v) => patch("terms", { equityRaiseTarget: v })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Origination Fee (%)"
                  type="number"
                  value={String(data.terms.originationFeePct)}
                  onChange={(v) => patch("terms", { originationFeePct: Number(v) || 0 })}
                />
                <Field
                  label="Setup Fee ($)"
                  type="number"
                  value={String(data.terms.platformSetupFee)}
                  onChange={(v) => patch("terms", { platformSetupFee: Number(v) || 0 })}
                />
                <Field
                  label="Exclusivity (days)"
                  type="number"
                  value={String(data.terms.exclusivityDays)}
                  onChange={(v) => patch("terms", { exclusivityDays: Number(v) || 0 })}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Offscreen copy for PDF capture (independent of preview state). */}
      {downloading ? (
        <div ref={docRef} className="fixed top-0 left-[-2000px] z-[-1]" aria-hidden>
          <LOIDocument data={data} />
        </div>
      ) : null}
    </div>
  );
}
