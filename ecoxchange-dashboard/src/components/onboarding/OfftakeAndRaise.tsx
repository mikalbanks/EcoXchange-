import type { IntakeForm } from "../../utils/onboarding-types.js";
import { Field, Select } from "./Field.js";

interface Props {
  form: IntakeForm;
  update: (patch: Partial<IntakeForm>) => void;
}

export function OfftakeAndRaise({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-darkBg">Offtake & Capital</h2>
      <Select
        label="Offtake Type"
        value={form.offtake_type ?? "community_solar"}
        onChange={(v) =>
          update({ offtake_type: v as IntakeForm["offtake_type"] })
        }
        options={[
          { value: "community_solar", label: "Community Solar" },
          { value: "ppa", label: "PPA" },
          { value: "net_metering", label: "Net Metering" },
          { value: "merchant", label: "Merchant" },
        ]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="PPA Rate ($/kWh)"
          type="number"
          step="0.001"
          value={form.ppa_rate_per_kwh ?? 0}
          onChange={(e) =>
            update({ ppa_rate_per_kwh: parseFloat(e.target.value) })
          }
        />
        <Field
          label="Annual Escalator"
          type="number"
          step="0.005"
          value={form.ppa_escalator ?? 0.02}
          onChange={(e) =>
            update({ ppa_escalator: parseFloat(e.target.value) })
          }
          hint="0.02 = 2%/yr"
        />
        <Field
          label="PPA Tenor (years)"
          type="number"
          value={form.ppa_tenor_years ?? 20}
          onChange={(e) =>
            update({ ppa_tenor_years: parseInt(e.target.value, 10) })
          }
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Target Equity Raise ($)"
          type="number"
          value={form.equity_raise_target ?? 0}
          onChange={(e) =>
            update({ equity_raise_target: parseFloat(e.target.value) })
          }
        />
        <Field
          label="Minimum Raise ($)"
          type="number"
          value={form.equity_raise_min ?? 0}
          onChange={(e) =>
            update({ equity_raise_min: parseFloat(e.target.value) })
          }
        />
      </div>
    </div>
  );
}
