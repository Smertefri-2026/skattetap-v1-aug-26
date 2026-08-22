import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeDocument, type DocumentExtraction } from "@/lib/ai/documentExtraction";
import { refreshNextAction } from "@/lib/cases/refreshNextAction";
import { runLegalAnalysis } from "@/lib/legal/runLegalAnalysis";
import { getCaseAnalysisProfile } from "@/lib/products/analysisProfile";
import { runDocumentCaseAnalysis } from "./runCaseAnalysis";

export interface AnalyzeAndPersistInput {
  caseId: string;
  documentId: string;
  fileName: string;
  extractedText: string;
  userId?: string;
}

export interface AnalyzeAndPersistResult {
  status: "done" | "failed";
  rejectionReason: string | null;
  claimsCreated: number;
}

const ANALYSIS_FAILED_MESSAGE = "Vi klarte ikke å analysere dokumentet. Du kan prøve analysen på nytt.";
const PARTIAL_SAVE_MESSAGE = "Vi klarte ikke å lagre alle opplysningene fra dokumentet. Du kan prøve analysen på nytt.";

async function insertClaimWithRetry(
  supabase: SupabaseClient,
  payload: { case_id: string; statement: string; origin: string; source_document_id: string }
): Promise<string | null> {
  const ATTEMPTS = 3;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { data, error } = await supabase.from("claims").insert(payload).select("id").single();
    if (!error && data) return data.id as string;
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }
  return null;
}

/**
 * Clears every artifact a document's own analysis attempt could have
 * created. Used both to roll back a gating failure immediately (see
 * analyzeAndPersistDocument) and at the start of a retry, so a second
 * attempt can never leave duplicate claims/evidence/gaps behind regardless
 * of how far a prior attempt got.
 *
 * evidence_links/claim_assessments/case_conflicts tied to this document's
 * own claims cascade automatically once those claims are deleted -- only
 * rows that reference the document directly (not via a claim) need an
 * explicit delete here. Resolved documentation_gaps are deliberately left
 * alone: they represent a real, past user action, not an artifact of a
 * broken attempt, and a retry has no safe way to tell "resolved because it
 * was genuinely fixed" apart from "resolved by coincidence."
 */
export async function clearDocumentAnalysisArtifacts(
  supabase: SupabaseClient,
  input: { documentId: string }
): Promise<void> {
  await supabase.from("evidence_links").delete().eq("document_id", input.documentId);
  await supabase
    .from("documentation_gaps")
    .delete()
    .eq("source_document_id", input.documentId)
    .eq("status", "open");
  await supabase.from("claims").delete().eq("source_document_id", input.documentId);
}

/**
 * The one place a document's extracted text turns into claims, evidence,
 * assessments, and (if every one of its own facts was saved) the
 * case-context comparison pass. Shared by the original upload flow and the
 * "Prøv analyse på nytt" action, so neither can drift into its own
 * version of what analysis means -- one engine, not two.
 *
 * Gating, not a database transaction: contradiction/gap detection for this
 * document (runDocumentCaseAnalysis) only ever runs once every one of its
 * own facts is confirmed saved as a claim. A case_conflicts row always
 * means two real claims; if even one of this document's facts couldn't be
 * persisted after retry, the whole document is marked failed and whatever
 * it partially created is rolled back, rather than risking a conflict
 * paired with a claim that was never actually saved.
 */
export async function analyzeAndPersistDocument(
  supabase: SupabaseClient,
  input: AnalyzeAndPersistInput
): Promise<AnalyzeAndPersistResult> {
  try {
    const extraction: DocumentExtraction = await analyzeDocument({
      fileName: input.fileName,
      extractedText: input.extractedText,
    });

    await supabase
      .from("documents")
      .update({ extracted_text: input.extractedText, ai_extraction: extraction })
      .eq("id", input.documentId);

    // Aligned 1:1 with extraction.possible_facts (null where the insert
    // failed even after retry) so the case-context pass below can map its
    // own_fact_number references back to the exact claim it means.
    const ownClaimIds: (string | null)[] = [];
    let claimsCreated = 0;

    for (const fact of extraction.possible_facts) {
      const claimId = await insertClaimWithRetry(supabase, {
        case_id: input.caseId,
        statement: fact.statement,
        origin: "ai_suggested",
        source_document_id: input.documentId,
      });

      if (!claimId) {
        ownClaimIds.push(null);
        continue;
      }

      await supabase.from("evidence_links").insert({
        claim_id: claimId,
        document_id: input.documentId,
        relationship: "supports",
      });
      await supabase.from("claim_assessments").insert({
        claim_id: claimId,
        status: "documented",
        reasoning: `Funnet i "${input.fileName}" (KI-tillit: ${fact.confidence}).`,
        assessed_by: "system",
      });

      ownClaimIds.push(claimId);
      claimsCreated += 1;
    }

    const allFactsSaved = ownClaimIds.every((id) => id !== null);
    if (!allFactsSaved) {
      await clearDocumentAnalysisArtifacts(supabase, { documentId: input.documentId });
      await supabase
        .from("documents")
        .update({ extraction_status: "failed", rejection_reason: PARTIAL_SAVE_MESSAGE })
        .eq("id", input.documentId);
      return { status: "failed", rejectionReason: PARTIAL_SAVE_MESSAGE, claimsCreated: 0 };
    }

    await supabase
      .from("documents")
      .update({ extraction_status: "done", rejection_reason: null })
      .eq("id", input.documentId);

    // The orchestration point: the AI engines themselves (documentCase-
    // AnalysisEngine, legalQuestionEngine, legalSourceAnalysisEngine) never
    // know about products or tiers -- this is the one place that looks up
    // the case's analysis profile and decides what runs. Legal analysis
    // and next-action always run; full cross-document case analysis
    // (conflicts/gaps/credibility) only runs when the profile includes it.
    // All three are best-effort by design -- none of them throw, so none
    // of this can land in this function's own catch block.
    const profile = await getCaseAnalysisProfile(supabase, input.caseId);
    if (profile.runsCaseAnalysis) {
      await runDocumentCaseAnalysis(supabase, {
        caseId: input.caseId,
        documentId: input.documentId,
        fileName: input.fileName,
        extraction,
        userId: input.userId,
      }).catch(() => null);
    }
    await runLegalAnalysis(supabase, input.caseId, input.userId).catch(() => {});
    await refreshNextAction(supabase, input.caseId, input.userId);

    return { status: "done", rejectionReason: null, claimsCreated };
  } catch {
    // Covers analyzeDocument() itself failing, or an unexpected exception
    // during the evidence_links/claim_assessments inserts. Roll back
    // whatever this attempt managed to create -- a failed document must
    // never leave partial claims standing in for a complete analysis.
    await clearDocumentAnalysisArtifacts(supabase, { documentId: input.documentId }).catch(() => {});
    await supabase
      .from("documents")
      .update({
        extraction_status: "failed",
        extracted_text: input.extractedText,
        rejection_reason: ANALYSIS_FAILED_MESSAGE,
      })
      .eq("id", input.documentId)
      .then(
        () => {},
        () => {}
      );
    return { status: "failed", rejectionReason: ANALYSIS_FAILED_MESSAGE, claimsCreated: 0 };
  }
}
