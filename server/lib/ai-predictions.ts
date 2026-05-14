import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ProjectFinancialData {
  projectName: string;
  capacityMW: string;
  technology: string;
  stage: string;
  state: string;
  totalCapex?: string;
  taxCreditEstimated?: string;
  equityNeeded?: string;
  ppaRate?: string;
  ppaEscalation?: string;
  offtakerName?: string;
  contractYears?: number;
  monthlyProduction?: { month: string; mwh: number }[];
  annualRevenue?: { gross: number; net: number };
  totalDistributed?: number;
  capacityFactor?: number;
}

export interface AIPrediction {
  summary: string;
  projectedAnnualRevenue: string;
  estimatedIRR: string;
  paybackPeriod: string;
  fiveYearReturn: string;
  tenYearReturn: string;
  yieldOnCost: string;
  riskFactors: string[];
  strengths: string[];
  recommendation: string;
}

export async function generateROIPrediction(data: ProjectFinancialData): Promise<AIPrediction> {
  const prompt = buildPrompt(data);

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are a renewable energy financial analyst specializing in solar project investment analysis. You provide detailed, data-driven ROI predictions for digital securities backed by renewable energy assets. Your analysis should be professional, quantitative, and suitable for accredited investors evaluating Reg D 506(c) offerings. Always base your analysis on the actual data provided. Return your analysis as valid JSON matching the exact schema requested.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI model");
  }

  const parsed = JSON.parse(content);
  return {
    summary: String(parsed.summary || ""),
    projectedAnnualRevenue: String(parsed.projectedAnnualRevenue || ""),
    estimatedIRR: String(parsed.estimatedIRR || ""),
    paybackPeriod: String(parsed.paybackPeriod || ""),
    fiveYearReturn: String(parsed.fiveYearReturn || ""),
    tenYearReturn: String(parsed.tenYearReturn || ""),
    yieldOnCost: String(parsed.yieldOnCost || ""),
    riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.map(String) : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    recommendation: String(parsed.recommendation || ""),
  };
}

function buildPrompt(data: ProjectFinancialData): string {
  let prompt = `Analyze the following renewable energy project and provide a detailed ROI prediction.\n\n`;
  prompt += `## Project Overview\n`;
  prompt += `- Name: ${data.projectName}\n`;
  prompt += `- Capacity: ${data.capacityMW} MW\n`;
  prompt += `- Technology: ${data.technology}\n`;
  prompt += `- Stage: ${data.stage}\n`;
  prompt += `- Location: ${data.state}\n\n`;

  if (data.totalCapex || data.equityNeeded) {
    prompt += `## Capital Structure\n`;
    if (data.totalCapex) prompt += `- Total Capex: $${Number(data.totalCapex).toLocaleString()}\n`;
    if (data.taxCreditEstimated) prompt += `- Tax Credit (ITC): $${Number(data.taxCreditEstimated).toLocaleString()}\n`;
    if (data.equityNeeded) prompt += `- Equity Needed: $${Number(data.equityNeeded).toLocaleString()}\n`;
    prompt += `\n`;
  }

  if (data.ppaRate) {
    prompt += `## Power Purchase Agreement\n`;
    prompt += `- PPA Rate: $${data.ppaRate}/MWh\n`;
    if (data.ppaEscalation) prompt += `- Annual Escalation: ${data.ppaEscalation}%\n`;
    if (data.offtakerName) prompt += `- Offtaker: ${data.offtakerName}\n`;
    if (data.contractYears) prompt += `- Contract Term: ${data.contractYears} years\n`;
    prompt += `\n`;
  }

  if (data.monthlyProduction && data.monthlyProduction.length > 0) {
    prompt += `## Historical Production Data\n`;
    const totalMwh = data.monthlyProduction.reduce((sum, m) => sum + m.mwh, 0);
    prompt += `- Annual Production: ${totalMwh.toLocaleString()} MWh\n`;
    if (data.capacityFactor) prompt += `- Capacity Factor: ${(data.capacityFactor * 100).toFixed(1)}%\n`;
    prompt += `- Monthly Breakdown:\n`;
    data.monthlyProduction.forEach((m) => {
      prompt += `  - ${m.month}: ${m.mwh.toLocaleString()} MWh\n`;
    });
    prompt += `\n`;
  }

  if (data.annualRevenue) {
    prompt += `## Revenue Data\n`;
    prompt += `- Gross Annual Revenue: $${data.annualRevenue.gross.toLocaleString()}\n`;
    prompt += `- Net Annual Revenue (after 15% opex): $${data.annualRevenue.net.toLocaleString()}\n`;
    if (data.totalDistributed) prompt += `- Total Distributed to Investors: $${data.totalDistributed.toLocaleString()}\n`;
    prompt += `\n`;
  }

  prompt += `## Platform Parameters\n`;
  prompt += `- Operating Expenses: 15% of gross revenue\n`;
  prompt += `- Platform Fee: 0.75% of distributable amount\n`;
  prompt += `- Securities Type: SPV Membership Interests (Reg D 506(c))\n`;
  prompt += `- Annual Degradation: ~0.5%/year\n\n`;

  prompt += `Provide your analysis as a JSON object with these exact fields:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "2-3 sentence executive summary of the investment opportunity",\n`;
  prompt += `  "projectedAnnualRevenue": "Projected annual net revenue (e.g. '$520,000')",\n`;
  prompt += `  "estimatedIRR": "Estimated project-level IRR (e.g. '8.5%')",\n`;
  prompt += `  "paybackPeriod": "Estimated payback period (e.g. '7.2 years')",\n`;
  prompt += `  "fiveYearReturn": "Projected cumulative return over 5 years (e.g. '$2.4M')",\n`;
  prompt += `  "tenYearReturn": "Projected cumulative return over 10 years (e.g. '$5.1M')",\n`;
  prompt += `  "yieldOnCost": "Annual yield on total cost basis (e.g. '9.2%')",\n`;
  prompt += `  "riskFactors": ["risk1", "risk2", "risk3", ...],\n`;
  prompt += `  "strengths": ["strength1", "strength2", "strength3", ...],\n`;
  prompt += `  "recommendation": "1-2 sentence investment recommendation"\n`;
  prompt += `}\n`;

  return prompt;
}
