import type { IntakeForm } from "../../utils/onboarding-types.js";
import { Field, Select } from "./Field.js";

interface Props {
  form: IntakeForm;
  update: (patch: Partial<IntakeForm>) => void;
}

export function InverterSetup({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-darkBg">Data Access</h2>
      <p className="text-textMuted text-sm">
        Identify the installed monitoring platform for a compatibility review.
        Do not enter passwords, API keys, or access tokens in this public demo.
        A secure, least-privilege access method is agreed separately for an
        accepted pilot project.
      </p>

      <Select
        label="Inverter Brand"
        value={form.inverter_brand}
        onChange={(v) =>
          update({ inverter_brand: v as IntakeForm["inverter_brand"] })
        }
        options={[
          { value: "solaredge", label: "SolarEdge" },
          { value: "enphase", label: "Enphase" },
          { value: "fronius", label: "Fronius" },
          { value: "sma", label: "SMA" },
          { value: "other", label: "Other / not sure" },
        ]}
      />

      <div className="rounded-md border border-paleGreen/60 bg-cream/40 p-4 space-y-3">
        <div className="text-sm text-textDark font-medium">
          Optional non-secret site reference
        </div>
        <Field
          label="Plant / Site ID"
          value={form.inverter_plant_id ?? ""}
          onChange={(e) => update({ inverter_plant_id: e.target.value })}
        />
        <p className="text-xs text-textMuted">
          This identifier is for the walkthrough only and is not submitted.
        </p>
      </div>

      <Field
        label="Utility Provider (optional)"
        value={form.utility_provider ?? ""}
        onChange={(e) => update({ utility_provider: e.target.value })}
      />
    </div>
  );
}
