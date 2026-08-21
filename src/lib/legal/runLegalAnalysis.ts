import type { SupabaseClient } from "@supabase/supabase-js";
import { getClaimsWithStatus, type ClaimWithStatus } from "@/lib/cases/claimsWithStatus";
import { indexClaims } from "@/lib/ai/komplettSak/shared";
import { legalQuestionEngine, sanitizeLegalQuestions } from "./legalQuestionEngine";
import {
  legalSourceAnalysisEngine,
  sanitizeLegalSourceAnalysis,
  type LegalSourceCandidate,
} from "./legalSourceAnalysisEngine";

const ENGINE_MODEL = "gpt-4.1-mini";
const PROMPT_VERSION = "v1";

interface CandidateSourceRow extends LegalSourceCandidate {
  id: string;
}

/**
 * Identifies which legal questions a case's facts raise, then runs a
 * source analysis for every question that doesn't yet have a completed
 * analysis run. Best-effort by design, same as runDocumentCaseAnalysis: a
 * failure here must never break the document pipeline that triggers it,
 * since claims/documents are already safely stored by the time this runs.
 *
 * Deliberately minimal for Fase B: questions are identified once per case
 * (skipped entirely if the case already has any), not re-derived as new
 * documents arrive, and a question is analyzed against sources exactly
 * once. Re-analysis -- e.g. after legal_sources gains a new verified
 * source, or genuinely new facts change a question -- is a real future
 * need, flagged here, not solved.
 */
export async function runLegalAnalysis(supabase: SupabaseClient, caseId: string, userId?: string): Promise<void> {
  try {
    const { data: caseRow } = await supabase
      .from("cases")
      .select("title, tax_type, description")
      .eq("id", caseId)
      .single();
    if (!caseRow) return;

    const claimsWithStatus = await getClaimsWithStatus(supabase, caseId);
    if (claimsWithStatus.length === 0) return;

    const indexedClaims = indexClaims(
      claimsWithStatus.map((c) => ({ statement: c.statement, origin: c.origin, status: c.status }))
    );

    const { data: existingQuestions } = await supabase
      .from("legal_questions")
      .select("id, question")
      .eq("case_id", caseId);

    let questions: { id: string; question: string }[] = existingQuestions ?? [];

    if (questions.length === 0) {
      const rawIdentification = await legalQuestionEngine(
        {
          caseTitle: caseRow.title as string,
          taxType: caseRow.tax_type as string,
          description: caseRow.description as string | null,
          claims: indexedClaims,
        },
        { supabase, caseId, userId }
      );
      const identification = sanitizeLegalQuestions(rawIdentification, indexedClaims);

      const created: { id: string; question: string }[] = [];
      for (const candidate of identification.questions) {
        const { data: inserted, error } = await supabase
          .from("legal_questions")
          .insert({ case_id: caseId, question: candidate.question })
          .select("id, question")
          .single();
        if (error || !inserted) continue;

        for (const claimIndex of candidate.claimIndices) {
          const claimId = claimsWithStatus[claimIndex - 1]?.id;
          if (!claimId) continue;
          await supabase
            .from("legal_question_claims")
            .insert({ legal_question_id: inserted.id, claim_id: claimId });
        }
        created.push(inserted as { id: string; question: string });
      }
      questions = created;
    }

    if (questions.length === 0) return;

    const { data: verifiedSources } = await supabase
      .from("legal_sources")
      .select("id, source_code, source_type, citation, topic, short_explanation")
      .eq("active", true)
      .eq("verification_status", "verified");

    const candidateSources: CandidateSourceRow[] = (verifiedSources ?? []).map((s) => ({
      id: s.id as string,
      sourceCode: s.source_code as string,
      sourceType: s.source_type as string,
      citation: s.citation as string | null,
      topic: s.topic as string,
      shortExplanation: s.short_explanation as string,
    }));

    for (const question of questions) {
      const { data: completedRun } = await supabase
        .from("legal_analysis_runs")
        .select("id")
        .eq("legal_question_id", question.id)
        .eq("status", "completed")
        .limit(1)
        .maybeSingle();
      if (completedRun) continue;

      await analyzeOneLegalQuestion(supabase, {
        caseId,
        userId,
        legalQuestionId: question.id,
        questionText: question.question,
        claimsWithStatus,
        candidateSources,
      });
    }
  } catch {
    // Best-effort, see file-level note.
  }
}

async function analyzeOneLegalQuestion(
  supabase: SupabaseClient,
  params: {
    caseId: string;
    userId?: string;
    legalQuestionId: string;
    questionText: string;
    claimsWithStatus: ClaimWithStatus[];
    candidateSources: CandidateSourceRow[];
  }
): Promise<void> {
  const { data: run, error: runError } = await supabase
    .from("legal_analysis_runs")
    .insert({
      legal_question_id: params.legalQuestionId,
      engine: "legal-source-analysis",
      model: ENGINE_MODEL,
      prompt_version: PROMPT_VERSION,
      status: "running",
    })
    .select("id")
    .single();
  if (runError || !run) return;

  try {
    const { data: relatedClaimRows } = await supabase
      .from("legal_question_claims")
      .select("claim_id")
      .eq("legal_question_id", params.legalQuestionId);
    const relatedIds = new Set((relatedClaimRows ?? []).map((r) => r.claim_id as string));
    const relatedClaimStatements = params.claimsWithStatus
      .filter((c) => relatedIds.has(c.id))
      .map((c) => c.statement);

    const rawResult = await legalSourceAnalysisEngine(
      { question: params.questionText, relatedClaimStatements, candidateSources: params.candidateSources },
      { supabase, caseId: params.caseId, userId: params.userId }
    );
    const result = sanitizeLegalSourceAnalysis(rawResult, params.candidateSources.length);

    for (const citation of result.sources) {
      const legalSourceId = params.candidateSources[citation.sourceIndex - 1]?.id;
      if (!legalSourceId) continue;
      await supabase.from("legal_question_sources").insert({
        legal_analysis_run_id: run.id,
        legal_source_id: legalSourceId,
        locator_type: citation.locatorType,
        locator_value: citation.locatorValue,
        bm_summary: citation.bmSummary,
        relevance_reasoning: citation.relevanceReasoning,
        supports: citation.supports,
      });
    }

    await supabase.from("legal_question_assessments").insert({
      legal_analysis_run_id: run.id,
      our_assessment: result.ourAssessment,
    });

    await supabase.from("legal_analysis_runs").update({ status: "completed" }).eq("id", run.id);
  } catch {
    // A failed run's rows (if any were written before the failure) simply
    // never surface -- consumers only ever read the latest COMPLETED run
    // for a question, so there's nothing to roll back.
    await supabase
      .from("legal_analysis_runs")
      .update({ status: "failed" })
      .eq("id", run.id)
      .then(
        () => {},
        () => {}
      );
  }
}
