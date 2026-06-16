import { StatCard } from "../StatCard.js";
import { AnimatedNumber } from "../shared/AnimatedNumber.js";
import { formatUsd } from "../../utils/formatters.js";
import { ProjectionChart } from "./ProjectionChart.js";
import { BenchmarkComparison } from "./BenchmarkComparison.js";
import type {
  CalculatorInputs,
  CalculatorOutputs,
} from "../../utils/calculator.js";

interface Props {
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
}

export function CalculatorOutputPanel({ inputs, outputs }: Props) {
  const totalValue =
    outputs.ending_portfolio_value + outputs.total_distributions_received;
  const monthlyIncome =
    outputs.ending_portfolio_value * (inputs.annual_yield / 12);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Value"
          value={<AnimatedNumber value={totalValue} format={(n) => formatUsd(n)} />}
          sublabel={`after ${inputs.time_horizon_years} years`}
        />
        <StatCard
          label="Monthly Income"
          value={
            <AnimatedNumber value={monthlyIncome} format={(n) => formatUsd(n)} />
          }
          sublabel="at final-year rate"
        />
        <StatCard
          label="Effective IRR"
          value={
            <AnimatedNumber
              value={outputs.effective_irr * 100}
              format={(n) => `${n.toFixed(1)}%`}
            />
          }
          sublabel="money-weighted"
        />
      </div>

      <div className="rounded-xl border border-paleGreen/60 bg-white p-5 shadow-sm">
        <ProjectionChart
          series={outputs.monthly_series}
          reinvest={inputs.reinvest_distributions}
        />
      </div>

      <div className="rounded-xl border border-paleGreen/60 bg-white p-6 shadow-sm">
        <BenchmarkComparison
          esnValue={totalValue}
          vsSp500={outputs.vs_sp500}
          vsSavings={outputs.vs_savings}
          vsTips={outputs.vs_tips}
        />
      </div>
    </div>
  );
}
