import type { SupabaseClient } from "@supabase/supabase-js";
import { extractDocumentText } from "./extractDocumentText";
import { analyzeAndPersistDocument } from "./analyzeAndPersist";

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

  const result = await analyzeAndPersistDocument(supabase, {
    caseId: input.caseId,
    documentId: document.id,
    fileName: input.fileName,
    extractedText: textResult.text,
    userId: input.userId,
  });

  return {
    documentId: document.id,
    extractionStatus: result.status,
    rejectionReason: result.rejectionReason,
    claimsCreated: result.claimsCreated,
  };
}
