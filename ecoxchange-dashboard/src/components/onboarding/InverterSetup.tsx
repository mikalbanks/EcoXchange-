import { useState } from "react";
import { verifyCredentials } from "../../data/onboarding.js";
import type { IntakeForm } from "../../utils/onboarding-types.js";
import { Field, Select } from "./Field.js";

interface Props {
  form: IntakeForm;
  update: (patch: Partial<IntakeForm>) => void;
}

export function InverterSetup({ form, update }: Props) {
  const [verifyState, setVerifyState] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (
      !form.inverter_api_key ||
      !form.inverter_plant_id ||
      form.inverter_brand === "other"
    )
      return;
    setVerifyState("checking");
    setVerifyError(null);
    try {
      const r = await verifyCredentials(
        form.inverter_brand,
        form.inverter_api_key,
        form.inverter_plant_id,
      );
      if (r.valid) {
        setVerifyState("valid");
      } else {
        setVerifyState("invalid");
        setVerifyError(r.error ?? "Invalid credentials");
      }
    } catch (err) {
      setVerifyState("invalid");
      setVerifyError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl text-darkBg">Data Access</h2>
      <p className="text-textMuted text-sm">
        Inverter credentials are optional. We can run the backtest with satellite
        data alone, but with real inverter readings we deliver a full
        three-way reconciliation report.
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
          Optional: provide API credentials for a full reconciliation backtest
        </div>
        <Field
          label="API Key"
          type="password"
          autoComplete="off"
          value={form.inverter_api_key ?? ""}
          onChange={(e) => update({ inverter_api_key: e.target.value })}
        />
        <Field
          label="Plant / Site ID"
          value={form.inverter_plant_id ?? ""}
          onChange={(e) => update({ inverter_plant_id: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-medGreen text-medGreen px-3 py-1.5 text-sm hover:bg-medGreen hover:text-white disabled:opacity-50 transition-colors duration-150"
            onClick={handleVerify}
            disabled={
              !form.inverter_api_key ||
              !form.inverter_plant_id ||
              form.inverter_brand === "other" ||
              verifyState === "checking"
            }
          >
            {verifyState === "checking"
              ? "Verifying…"
              : "Verify Credentials"}
          </button>
          {verifyState === "valid" ? (
            <span className="text-sm text-accentBrt">✓ Valid</span>
          ) : null}
          {verifyState === "invalid" ? (
            <span className="text-sm text-flagAmber">
              ✗ {verifyError ?? "Invalid"}
            </span>
          ) : null}
        </div>
      </div>

      <Field
        label="Utility Provider (optional)"
        value={form.utility_provider ?? ""}
        onChange={(e) => update({ utility_provider: e.target.value })}
      />
    </div>
  );
}
