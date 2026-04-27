import { randomUUID } from "crypto";

export type InternalAgentKey =
  | "workflow_coo"
  | "lead_gen"
  | "underwriting"
  | "ic_memo"
  | "compliance_gatekeeper"
  | "diligence";

export type InternalAgentStatus = "READY" | "RUNNING" | "PAUSED";
export type InternalAgentRunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface InternalAgent {
  id: string;
  key: InternalAgentKey;
  name: string;
  objective: string;
  inputs: string[];
  outputs: string[];
  status: InternalAgentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalAgentRun {
  id: string;
  agentId: string;
  requestedByUserId: string | null;
  context: Record<string, unknown>;
  status: InternalAgentRunStatus;
  summary: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

type NewAgentSeed = Omit<InternalAgent, "id" | "status" | "createdAt" | "updatedAt">;

const DEFAULT_AGENT_SEEDS: NewAgentSeed[] = [
  {
    key: "workflow_coo",
    name: "Workflow COO Agent",
    objective: "Orchestrate cross-functional execution queues, owners, blockers, and escalations.",
    inputs: ["deal_updates", "task_backlog", "team_capacity", "deadline_calendar"],
    outputs: ["daily_priority_queue", "blocker_log", "handoff_actions", "escalation_flags"],
  },
  {
    key: "lead_gen",
    name: "Independent Lead Generation Agent",
    objective: "Continuously surface and score qualified project and sponsor opportunities.",
    inputs: ["public_project_data", "interconnection_queue_data", "target_profile", "market_news"],
    outputs: ["ranked_lead_list", "lead_scores", "outreach_drafts", "pipeline_gaps"],
  },
  {
    key: "underwriting",
    name: "Project Finance Underwriting Agent",
    objective: "Standardize underwriting with DSCR, capital stack, and downside sensitivity logic.",
    inputs: ["project_financial_inputs", "resource_assumptions", "debt_terms", "tax_credit_profile"],
    outputs: ["underwriting_memo", "sensitivity_table", "risk_flags", "go_no_go_recommendation"],
  },
  {
    key: "ic_memo",
    name: "IC Memo Copilot Agent",
    objective: "Transform diligence and underwriting outputs into committee-ready memos.",
    inputs: ["underwriting_memo", "diligence_findings", "compliance_notes", "investment_thesis"],
    outputs: ["ic_memo", "red_flag_summary", "approval_conditions", "decision_brief"],
  },
  {
    key: "compliance_gatekeeper",
    name: "Compliance Gatekeeper Agent",
    objective: "Pre-screen transactions and workflows for policy, sanctions, and eligibility risks.",
    inputs: ["transaction_payload", "counterparty_profile", "investor_eligibility", "jurisdiction_rules"],
    outputs: ["compliance_verdict", "required_controls", "escalation_reason", "audit_trail"],
  },
  {
    key: "diligence",
    name: "Issuer/Project Diligence Agent",
    objective: "Run repeatable diligence checklists and score structural, legal, and operational risk.",
    inputs: ["issuer_documents", "project_data_room", "custody_information", "audit_information"],
    outputs: ["diligence_scorecard", "risk_matrix", "conditions_precedent", "monitoring_plan"],
  },
];

class InternalAgentRegistry {
  private agents = new Map<string, InternalAgent>();
  private runs = new Map<string, InternalAgentRun>();
  private seeded = false;

  bootstrapDefaultAgents(): InternalAgent[] {
    if (this.seeded) {
      return this.listAgents();
    }

    for (const seed of DEFAULT_AGENT_SEEDS) {
      const now = new Date();
      const id = randomUUID();
      const agent: InternalAgent = {
        id,
        ...seed,
        status: "READY",
        createdAt: now,
        updatedAt: now,
      };
      this.agents.set(id, agent);
    }

    this.seeded = true;
    return this.listAgents();
  }

  listAgents(): InternalAgent[] {
    return Array.from(this.agents.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getAgent(agentId: string): InternalAgent | undefined {
    return this.agents.get(agentId);
  }

  runAgent(agentId: string, requestedByUserId: string | null, context: Record<string, unknown>): InternalAgentRun {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const runId = randomUUID();
    const startedAt = new Date();
    const finishedAt = new Date(startedAt.getTime() + 1000);

    agent.status = "RUNNING";
    agent.updatedAt = startedAt;

    const summary = this.generateSummary(agent, context);
    const run: InternalAgentRun = {
      id: runId,
      agentId,
      requestedByUserId,
      context,
      status: "SUCCEEDED",
      summary,
      createdAt: startedAt,
      startedAt,
      finishedAt,
    };
    this.runs.set(runId, run);

    agent.status = "READY";
    agent.updatedAt = finishedAt;
    this.agents.set(agentId, agent);

    return run;
  }

  listRunsForAgent(agentId: string): InternalAgentRun[] {
    return Array.from(this.runs.values())
      .filter((run) => run.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private generateSummary(agent: InternalAgent, context: Record<string, unknown>): string {
    const contextKeys = Object.keys(context);
    const contextDescriptor = contextKeys.length > 0
      ? `with context keys: ${contextKeys.join(", ")}`
      : "with no additional context payload";
    return `${agent.name} completed ${contextDescriptor}. Objective: ${agent.objective}`;
  }
}

export const internalAgentRegistry = new InternalAgentRegistry();
