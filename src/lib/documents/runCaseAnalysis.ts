import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentExtraction } from "@/lib/ai/documentExtraction";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
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
  userId?: string;
}

/**
 * The second, case-context-aware analysis pass for a document: how does it
 * relate to everything else already known about the case. Runs after the
 * document's own extraction + claim creation, so it can exclude the
 * document's own just-created claims and compare against everything that
 * existed before it. Callable both right after upload and later, as a
 * catch-up pass for a document that was uploaded before the case had
 * access to this analysis (see the catch-up API route) -- this function
 * itself doesn't know or care which.
 *
 * Own claim ids are read from the claims table (source_document_id),
 * never passed in by the caller: analyzeAndPersistDocument already has
 * them in memory from having just created them, but a catch-up call has
 * no such context, and re-deriving from the same source of truth both
 * callers already agree on is simpler than two ways to get the same list.
 *
 * Idempotency is a claim, not a database transaction: this atomically
 * claims documents.case_analysis (a conditional update that only succeeds
 * while it's still null) before doing anything else, so the same document
 * can never be processed twice concurrently -- the original upload-time
 * call can't race a later catch-up call, and calling this again on an
 * already-analyzed document is a safe no-op. The real result is only
 * written at the very end, after every gap/conflict/evidence-link insert
 * has succeeded, so "case_analysis is set" reliably means "this pass
 * fully completed," never "started." On any failure, everything this
 * attempt itself inserted is rolled back and the claim is released, so a
 * retry starts clean instead of duplicating a half-finished attempt's
 * gaps/conflicts.
 *
 * Best-effort by design -- a failure here must never fail the upload
 * itself, since the document and its own extracted facts are already
 * safely stored by the time this runs.
 */
export async function runDocumentCaseAnalysis(
  supabase: SupabaseClient,
  input: RunCaseAnalysisInput
): Promise<DocumentCaseAnalysisOutput | null> {
  const { data: claimed } = await supabase
    .from("documents")
    .update({ case_analysis: { _pending: true } })
    .eq("id", input.documentId)
    .is("case_analysis", null)
    .select("id");
  if (!claimed || claimed.length === 0) return null;

  const insertedGapIds: string[] = [];
  const insertedConflictIds: string[] = [];
  const insertedEvidenceLinkIds: string[] = [];
  const insertedAssessmentIds: string[] = [];

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
      throw new Error("Kunne ikke hente saksdata.");
    }

    const allClaims = claimsResult.value;
    const { data: otherDocuments } = documentsResult.value;

    const priorClaims = allClaims.filter((c) => c.source_document_id !== input.documentId);
    // Same claims query already fetched this document's own claims too --
    // no separate lookup needed, and the ordering (created_at ascending)
    // matches the order they were originally inserted in, i.e. the same
    // order as extraction.possible_facts.
    const ownClaimIds = allClaims
      .filter((c) => c.source_document_id === input.documentId)
      .map((c) => c.id);
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

    // Feed this document's own gaps into the same operative worklist that
    // Komplett sak's case-level gap analysis already writes to -- one
    // table, two sources, so the gaps list is populated from the first
    // uploaded document, not only after a Komplett sak purchase.
    for (const gap of output.documentGaps) {
      const { data, error } = await supabase
        .from("documentation_gaps")
        .insert({
          case_id: input.caseId,
          description: gap.description,
          suggested_action: gap.recommendedDocument
            ? `Last opp: ${gap.recommendedDocument}`
            : gap.description,
          importance: gap.importance,
          recommended_document: gap.recommendedDocument,
          source_document_id: input.documentId,
        })
        .select("id")
        .single();
      // Thrown, not silently skipped: a gap that failed to save must roll
      // back this whole pass, same as everything else it produced --
      // otherwise a retry could re-insert the gaps that DID succeed
      // alongside the ones that didn't, duplicating half of them.
      if (error || !data) throw error ?? new Error("Kunne ikke lagre dokumentasjonshull.");
      insertedGapIds.push(data.id as string);
    }

    for (const contradiction of output.contradictions) {
      const claim = priorClaims[contradiction.claimIndex - 1];
      const ownClaimId = ownClaimIds[contradiction.ownFactIndex - 1];
      // sanitizeAnalysisIndices already bounds-checked claimIndex against
      // priorClaims and ownFactIndex against possible_facts.length -- this
      // can only be undefined if ownClaimIds came back shorter than
      // possible_facts, which analyzeAndPersistDocument's own gating
      // (never calls this function unless every fact got a claim) should
      // rule out. Skip defensively rather than insert a broken pairing.
      if (!claim || !ownClaimId) continue;

      const reasoning = `"${input.fileName}" inneholder opplysninger som motsier dette.`;

      // Every insert below throws on failure -- a conflict pairing is only
      // ever meaningful as a complete set (link + assessment + conflict
      // row), and a retry must never find half of it already there.
      const { data: linkRow, error: linkError } = await supabase
        .from("evidence_links")
        .insert({ claim_id: claim.id, document_id: input.documentId, relationship: "contradicts" })
        .select("id")
        .single();
      if (linkError || !linkRow) throw linkError ?? new Error("Kunne ikke lagre bevis-kobling.");
      insertedEvidenceLinkIds.push(linkRow.id as string);

      const { data: assessRow, error: assessError } = await supabase
        .from("claim_assessments")
        .insert({ claim_id: claim.id, status: "conflicting", reasoning, assessed_by: "ai" })
        .select("id")
        .single();
      if (assessError || !assessRow) throw assessError ?? new Error("Kunne ikke lagre vurdering.");
      insertedAssessmentIds.push(assessRow.id as string);

      const { data: conflictRow, error: conflictError } = await supabase
        .from("case_conflicts")
        .insert({
          case_id: input.caseId,
          claim_a_id: claim.id,
          claim_b_id: ownClaimId,
          reasoning,
          clarifying_question: contradiction.clarifyingQuestion,
          recommended_document: contradiction.recommendedDocument,
        })
        .select("id")
        .single();
      if (conflictError || !conflictRow) throw conflictError ?? new Error("Kunne ikke lagre konflikt.");
      insertedConflictIds.push(conflictRow.id as string);
    }

    for (const claimIndex of output.supportsClaimIndices) {
      const claim = priorClaims[claimIndex - 1];
      if (!claim) continue;
      const { data: linkRow, error: linkError } = await supabase
        .from("evidence_links")
        .insert({ claim_id: claim.id, document_id: input.documentId, relationship: "supports" })
        .select("id")
        .single();
      if (linkError || !linkRow) throw linkError ?? new Error("Kunne ikke lagre bevis-kobling.");
      insertedEvidenceLinkIds.push(linkRow.id as string);
    }

    // Written last, on purpose -- see the docstring above.
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

    return output;
  } catch {
    if (insertedGapIds.length) await supabase.from("documentation_gaps").delete().in("id", insertedGapIds);
    if (insertedConflictIds.length) await supabase.from("case_conflicts").delete().in("id", insertedConflictIds);
    if (insertedEvidenceLinkIds.length)
      await supabase.from("evidence_links").delete().in("id", insertedEvidenceLinkIds);
    if (insertedAssessmentIds.length)
      await supabase.from("claim_assessments").delete().in("id", insertedAssessmentIds);
    await supabase
      .from("documents")
      .update({ case_analysis: null })
      .eq("id", input.documentId)
      .then(
        () => {},
        () => {}
      );
    return null;
  }
}
