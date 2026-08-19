import type { IntakeForm } from "../../utils/onboarding-types.js";
import { Field } from "./Field.js";

interface Props {
  form: IntakeForm;
  update: (patch: Partial<IntakeForm>) => void;
}

export function DeveloperInfo({ form, update }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-darkBg">Developer Contact</h2>
      <p className="text-textMuted text-sm">
        Preview the technical pilot intake with fictional or non-sensitive
        details. This public walkthrough does not transmit the information you
        enter.
      </p>
      <Field
        label="Your Name"
        value={form.developer_name}
        onChange={(e) => update({ developer_name: e.target.value })}
      />
      <Field
        label="Email"
        type="email"
        value={form.developer_email}
        onChange={(e) => update({ developer_email: e.target.value })}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Company (optional)"
          value={form.developer_company ?? ""}
          onChange={(e) => update({ developer_company: e.target.value })}
        />
        <Field
          label="Phone (optional)"
          value={form.developer_phone ?? ""}
          onChange={(e) => update({ developer_phone: e.target.value })}
        />
      </div>
    </div>
  );
}
