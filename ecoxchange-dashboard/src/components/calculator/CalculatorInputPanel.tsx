import { RotateCcw } from "lucide-react";
import { SliderInput } from "./SliderInput.js";
import type { CalculatorInputs } from "../../utils/calculator.js";

interface Props {
  inputs: CalculatorInputs;
  onChange: (patch: Partial<CalculatorInputs>) => void;
  onReset: () => void;
}

export function CalculatorInputPanel({ inputs, onChange, onReset }: Props) {
  return (
    <div className="space-y-5 rounded-xl border border-paleGreen/60 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-darkBg">Your Investment</h3>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-medGreen hover:text-darkBg"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <SliderInput
        label="Initial Investment"
        value={inputs.initial_investment}
        min={10000}
        max={500000}
        step={5000}
        format="currency"
        onChange={(v) => onChange({ initial_investment: v })}
      />
      <SliderInput
        label="Monthly Contribution"
        value={inputs.monthly_contribution}
        min={0}
        max={50000}
        step={500}
        format="currency"
        onChange={(v) => onChange({ monthly_contribution: v })}
      />
      <SliderInput
        label="Time Horizon"
        value={inputs.time_horizon_years}
        min={1}
        max={25}
        step={1}
        format="years"
        onChange={(v) => onChange({ time_horizon_years: Math.round(v) })}
      />
      <SliderInput
        label="Annual Yield"
        value={inputs.annual_yield}
        min={0}
        max={0.12}
        step={0.0025}
        format="percent"
        onChange={(v) => onChange({ annual_yield: v })}
      />
      <SliderInput
        label="Token Appreciation"
        value={inputs.annual_appreciation}
        min={0}
        max={0.05}
        step={0.0025}
        format="percent"
        onChange={(v) => onChange({ annual_appreciation: v })}
      />

      <label className="flex cursor-pointer items-center gap-3 border-t border-paleGreen/50 pt-4">
        <button
          type="button"
          role="switch"
          aria-checked={inputs.reinvest_distributions}
          onClick={() =>
            onChange({ reinvest_distributions: !inputs.reinvest_distributions })
          }
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
            inputs.reinvest_distributions ? "bg-medGreen" : "bg-paleGreen"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
              inputs.reinvest_distributions ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-darkBg">
          Reinvest distributions (DRIP)
        </span>
      </label>
    </div>
  );
}
