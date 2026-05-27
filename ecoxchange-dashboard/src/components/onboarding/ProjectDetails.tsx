import type { IntakeForm } from "../../utils/onboarding-types.js";
import { Field } from "./Field.js";

interface Props {
  form: IntakeForm;
  update: (patch: Partial<IntakeForm>) => void;
}

export function ProjectDetails({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-darkBg">Project Details</h2>
      <Field
        label="Project Name"
        value={form.project_name}
        onChange={(e) => update({ project_name: e.target.value })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Latitude"
          type="number"
          step="0.01"
          value={form.latitude}
          onChange={(e) => update({ latitude: parseFloat(e.target.value) })}
        />
        <Field
          label="Longitude"
          type="number"
          step="0.01"
          value={form.longitude}
          onChange={(e) => update({ longitude: parseFloat(e.target.value) })}
        />
        <Field
          label="Capacity (kW DC)"
          type="number"
          value={form.capacity_kw_dc}
          onChange={(e) =>
            update({ capacity_kw_dc: parseFloat(e.target.value) })
          }
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Tilt (degrees)"
          type="number"
          value={form.tilt_deg}
          onChange={(e) => update({ tilt_deg: parseFloat(e.target.value) })}
          hint="0 = horizontal, ~latitude = optimal"
        />
        <Field
          label="Azimuth (degrees)"
          type="number"
          value={form.azimuth_deg}
          onChange={(e) =>
            update({ azimuth_deg: parseFloat(e.target.value) })
          }
          hint="180 = due south"
        />
        <Field
          label="Commissioning Date"
          type="date"
          value={form.commissioning_date}
          onChange={(e) => update({ commissioning_date: e.target.value })}
        />
      </div>
      <details className="text-sm text-textMuted">
        <summary className="cursor-pointer hover:text-textDark">
          Advanced (module efficiency, losses, degradation)
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <Field
            label="Module Efficiency"
            type="number"
            step="0.01"
            value={form.module_efficiency}
            onChange={(e) =>
              update({ module_efficiency: parseFloat(e.target.value) })
            }
          />
          <Field
            label="System Losses"
            type="number"
            step="0.01"
            value={form.system_losses}
            onChange={(e) =>
              update({ system_losses: parseFloat(e.target.value) })
            }
          />
          <Field
            label="Annual Degradation"
            type="number"
            step="0.0005"
            value={form.degradation_rate}
            onChange={(e) =>
              update({ degradation_rate: parseFloat(e.target.value) })
            }
          />
        </div>
      </details>
    </div>
  );
}
