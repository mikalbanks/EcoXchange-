// Client-side returns calculator (Spec 07). Pure functions over an offering's
// published economics — no backend. Yields/appreciation are ratios (0.07 = 7%).

export interface CalculatorInputs {
  initial_investment: number; // $10,000 – $500,000
  monthly_contribution: number; // $0 – $50,000 ($0 = one-time)
  time_horizon_years: number; // 1 – 25 years
  reinvest_distributions: boolean; // DRIP toggle
  annual_yield: number; // ratio, pre-filled from offering
  annual_appreciation: number; // token value appreciation ratio (default 0)
}

export interface MonthlyDataPoint {
  month: number;
  date_label: string;
  cumulative_invested: number;
  cumulative_distributions: number;
  portfolio_value: number;
  total_value: number;
}

export interface CalculatorOutputs {
  total_invested: number;
  total_distributions_received: number;
  ending_portfolio_value: number;
  total_return: number;
  effective_irr: number;
  monthly_series: MonthlyDataPoint[];
  vs_sp500: number;
  vs_savings: number;
  vs_tips: number;
}

export function computeReturns(inputs: CalculatorInputs): CalculatorOutputs {
  const {
    initial_investment,
    monthly_contribution,
    time_horizon_years,
    reinvest_distributions,
    annual_yield,
    annual_appreciation,
  } = inputs;

  const monthly_yield = annual_yield / 12;
  const monthly_appreciation = annual_appreciation / 12;
  const total_months = Math.round(time_horizon_years * 12);

  const monthly_series: MonthlyDataPoint[] = [];

  let cumulative_invested = initial_investment;
  let cumulative_distributions = 0;
  let portfolio_value = initial_investment;

  const base_date = new Date();

  for (let month = 1; month <= total_months; month++) {
    // Monthly contribution (starts month 2)
    if (month > 1 && monthly_contribution > 0) {
      portfolio_value += monthly_contribution;
      cumulative_invested += monthly_contribution;
    }

    // Monthly distribution (yield on current portfolio value)
    const monthly_distribution = portfolio_value * monthly_yield;

    if (reinvest_distributions) {
      // DRIP: distribution buys more tokens
      portfolio_value += monthly_distribution;
    } else {
      // Cash out: distribution goes to cumulative payouts
      cumulative_distributions += monthly_distribution;
    }

    // Token appreciation (applied to portfolio value)
    portfolio_value *= 1 + monthly_appreciation;

    const labelDate = new Date(base_date);
    labelDate.setMonth(labelDate.getMonth() + month);
    const date_label = labelDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const total_value = reinvest_distributions
      ? portfolio_value
      : portfolio_value + cumulative_distributions;

    monthly_series.push({
      month,
      date_label,
      cumulative_invested,
      cumulative_distributions: reinvest_distributions
        ? 0
        : cumulative_distributions,
      portfolio_value,
      total_value,
    });
  }

  const total_invested = cumulative_invested;
  const ending_portfolio_value = portfolio_value;
  const total_distributions_received = reinvest_distributions
    ? 0
    : cumulative_distributions;
  const total_return =
    ending_portfolio_value + total_distributions_received - total_invested;

  const effective_irr = computeIRR(
    initial_investment,
    monthly_contribution,
    total_months,
    ending_portfolio_value + total_distributions_received,
  );

  const vs_sp500 = computeBenchmark(
    initial_investment,
    monthly_contribution,
    total_months,
    0.1,
  );
  const vs_savings = computeBenchmark(
    initial_investment,
    monthly_contribution,
    total_months,
    0.045,
  );
  const vs_tips = computeBenchmark(
    initial_investment,
    monthly_contribution,
    total_months,
    0.025,
  );

  return {
    total_invested,
    total_distributions_received,
    ending_portfolio_value,
    total_return,
    effective_irr,
    monthly_series,
    vs_sp500,
    vs_savings,
    vs_tips,
  };
}

export function computeBenchmark(
  initial: number,
  monthly: number,
  months: number,
  annual_rate: number,
): number {
  const r = annual_rate / 12;
  let value = initial;
  for (let m = 1; m <= months; m++) {
    if (m > 1) value += monthly;
    value *= 1 + r;
  }
  return value;
}

// Newton-Raphson money-weighted IRR. Cash flows: -initial at t=0,
// -monthly at t=1..months-1, +terminal at t=months. Simplified per spec
// (non-DRIP distributions are lumped into the terminal value).
export function computeIRR(
  initial: number,
  monthly: number,
  months: number,
  terminal_value: number,
): number {
  let rate = 0.08 / 12; // initial guess: 8% annual

  for (let iteration = 0; iteration < 100; iteration++) {
    let npv = -initial;
    let dnpv = 0;

    for (let t = 1; t < months; t++) {
      const discount = Math.pow(1 + rate, t);
      npv -= monthly / discount;
      dnpv += (t * monthly) / (discount * (1 + rate));
    }

    const terminal_discount = Math.pow(1 + rate, months);
    npv += terminal_value / terminal_discount;
    dnpv -= (months * terminal_value) / (terminal_discount * (1 + rate));

    if (Math.abs(npv) < 0.01) break;
    rate -= npv / dnpv;

    // Guard against divergence
    if (rate < -0.5 || rate > 1) {
      rate = 0.08 / 12;
      break;
    }
  }

  return rate * 12; // monthly → annual
}
