import { randomUUID } from "crypto";
import { storage } from "../storage";

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
  output: Record<string, unknown>;
  error: string | null;
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

  async runAgent(agentId: string, requestedByUserId: string | null, context: Record<string, unknown>): Promise<InternalAgentRun> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const runId = randomUUID();
    const startedAt = new Date();

    agent.status = "RUNNING";
    agent.updatedAt = startedAt;
    this.agents.set(agentId, agent);

    const run: InternalAgentRun = {
      id: runId,
      agentId,
      requestedByUserId,
      context,
      status: "RUNNING",
      summary: "Run in progress",
      output: {},
      error: null,
      createdAt: startedAt,
      startedAt,
      finishedAt: null,
    };
    this.runs.set(runId, run);

    try {
      const output = await this.executeAgentTask(agent, context);
      const finishedAt = new Date();
      run.status = "SUCCEEDED";
      run.output = output;
      run.summary = this.generateSummary(agent, context, output);
      run.finishedAt = finishedAt;
      this.runs.set(runId, run);
      agent.status = "READY";
      agent.updatedAt = finishedAt;
      this.agents.set(agentId, agent);
      return run;
    } catch (error: any) {
      const finishedAt = new Date();
      run.status = "FAILED";
      run.error = error?.message || "Unknown execution failure";
      run.summary = `${agent.name} failed: ${run.error}`;
      run.finishedAt = finishedAt;
      this.runs.set(runId, run);
      agent.status = "READY";
      agent.updatedAt = finishedAt;
      this.agents.set(agentId, agent);
      return run;
    }
  }

  private async executeAgentTask(agent: InternalAgent, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (agent.key) {
      case "workflow_coo":
        return this.executeWorkflowCoo(context);
      case "lead_gen":
        return this.executeLeadGen(context);
      case "underwriting":
        return this.executeUnderwriting(context);
      case "ic_memo":
        return this.executeIcMemo(context);
      case "compliance_gatekeeper":
        return this.executeComplianceGatekeeper(context);
      case "diligence":
        return this.executeDiligence(context);
      default:
        return { message: "No task implementation configured" };
    }
  }

  listRunsForAgent(agentId: string): InternalAgentRun[] {
    return Array.from(this.runs.values())
      .filter((run) => run.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private generateSummary(agent: InternalAgent, context: Record<string, unknown>, output: Record<string, unknown>): string {
    const contextKeys = Object.keys(context);
    const outputKeys = Object.keys(output);
    const contextDescriptor = contextKeys.length > 0
      ? `with context keys: ${contextKeys.join(", ")}`
      : "with no additional context payload";
    const outputDescriptor = outputKeys.length > 0
      ? `Generated outputs: ${outputKeys.join(", ")}`
      : "Generated no explicit output fields";
    return `${agent.name} completed ${contextDescriptor}. ${outputDescriptor}. Objective: ${agent.objective}`;
  }

  private async executeWorkflowCoo(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projects = await storage.getAllProjects();
    const activeProjects = projects.filter((project) => project.status !== "REJECTED");
    const queue = await Promise.all(activeProjects.map(async (project) => {
      const checklist = await storage.getChecklistByProject(project.id);
      const missingRequired = checklist.filter((item) => item.required && item.status === "MISSING").length;
      const urgencyBoost = project.status === "IN_REVIEW" ? 20 : project.status === "SUBMITTED" ? 10 : 0;
      const priorityScore = Math.max(0, 100 - (missingRequired * 10) + urgencyBoost);
      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        missingRequiredItems: missingRequired,
        priorityScore,
      };
    }));

    queue.sort((a, b) => b.priorityScore - a.priorityScore);
    const maxItems = typeof context.maxItems === "number" ? Math.max(1, Math.floor(context.maxItems)) : 10;
    const topQueue = queue.slice(0, maxItems);
    const blockers = topQueue
      .filter((item) => item.missingRequiredItems > 0)
      .map((item) => ({
        projectId: item.projectId,
        projectName: item.projectName,
        blocker: `${item.missingRequiredItems} required checklist items missing`,
      }));

    return {
      generatedAt: new Date().toISOString(),
      dailyPriorityQueue: topQueue,
      blockerLog: blockers,
      handoffActions: blockers.map((b) => `Request data room completion for ${b.projectName}`),
      escalationFlags: blockers.length,
    };
  }

  private async executeLeadGen(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projects = await storage.getAllProjects();
    const targetState = typeof context.targetState === "string" ? context.targetState : null;
    const stageFilter = typeof context.stage === "string" ? context.stage : null;

    const scoped = projects.filter((project) => {
      if (targetState && project.state !== targetState) return false;
      if (stageFilter && project.stage !== stageFilter) return false;
      return true;
    });

    const leads = await Promise.all(scoped.map(async (project) => {
      const score = await storage.getReadinessScore(project.id);
      const interests = await storage.getInterestsByProject(project.id);
      return {
        projectId: project.id,
        projectName: project.name,
        state: project.state,
        stage: project.stage,
        technology: project.technology,
        readinessScore: score?.score ?? 0,
        inboundInterestCount: interests.length,
        leadScore: Math.round(((score?.score ?? 50) * 0.7) + (Math.min(interests.length, 10) * 3)),
      };
    }));

    leads.sort((a, b) => b.leadScore - a.leadScore);
    const topLeads = leads.slice(0, 15);

    return {
      generatedAt: new Date().toISOString(),
      rankedLeadList: topLeads,
      leadScores: topLeads.map((lead) => ({ projectId: lead.projectId, leadScore: lead.leadScore })),
      outreachDrafts: topLeads.slice(0, 5).map((lead) => ({
        projectId: lead.projectId,
        draft: `Hi team, ${lead.projectName} in ${lead.state} looks aligned with our current mandate. Can we schedule a diligence intro this week?`,
      })),
      pipelineGaps: this.identifyPipelineGaps(topLeads),
    };
  }

  private async executeUnderwriting(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = typeof context.projectId === "string" ? context.projectId : null;
    if (!projectId) {
      throw new Error("projectId is required for underwriting runs");
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const capitalStack = await storage.getCapitalStack(projectId);
    if (!capitalStack) {
      throw new Error("Capital stack not found");
    }

    const annualRevenue = this.estimateAnnualRevenue(project);
    const annualOpex = annualRevenue * 0.15;
    const annualDebtService = (Number(project.monthlyDebtService || "0") || 0) * 12;
    const cfads = annualRevenue - annualOpex;
    const dscr = annualDebtService > 0 ? Number((cfads / annualDebtService).toFixed(2)) : null;

    const riskFlags: string[] = [];
    if (!project.feocAttested) riskFlags.push("FEOC attestation missing");
    if (project.interconnectionStatus !== "IA_EXECUTED") riskFlags.push("Interconnection agreement not executed");
    if ((Number(project.validationConfidence || "0") || 0) < 75) riskFlags.push("Validation confidence below 75%");
    if (dscr !== null && dscr < 1.25) riskFlags.push("DSCR below preferred threshold");

    return {
      projectId,
      underwritingMemo: {
        projectName: project.name,
        annualRevenueUsd: Math.round(annualRevenue),
        annualOpexUsd: Math.round(annualOpex),
        annualDebtServiceUsd: Math.round(annualDebtService),
        cfadsUsd: Math.round(cfads),
        dscr,
      },
      sensitivityTable: [
        { scenario: "Base", revenueMultiplier: 1.0, dscr: dscr },
        { scenario: "P90-like (-10% revenue)", revenueMultiplier: 0.9, dscr: annualDebtService > 0 ? Number((((cfads * 0.9) / annualDebtService).toFixed(2))) : null },
        { scenario: "Stress (-20% revenue)", revenueMultiplier: 0.8, dscr: annualDebtService > 0 ? Number((((cfads * 0.8) / annualDebtService).toFixed(2))) : null },
      ],
      riskFlags,
      goNoGoRecommendation: riskFlags.length > 2 ? "NO_GO" : "GO_WITH_CONDITIONS",
      capitalStackSnapshot: {
        totalCapex: capitalStack.totalCapex,
        equityNeeded: capitalStack.equityNeeded,
        taxCreditEstimated: capitalStack.taxCreditEstimated,
      },
    };
  }

  private async executeIcMemo(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = typeof context.projectId === "string" ? context.projectId : null;
    if (!projectId) {
      throw new Error("projectId is required for ic_memo runs");
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const readiness = await storage.getReadinessScore(projectId);
    const interests = await storage.getInterestsByProject(projectId);
    const capitalStack = await storage.getCapitalStack(projectId);

    const totalIntent = interests.reduce((sum, interest) => sum + (Number(interest.amountIntent || "0") || 0), 0);
    const redFlags: string[] = [];
    if ((readiness?.score ?? 0) < 60) redFlags.push("Readiness score below 60");
    if (!project.feocAttested) redFlags.push("FEOC attestation missing");
    if (!capitalStack?.taxCreditTransferabilityReady) redFlags.push("Tax credit transferability not ready");

    const recommendation = redFlags.length > 2 ? "DECLINE" : "APPROVE_WITH_CONDITIONS";

    return {
      projectId,
      icMemo: {
        title: `IC Memo — ${project.name}`,
        executiveSummary: `${project.name} in ${project.state} (${project.capacityMW} MW) evaluated with readiness score ${readiness?.score ?? "N/A"}.`,
        totalInboundIntentUsd: totalIntent,
        recommendation,
      },
      redFlagSummary: redFlags,
      approvalConditions: redFlags.map((flag) => `Resolve: ${flag}`),
      decisionBrief: `Recommendation is ${recommendation} based on current readiness, diligence, and financing posture.`,
    };
  }

  private async executeComplianceGatekeeper(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = typeof context.projectId === "string" ? context.projectId : null;
    const investorId = typeof context.investorId === "string" ? context.investorId : null;

    const controls: string[] = [];
    const escalations: string[] = [];
    let verdict: "PROCEED" | "PROCEED_WITH_CONTROLS" | "ESCALATE" = "PROCEED";

    if (projectId) {
      const project = await storage.getProject(projectId);
      if (!project) throw new Error("Project not found");
      if (!project.feocAttested) {
        controls.push("Require FEOC attestation before execution");
        verdict = "PROCEED_WITH_CONTROLS";
      }
      if (project.status !== "APPROVED") {
        escalations.push("Project is not approved for investor execution");
        verdict = "ESCALATE";
      }
    }

    if (investorId) {
      const investor = await storage.getUser(investorId);
      if (!investor) throw new Error("Investor not found");
      if (investor.personaStatus !== "completed") {
        controls.push("Investor identity verification must be completed");
        verdict = verdict === "ESCALATE" ? "ESCALATE" : "PROCEED_WITH_CONTROLS";
      }
    }

    return {
      complianceVerdict: verdict,
      requiredControls: controls,
      escalationReason: escalations,
      auditTrail: {
        checkedAt: new Date().toISOString(),
        projectId,
        investorId,
      },
    };
  }

  private async executeDiligence(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = typeof context.projectId === "string" ? context.projectId : null;
    if (!projectId) {
      throw new Error("projectId is required for diligence runs");
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const checklist = await storage.getChecklistByProject(projectId);
    const documents = await storage.getDocumentsByProject(projectId);
    const readiness = await storage.getReadinessScore(projectId);

    const requiredChecklist = checklist.filter((item) => item.required);
    const completedRequired = requiredChecklist.filter((item) => item.status === "UPLOADED").length;
    const diligenceScore = requiredChecklist.length > 0
      ? Math.round((completedRequired / requiredChecklist.length) * 100)
      : 0;

    const riskMatrix = [
      {
        category: "Data Room Completeness",
        level: diligenceScore >= 80 ? "LOW" : diligenceScore >= 60 ? "MEDIUM" : "HIGH",
        detail: `${completedRequired}/${requiredChecklist.length} required checklist items uploaded`,
      },
      {
        category: "Readiness",
        level: (readiness?.score ?? 0) >= 75 ? "LOW" : (readiness?.score ?? 0) >= 50 ? "MEDIUM" : "HIGH",
        detail: `Readiness score ${readiness?.score ?? 0}`,
      },
      {
        category: "Documentation",
        level: documents.length >= 6 ? "LOW" : documents.length >= 3 ? "MEDIUM" : "HIGH",
        detail: `${documents.length} uploaded diligence documents`,
      },
    ];

    const conditionsPrecedent = riskMatrix
      .filter((risk) => risk.level !== "LOW")
      .map((risk) => `Mitigate ${risk.category}: ${risk.detail}`);

    return {
      projectId,
      diligenceScorecard: {
        projectName: project.name,
        diligenceScore,
        documentsUploaded: documents.length,
        readinessScore: readiness?.score ?? 0,
      },
      riskMatrix,
      conditionsPrecedent,
      monitoringPlan: {
        cadence: "weekly",
        owner: "diligence_ops",
        nextReview: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
      },
    };
  }

  private identifyPipelineGaps(leads: Array<{ state: string; technology: string }>): string[] {
    const states = new Set(leads.map((lead) => lead.state));
    const technologies = new Set(leads.map((lead) => lead.technology));
    const gaps: string[] = [];
    if (!states.has("Texas")) gaps.push("No Texas leads in current top-ranked set");
    if (!states.has("California")) gaps.push("No California leads in current top-ranked set");
    if (!technologies.has("SOLAR_STORAGE")) gaps.push("Low solar+storage representation");
    return gaps;
  }

  private estimateAnnualRevenue(project: { capacityMW: string | null; ppaRate: string | null; marketPpaBenchmarkUsdPerMwh: string | null }): number {
    const capacityMw = Number(project.capacityMW || "0") || 0;
    const annualMwh = capacityMw * 8760 * 0.27;
    const ppaRate = Number(project.ppaRate || "0") || Number(project.marketPpaBenchmarkUsdPerMwh || "0") || 64.49;
    return annualMwh * ppaRate;
  }
}

export const internalAgentRegistry = new InternalAgentRegistry();
