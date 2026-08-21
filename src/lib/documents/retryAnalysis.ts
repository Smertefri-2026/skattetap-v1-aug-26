"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { assertCaseOwnership } from "@/lib/cases/assertCaseOwnership";
import { extractDocumentText } from "./extractDocumentText";
import { analyzeAndPersistDocument, clearDocumentAnalysisArtifacts } from "./analyzeAndPersist";

const retrySchema = z.object({
  caseId: z.string().uuid(),
  documentId: z.string().uuid(),
});

/**
 * "Prøv analyse på nytt": reuses extracted_text when a prior attempt
 * already got that far, and only re-downloads + re-extracts from Storage
 * when it's missing. Idempotent by construction, not by detecting what a
 * prior attempt already did: clearDocumentAnalysisArtifacts always runs
 * first, deleting this document's own claims (and, via cascade, their
 * evidence_links/claim_assessments/case_conflicts) plus any open gaps it
 * produced, so a retry after a full success, a partial failure, or a
 * complete failure all converge on the same clean starting point before
 * analyzeAndPersistDocument runs once. No branch here can leave duplicate
 * BM data behind, because nothing from a prior attempt survives to be
 * duplicated.
 */
export async function retryDocumentAnalysis(caseId: string, documentId: string): Promise<void> {
  const parsed = retrySchema.parse({ caseId, documentId });
  const user = await requireUser();
  const supabase = await assertCaseOwnership(parsed.caseId);

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, original_filename, mime_type, storage_path, extracted_text")
    .eq("id", parsed.documentId)
    .eq("case_id", parsed.caseId)
    .single();
  if (error || !document) throw new Error("Fant ikke dokumentet.");

  await clearDocumentAnalysisArtifacts(supabase, { documentId: document.id });
  await supabase
    .from("documents")
    .update({ extraction_status: "extracting", rejection_reason: null })
    .eq("id", document.id);

  let extractedText = document.extracted_text as string | null;

  if (!extractedText) {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileBlob) {
      await supabase
        .from("documents")
        .update({
          extraction_status: "failed",
          rejection_reason: "Kunne ikke hente dokumentet fra lagring. Last opp dokumentet på nytt.",
        })
        .eq("id", document.id);
      revalidatePath(`/min-side/saker/${parsed.caseId}`);
      return;
    }

    const textResult = await extractDocumentText({
      bytes: await fileBlob.arrayBuffer(),
      mimeType: document.mime_type,
      fileName: document.original_filename,
    });

    if (textResult.status !== "completed") {
      await supabase
        .from("documents")
        .update({ extraction_status: "failed", rejection_reason: textResult.error })
        .eq("id", document.id);
      revalidatePath(`/min-side/saker/${parsed.caseId}`);
      return;
    }

    extractedText = textResult.text;
  }

  await analyzeAndPersistDocument(supabase, {
    caseId: parsed.caseId,
    documentId: document.id,
    fileName: document.original_filename,
    extractedText,
    userId: user.id,
  });

  revalidatePath(`/min-side/saker/${parsed.caseId}`);
}
