import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeDocument } from "@/lib/ai/documentExtraction";
import { extractDocumentText } from "./extractDocumentText";
import { runDocumentCaseAnalysis } from "./runCaseAnalysis";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
}

export interface ProcessUploadInput {
  caseId: string;
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
  userId?: string;
}

export interface ProcessUploadResult {
  documentId: string;
  extractionStatus: "done" | "failed";
  rejectionReason: string | null;
  claimsCreated: number;
}

/**
 * Full Evidence Engine intake for one uploaded document: store the file,
 * extract text, ask the AI to identify type/date/parties/amounts/facts, and
 * turn each candidate fact into its own claim + evidence link + assessment.
 * Every step that can fail leaves the document in a clear, visible state
 * instead of silently dropping data.
 */
export async function processDocumentUpload(
  supabase: SupabaseClient,
  input: ProcessUploadInput
): Promise<ProcessUploadResult> {
  const storagePath = `${input.caseId}/${crypto.randomUUID()}-${sanitizeFilename(input.fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, input.bytes, { contentType: input.mimeType });
  if (uploadError) throw new Error(`Kunne ikke laste opp filen: ${uploadError.message}`);

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      case_id: input.caseId,
      storage_path: storagePath,
      original_filename: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.bytes.byteLength,
      extraction_status: "extracting",
    })
    .select("id")
    .single();
  if (insertError || !document) throw new Error("Kunne ikke opprette dokumentrad.");

  const textResult = await extractDocumentText({
    bytes: input.bytes,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });

  if (textResult.status !== "completed") {
    await supabase
      .from("documents")
      .update({ extraction_status: "failed", rejection_reason: textResult.error })
      .eq("id", document.id);
    return {
      documentId: document.id,
      extractionStatus: "failed",
      rejectionReason: textResult.error,
      claimsCreated: 0,
    };
  }

  let claimsCreated = 0;
  let aiRejectionReason: string | null = null;

  try {
    const extraction = await analyzeDocument({
      fileName: input.fileName,
      extractedText: textResult.text,
    });

    await supabase
      .from("documents")
      .update({
        extraction_status: "done",
        extracted_text: textResult.text,
        ai_extraction: extraction,
      })
      .eq("id", document.id);

    // Aligned 1:1 with extraction.possible_facts (null where the insert
    // failed) so the case-context analysis pass below can map its
    // own_fact_number references back to the exact claim it means, instead
    // of guessing from insertion-order timestamps.
    const ownClaimIds: (string | null)[] = [];

    for (const fact of extraction.possible_facts) {
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .insert({
          case_id: input.caseId,
          statement: fact.statement,
          origin: "ai_suggested",
          source_document_id: document.id,
        })
        .select("id")
        .single();
      if (claimError || !claim) {
        ownClaimIds.push(null);
        continue;
      }

      await supabase.from("evidence_links").insert({
        claim_id: claim.id,
        document_id: document.id,
        relationship: "supports",
      });

      await supabase.from("claim_assessments").insert({
        claim_id: claim.id,
        status: "documented",
        reasoning: `Funnet i "${input.fileName}" (KI-tillit: ${fact.confidence}).`,
        assessed_by: "system",
      });

      ownClaimIds.push(claim.id);
      claimsCreated += 1;
    }

    await runDocumentCaseAnalysis(supabase, {
      caseId: input.caseId,
      documentId: document.id,
      fileName: input.fileName,
      extraction,
      ownClaimIds,
      userId: input.userId,
    });
  } catch {
    aiRejectionReason = "KI-analysen av dokumentet feilet. Teksten er likevel lagret.";
    await supabase
      .from("documents")
      .update({
        extraction_status: "done",
        extracted_text: textResult.text,
        rejection_reason: aiRejectionReason,
      })
      .eq("id", document.id);
  }

  return {
    documentId: document.id,
    extractionStatus: "done",
    rejectionReason: aiRejectionReason,
    claimsCreated,
  };
}
