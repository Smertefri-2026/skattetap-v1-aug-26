import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseConflicts } from "@/lib/cases/conflicts";
import { getDocumentationSummary } from "@/lib/cases/documentationSummary";
import { buildCaseTimeline } from "@/lib/cases/timeline";
import { summarizeCase } from "@/lib/cases/crossCaseSummaries";
import type { NextActionType } from "@/lib/cases/nextActionEngine";
import { getCaseEntitlement } from "@/lib/products/entitlement";

export interface SaksbehandlerContextDocument {
  id: string;
  fileName: string;
  documentType: string;
  documentDate: string | null;
  credibility: "high" | "medium" | "low" | null;
}

export interface SaksbehandlerContextGap {
  id: string;
  description: string;
  importance: string | null;
  recommendedDocument: string | null;
}

export interface SaksbehandlerContextConflict {
  id: string;
  statementA: string;
  statementB: string;
  reasoning: string;
  clarifyingQuestion: string;
  recommendedDocument: string | null;
}

export interface SaksbehandlerContextTimelineEvent {
  documentId: string;
  date: string;
  fileName: string;
  keyPoints: string[];
}

export interface SaksbehandlerContextReport {
  type: string;
  createdAt: string;
}

export interface SaksbehandlerNextAction {
  action: string;
  reasoning: string;
  actionType: NextActionType;
}

export interface SaksbehandlerContextLegalSource {
  citation: string;
  sourceType: string;
  locator: string | null;
  bmSummary: string;
  relevanceReasoning: string;
  supports: "kunden" | "skatteetaten" | "noytral" | "uklar";
}

export interface SaksbehandlerContextLegalQuestion {
  question: string;
  hasCompletedAnalysis: boolean;
  ourAssessment: string | null;
  sources: SaksbehandlerContextLegalSource[];
}

/**
 * Everything Min saksbehandler is allowed to know about a case, in one
 * place. Deliberately built on `summarizeCase` (the same case-summarizing
 * logic Strategisk utredning already uses for cross-case analysis) and
 * `buildCaseTimeline`/`getCaseConflicts` (the same functions Levende
 * saksbilde renders from) rather than second, chat-specific queries -- one
 * source of truth for "what do we know about this case," not several that
 * can drift apart. nextAction in particular is read straight off the case
 * row (the same field NextActionCard renders) rather than re-derived here,
 * so the chat's recommendation and the case's official one can never
 * disagree.
 */
export interface SaksbehandlerContext {
  caseTitle: string;
  stage: string;
  status: string;
  totalAmountKr: number;
  documentedFacts: string[];
  gaps: SaksbehandlerContextGap[];
  openConflicts: SaksbehandlerContextConflict[];
  documents: SaksbehandlerContextDocument[];
  timelineEvents: SaksbehandlerContextTimelineEvent[];
  reports: SaksbehandlerContextReport[];
  nextAction: SaksbehandlerNextAction | null;
  applicableRules: { rule_code: string; law_reference: string; provision: string; short_explanation: string }[];
  legalQuestions: SaksbehandlerContextLegalQuestion[];
  documentCount: number;
  documentsBeingProcessed: number;
  documentsFailed: number;
  hasPaidEntitlement: boolean;
}

export async function buildSaksbehandlerContext(
  supabase: SupabaseClient,
  caseId: string
): Promise<SaksbehandlerContext> {
  const { data: caseRow, error } = await supabase
    .from("cases")
    .select(
      "id, title, description, tax_period, tax_type, amount_kr, outcome, stage, status, next_action, next_action_reasoning, next_action_type"
    )
    .eq("id", caseId)
    .single();

  if (error || !caseRow) {
    throw new Error("Fant ikke saken.");
  }

  const [summary, documentation, entitlement, conflicts, timeline, documentsResult, gapsResult, reportsResult] =
    await Promise.all([
      summarizeCase(supabase, caseRow, true),
      getDocumentationSummary(supabase, caseId),
      getCaseEntitlement(supabase, caseId),
      getCaseConflicts(supabase, caseId),
      buildCaseTimeline(supabase, caseId, caseRow.tax_period),
      supabase
        .from("documents")
        .select("id, original_filename, ai_extraction, case_analysis")
        .eq("case_id", caseId)
        .eq("extraction_status", "done"),
      supabase
        .from("documentation_gaps")
        .select("id, description, importance, recommended_document")
        .eq("case_id", caseId)
        .eq("status", "open"),
      supabase.from("reports").select("type, created_at").eq("case_id", caseId).order("created_at", {
        ascending: false,
      }),
    ]);

  const documents: SaksbehandlerContextDocument[] = (documentsResult.data ?? []).map((d) => ({
    id: d.id as string,
    fileName: d.original_filename as string,
    documentType: (d.ai_extraction as { document_type?: string } | null)?.document_type ?? "annet",
    documentDate: (d.ai_extraction as { document_date?: string | null } | null)?.document_date ?? null,
    credibility: (d.case_analysis as { credibility?: "high" | "medium" | "low" } | null)?.credibility ?? null,
  }));

  const legalQuestions = await buildLegalQuestionsContext(supabase, caseId);

  return {
    caseTitle: caseRow.title,
    stage: caseRow.stage,
    status: caseRow.status,
    totalAmountKr: summary.total_amount_kr,
    documentedFacts: summary.top_documented_facts,
    gaps: (gapsResult.data ?? []).map((g) => ({
      id: g.id as string,
      description: g.description as string,
      importance: g.importance as string | null,
      recommendedDocument: g.recommended_document as string | null,
    })),
    openConflicts: conflicts
      .filter((c) => c.status === "open")
      .map((c) => ({
        id: c.id,
        statementA: c.claimA.statement,
        statementB: c.claimB.statement,
        reasoning: c.reasoning,
        clarifyingQuestion: c.clarifyingQuestion,
        recommendedDocument: c.recommendedDocument,
      })),
    documents,
    timelineEvents: timeline.events.map((e) => ({
      documentId: e.documentId,
      date: e.date,
      fileName: e.fileName,
      keyPoints: e.keyPoints,
    })),
    reports: (reportsResult.data ?? []).map((r) => ({ type: r.type as string, createdAt: r.created_at as string })),
    nextAction: caseRow.next_action
      ? {
          action: caseRow.next_action,
          reasoning: caseRow.next_action_reasoning ?? "",
          actionType: (caseRow.next_action_type ?? "provide_information") as NextActionType,
        }
      : null,
    applicableRules: summary.applicable_rules,
    legalQuestions,
    documentCount: documentation.documentCount,
    documentsBeingProcessed: documentation.extractingCount,
    documentsFailed: documentation.failedCount,
    hasPaidEntitlement: entitlement !== null,
  };
}

