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
    documentCount: documentation.documentCount,
    documentsBeingProcessed: documentation.extractingCount,
    documentsFailed: documentation.failedCount,
    hasPaidEntitlement: entitlement !== null,
  };
}
