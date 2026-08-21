import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentExtraction } from "@/lib/ai/documentExtraction";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import { refreshNextAction } from "@/lib/cases/refreshNextAction";
import { runLegalAnalysis } from "@/lib/legal/runLegalAnalysis";
import {
  documentCaseAnalysisEngine,
  sanitizeAnalysisIndices,
  type DocumentCaseAnalysisOutput,
} from "./caseAnalysisEngine";

export interface RunCaseAnalysisInput {
  caseId: string;
  documentId: string;
  fileName: string;
  extraction: DocumentExtraction;
  /** Claim ids created from extraction.possible_facts, same order. Lets a
   * contradiction's own_fact_number resolve to the exact claim it means.
   * Always fully populated -- analyzeAndPersistDocument only calls this
   * function once every one of the document's own facts is confirmed
   * saved as a claim, so there is no missing-id case to handle here. */
  ownClaimIds: string[];
  userId?: string;
}

/**
 * The second, case-context-aware analysis pass for a document: how does it
 * relate to everything else already known about the case. Runs after the
 * document's own extraction + claim creation (processDocumentUpload), so
 * it can exclude the document's own just-created claims and compare
 * against everything that existed before it.
 *
 * Best-effort by design -- a failure here must never fail the upload
 * itself, since the document and its own facts are already safely stored
 * by the time this runs.
 */
export async function runDocumentCaseAnalysis(
  supabase: SupabaseClient,
  input: RunCaseAnalysisInput
): Promise<DocumentCaseAnalysisOutput | null> {
  try {
    // Promise.allSettled, not Promise.all: with two independently-fallible
    // queries, Promise.all only attaches a handler to whichever rejects
    // first -- if the other also rejects, that second rejection is
    // unhandled from Node's perspective even though this try/catch looks
    // like it covers it. Each entry is also wrapped in an async IIFE: if
    // building the query chain itself throws synchronously while the
    // array literal is being evaluated, the *other* entry (already
    // invoked, already a pending promise) never reaches Promise.allSettled
    // at all and is orphaned. Wrapping guarantees every entry is a real
    // promise before allSettled ever sees the array.
    const [claimsResult, documentsResult] = await Promise.allSettled([
      (async () => getClaimsWithStatus(supabase, input.caseId))(),
      (async () =>
        supabase
          .from("documents")
          .select("id, original_filename, ai_extraction")
          .eq("case_id", input.caseId)
          .neq("id", input.documentId)
          .eq("extraction_status", "done"))(),
    ]);

    if (claimsResult.status === "rejected" || documentsResult.status === "rejected") {
      return null;
    }

    const allClaims = claimsResult.value;
    const { data: otherDocuments } = documentsResult.value;

    const priorClaims = allClaims.filter((c) => c.source_document_id !== input.documentId);
    const otherDocs = (otherDocuments ?? []).map((d) => ({
      id: d.id as string,
      fileName: d.original_filename as string,
      documentType: (d.ai_extraction as DocumentExtraction | null)?.document_type ?? "annet",
      documentDate: (d.ai_extraction as DocumentExtraction | null)?.document_date ?? null,
    }));

    const rawOutput = await documentCaseAnalysisEngine(
      {
        newDocument: { fileName: input.fileName, extraction: input.extraction },
        existingClaims: priorClaims.map((c) => ({ statement: c.statement, status: c.status })),
        otherDocuments: otherDocs.map(({ fileName, documentType, documentDate }) => ({
          fileName,
          documentType,
          documentDate,
        })),
      },
      { supabase, caseId: input.caseId, userId: input.userId }
    );

    const output = sanitizeAnalysisIndices(
      rawOutput,
      priorClaims.length,
      otherDocs.length,
      input.extraction.possible_facts.length
    );

    await supabase
      .from("documents")
      .update({
        case_analysis: {
          key_points: output.keyPoints,
          credibility: output.credibility,
          credibility_reasoning: output.credibilityReasoning,
          related_document_ids: output.relatedDocumentIndices.map((i) => otherDocs[i - 1].id),
          document_gaps: output.documentGaps.map((g) => ({
            description: g.description,
            importance: g.importance,
            recommended_document: g.recommendedDocument,
          })),
          recommended_next_documents: output.recommendedNextDocuments,
        },
      })
      .eq("id", input.documentId);

    // Feed this document's own gaps into the same operative worklist that
    // Komplett sak's case-level gap analysis already writes to -- one
    // table, two sources, so the gaps list is populated from the first
    // uploaded document, not only after a Komplett sak purchase.
    for (const gap of output.documentGaps) {
      await supabase.from("documentation_gaps").insert({
        case_id: input.caseId,
        description: gap.description,
        suggested_action: gap.recommendedDocument
          ? `Last opp: ${gap.recommendedDocument}`
          : gap.description,
        importance: gap.importance,
        recommended_document: gap.recommendedDocument,
        source_document_id: input.documentId,
      });
    }

    for (const contradiction of output.contradictions) {
      const claim = priorClaims[contradiction.claimIndex - 1];
      const ownClaimId = input.ownClaimIds[contradiction.ownFactIndex - 1];
      const reasoning = `"${input.fileName}" inneholder opplysninger som motsier dette.`;

      await supabase.from("evidence_links").insert({
        claim_id: claim.id,
        document_id: input.documentId,
        relationship: "contradicts",
      });
      await supabase.from("claim_assessments").insert({
        claim_id: claim.id,
        status: "conflicting",
        reasoning,
        assessed_by: "ai",
      });

      await supabase.from("case_conflicts").insert({
        case_id: input.caseId,
        claim_a_id: claim.id,
        claim_b_id: ownClaimId,
        reasoning,
        clarifying_question: contradiction.clarifyingQuestion,
        recommended_document: contradiction.recommendedDocument,
      });
    }

    for (const claimIndex of output.supportsClaimIndices) {
      const claim = priorClaims[claimIndex - 1];
      await supabase.from("evidence_links").insert({
        claim_id: claim.id,
        document_id: input.documentId,
        relationship: "supports",
      });
    }

    await refreshNextAction(supabase, input.caseId, input.userId);

    // Best-effort, same as this whole function -- runLegalAnalysis never
    // throws itself, but the extra safety net costs nothing and keeps
    // this function's own success path unconditionally protected even if
    // that ever changes.
    await runLegalAnalysis(supabase, input.caseId, input.userId).catch(() => {});

    return output;
  } catch {
    // Best-effort enrichment -- the document and its own extracted facts
    // are already safely stored regardless of whether this second pass
    // succeeds.
    return null;
  }
}