/**
 * Legal questions, each with the latest COMPLETED analysis run's sources
 * and synthesis -- never a running/failed run, which must never look like
 * a settled legal assessment. Separate queries joined in code (matching
 * getCaseConflicts's own pattern), not embedded PostgREST relations.
 */
async function buildLegalQuestionsContext(
  supabase: SupabaseClient,
  caseId: string
): Promise<SaksbehandlerContextLegalQuestion[]> {
  const { data: questions } = await supabase
    .from("legal_questions")
    .select("id, question")
    .eq("case_id", caseId);
  if (!questions || questions.length === 0) return [];

  const questionIds = questions.map((q) => q.id as string);
  const { data: completedRuns } = await supabase
    .from("legal_analysis_runs")
    .select("id, legal_question_id, created_at")
    .in("legal_question_id", questionIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const latestRunByQuestion = new Map<string, string>();
  for (const run of completedRuns ?? []) {
    const questionId = run.legal_question_id as string;
    if (!latestRunByQuestion.has(questionId)) {
      latestRunByQuestion.set(questionId, run.id as string);
    }
  }

  const runIds = [...latestRunByQuestion.values()];
  if (runIds.length === 0) {
    return questions.map((q) => ({
      question: q.question as string,
      hasCompletedAnalysis: false,
      ourAssessment: null,
      sources: [],
    }));
  }

  const [assessmentsResult, sourceLinksResult] = await Promise.all([
    supabase.from("legal_question_assessments").select("legal_analysis_run_id, our_assessment").in("legal_analysis_run_id", runIds),
    supabase
      .from("legal_question_sources")
      .select("legal_analysis_run_id, legal_source_id, locator_type, locator_value, bm_summary, relevance_reasoning, supports")
      .in("legal_analysis_run_id", runIds),
  ]);

  const assessmentByRun = new Map(
    (assessmentsResult.data ?? []).map((a) => [a.legal_analysis_run_id as string, a.our_assessment as string])
  );

  const sourceLinks = sourceLinksResult.data ?? [];
  const sourceIds = [...new Set(sourceLinks.map((s) => s.legal_source_id as string))];
  const { data: sourceRows } =
    sourceIds.length > 0
      ? await supabase.from("legal_sources").select("id, source_code, citation, source_type").in("id", sourceIds)
      : { data: [] };
  const sourceById = new Map((sourceRows ?? []).map((s) => [s.id as string, s]));

  const sourcesByRun = new Map<string, SaksbehandlerContextLegalSource[]>();
  for (const link of sourceLinks) {
    const runId = link.legal_analysis_run_id as string;
    const source = sourceById.get(link.legal_source_id as string);
    const list = sourcesByRun.get(runId) ?? [];
    list.push({
      citation: (source?.citation as string | null) ?? (source?.source_code as string | undefined) ?? "ukjent kilde",
      sourceType: (source?.source_type as string) ?? "annet",
      locator: link.locator_value as string | null,
      bmSummary: link.bm_summary as string,
      relevanceReasoning: link.relevance_reasoning as string,
      supports: link.supports as SaksbehandlerContextLegalSource["supports"],
    });
    sourcesByRun.set(runId, list);
  }

  return questions.map((q) => {
    const runId = latestRunByQuestion.get(q.id as string);
    return {
      question: q.question as string,
      hasCompletedAnalysis: !!runId,
      ourAssessment: runId ? (assessmentByRun.get(runId) ?? null) : null,
      sources: runId ? (sourcesByRun.get(runId) ?? []) : [],
    };
  });
}
