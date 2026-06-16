import { useEffect, useMemo, useState } from "react";
import { CalculatorInputPanel } from "./CalculatorInputPanel.js";
import { CalculatorOutputPanel } from "./CalculatorOutputPanel.js";
import { CalculatorDisclaimer } from "./CalculatorDisclaimer.js";
import { computeReturns, type CalculatorInputs } from "../../utils/calculator.js";

interface OfferingDefaults {
  target_annual_yield: number;
  target_irr: number;
  minimum_investment: number;
  offering_name: string;
}

interface Props {
  offering?: OfferingDefaults;
  standalone?: boolean;
}

function defaultInputs(offering?: OfferingDefaults): CalculatorInputs {
  return {
    initial_investment: offering?.minimum_investment ?? 10000,
    monthly_contribution: 0,
    time_horizon_years: 10,
    reinvest_distributions: false,
    annual_yield: offering?.target_annual_yield ?? 0.07,
    annual_appreciation: 0,
  };
}

export function ReturnsCalculator({ offering }: Props) {
  const [inputs, setInputs] = useState<CalculatorInputs>(() =>
    defaultInputs(offering),
  );
  // Debounced copy so dragging a slider stays smooth; compute follows ~100ms behind.
  const [debounced, setDebounced] = useState<CalculatorInputs>(inputs);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputs), 100);
    return () => clearTimeout(t);
  }, [inputs]);

  const outputs = useMemo(() => computeReturns(debounced), [debounced]);

  const update = (patch: Partial<CalculatorInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));
  const reset = () => setInputs(defaultInputs(offering));

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <CalculatorInputPanel inputs={inputs} onChange={update} onReset={reset} />
        <CalculatorOutputPanel inputs={debounced} outputs={outputs} />
      </div>
      <CalculatorDisclaimer />
    </div>
  );
}
