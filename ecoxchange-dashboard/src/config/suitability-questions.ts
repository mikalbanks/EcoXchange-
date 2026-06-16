import type { SuitabilityQuestion } from "../types/suitability.js";

// 8-question suitability flow (Spec 10).
export const SUITABILITY_QUESTIONS: SuitabilityQuestion[] = [
  {
    id: "experience",
    question: "What is your experience with alternative investments?",
    subtitle:
      "Alternative investments include real estate, private equity, venture capital, commodities, and infrastructure.",
    type: "single_select",
    field: "experience_level",
    options: [
      { value: "first_alternative", label: "This is my first", description: "I primarily invest in stocks, bonds, and mutual funds", icon: "Sprout" },
      { value: "some_alternatives", label: "Some experience", description: "I have made 1-3 alternative investments before", icon: "TrendingUp" },
      { value: "experienced", label: "Experienced", description: "I regularly allocate to alternative assets", icon: "BarChart3" },
      { value: "professional", label: "Professional", description: "I work in finance or manage investment portfolios", icon: "Briefcase" },
    ],
  },
  {
    id: "objective",
    question: "What is your primary investment objective?",
    subtitle: "Choose the goal that matters most to you for this investment.",
    type: "single_select",
    field: "primary_objective",
    options: [
      { value: "income", label: "Regular income", description: "Monthly USDC distributions I can count on", icon: "Wallet" },
      { value: "growth", label: "Long-term growth", description: "Compounding returns over the life of the asset", icon: "TrendingUp" },
      { value: "diversification", label: "Portfolio diversification", description: "An uncorrelated asset to reduce overall portfolio risk", icon: "PieChart" },
      { value: "impact", label: "Climate impact", description: "Measurable environmental outcomes alongside returns", icon: "Leaf" },
    ],
  },
  {
    id: "risk",
    question: "How would you describe your risk tolerance?",
    subtitle: "Solar infrastructure investments carry illiquidity risk and production variability.",
    type: "single_select",
    field: "risk_tolerance",
    options: [
      { value: "conservative", label: "Conservative", description: "I prefer lower, more predictable returns with strong downside protection", icon: "Shield" },
      { value: "moderate", label: "Moderate", description: "I accept some variability for better expected returns", icon: "Scale" },
      { value: "aggressive", label: "Aggressive", description: "I am comfortable with higher risk for maximum yield potential", icon: "Zap" },
    ],
  },
  {
    id: "horizon",
    question: "What is your investment time horizon?",
    subtitle: "Solar PPAs typically run 15-25 years. ESN tokens may have limited secondary liquidity.",
    type: "single_select",
    field: "time_horizon",
    options: [
      { value: "short", label: "1-3 years", description: "I may need this capital back relatively soon", icon: "Clock" },
      { value: "medium", label: "3-7 years", description: "I can leave this capital invested for several years", icon: "Calendar" },
      { value: "long", label: "7+ years", description: "This is a long-term hold — I want the full PPA lifecycle", icon: "CalendarRange" },
    ],
  },
  {
    id: "allocation",
    question: "How much are you planning to allocate?",
    subtitle: "Minimum investment is $10,000. There is no maximum.",
    type: "single_select",
    field: "planned_allocation",
    options: [
      { value: "minimum", label: "$10K – $25K", description: "Starting with a single position", icon: "DollarSign" },
      { value: "moderate", label: "$25K – $100K", description: "Building a meaningful allocation", icon: "Layers" },
      { value: "significant", label: "$100K – $500K", description: "Significant portfolio position", icon: "Building2" },
      { value: "institutional", label: "$500K+", description: "Institutional-scale allocation", icon: "Landmark" },
    ],
  },
  {
    id: "impact_priorities",
    question: "Which impact outcomes matter most to you?",
    subtitle: "Select all that apply. These help us highlight the metrics you care about.",
    type: "multi_select",
    field: "impact_priorities",
    options: [
      { value: "carbon_reduction", label: "Carbon reduction", description: "Reducing greenhouse gas emissions", icon: "CloudOff" },
      { value: "energy_access", label: "Energy access", description: "Expanding clean energy availability", icon: "Sun" },
      { value: "local_jobs", label: "Local job creation", description: "Supporting construction and O&M employment", icon: "HardHat" },
      { value: "grid_resilience", label: "Grid resilience", description: "Strengthening distributed energy infrastructure", icon: "Plug" },
    ],
  },
  {
    id: "solar_exp",
    question: "Have you previously invested in solar energy or energy infrastructure?",
    subtitle: "",
    type: "boolean",
    field: "solar_experience",
    options: [
      { value: "true", label: "Yes", description: "I have prior solar/energy investments", icon: "Check" },
      { value: "false", label: "No", description: "This would be my first", icon: "X" },
    ],
  },
  {
    id: "crypto",
    question: "How comfortable are you with digital assets and USDC?",
    subtitle:
      "EcoXchange distributions are paid in USDC (a US dollar stablecoin) on the Base blockchain. You will not need to manage private keys.",
    type: "single_select",
    field: "crypto_comfort",
    options: [
      { value: "new", label: "New to crypto", description: "I have not used digital currencies before", icon: "HelpCircle" },
      { value: "familiar", label: "Familiar", description: "I have used USDC or other stablecoins", icon: "Coins" },
      { value: "experienced", label: "Experienced", description: "I actively use DeFi protocols and digital wallets", icon: "Cpu" },
    ],
  },
];
