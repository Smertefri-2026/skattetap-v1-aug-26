import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseConflicts } from "@/lib/cases/conflicts";
import { getDocumentationSummary } from "@/lib/cases/documentationSummary";
import { summarizeCase } from "@/lib/cases/crossCaseSummaries";
import { getCaseEntitlement } from "@/lib/products/entitlement";

/**
 * Everything Min saksbehandler is allowed to know about a case, in one
 * place. Deliberately built on `summarizeCase` (the same case-summarizing
 * logic Strategisk utredning already uses for cross-case analysis) rather
 * than a second, chat-specific query -- one source of truth for "what do
 * we know about this case," not two that can drift apart.
 */
export interface SaksbehandlerContext {
  caseTitle: string;
  stage: string;
  status: string;
  totalAmountKr: number;
  documentedFacts: string[];
  gaps: string[];
  openConflicts: { statementA: string; statementB: string; clarifyingQuestion: string }[];
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
    .select("id, title, description, tax_period, tax_type, amount_kr, outcome, stage, status")
    .eq("id", caseId)
    .single();

  if (error || !caseRow) {
    throw new Error("Fant ikke saken.");
  }

  const [summary, documentation, entitlement, conflicts] = await Promise.all([
    summarizeCase(supabase, caseRow, true),
    getDocumentationSummary(supabase, caseId),
    getCaseEntitlement(supabase, caseId),
    getCaseConflicts(supabase, caseId),
  ]);

  return {
    caseTitle: caseRow.title,
    stage: caseRow.stage,
    status: caseRow.status,
    totalAmountKr: summary.total_amount_kr,
    documentedFacts: summary.top_documented_facts,
    gaps: summary.key_gaps,
    openConflicts: conflicts
      .filter((c) => c.status === "open")
      .map((c) => ({
        statementA: c.claimA.statement,
        statementB: c.claimB.statement,
        clarifyingQuestion: c.clarifyingQuestion,
      })),
    applicableRules: summary.applicable_rules,
    documentCount: documentation.documentCount,
    documentsBeingProcessed: documentation.extractingCount,
    documentsFailed: documentation.failedCount,
    hasPaidEntitlement: entitlement !== null,
  };
}
