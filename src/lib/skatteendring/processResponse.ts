import type { SupabaseClient } from "@supabase/supabase-js";
import { interpretSkatteetatenResponse } from "@/lib/ai/skatteetatenResponseInterpretation";
import { processDocumentUpload } from "@/lib/documents/processUpload";

const MODEL = "gpt-4.1-mini";

export interface ProcessResponseResult {
  documentId: string;
  interpreted: boolean;
  rejectionReason: string | null;
}

/**
 * Reuses the same document pipeline every upload goes through (storage,
 * text extraction, general evidence extraction), then runs one additional,
 * dedicated AI pass specifically to interpret what Skatteetaten's response
 * means for this case -- kept separate from the general document
 * extraction because the two ask fundamentally different questions of the
 * text.
 */
export async function processSkatteetatenResponse(
  supabase: SupabaseClient,
  input: { caseId: string; caseTitle: string; fileName: string; mimeType: string; bytes: ArrayBuffer }
): Promise<ProcessResponseResult> {
  const uploadResult = await processDocumentUpload(supabase, {
    caseId: input.caseId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });

  if (uploadResult.extractionStatus === "failed") {
    return {
      documentId: uploadResult.documentId,
      interpreted: false,
      rejectionReason: uploadResult.rejectionReason,
    };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("extracted_text")
    .eq("id", uploadResult.documentId)
    .single();
  if (!document?.extracted_text) {
    return { documentId: uploadResult.documentId, interpreted: false, rejectionReason: "Fant ingen tekst å tolke." };
  }

  const { data: latestProposal } = await supabase
    .from("reports")
    .select("content")
    .eq("case_id", input.caseId)
    .eq("type", "skatteendring")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const interpretation = await interpretSkatteetatenResponse({
    caseTitle: input.caseTitle,
    proposalSummary: latestProposal?.content?.reasoning ?? null,
    responseText: document.extracted_text,
  });

  await supabase.from("skatteetaten_responses").insert({
    case_id: input.caseId,
    document_id: uploadResult.documentId,
    interpretation,
    model: MODEL,
  });

  if (interpretation.detected_outcome !== "ukjent") {
    await supabase
      .from("cases")
      .update({ outcome: interpretation.detected_outcome })
      .eq("id", input.caseId);
  }

  return { documentId: uploadResult.documentId, interpreted: true, rejectionReason: null };
}
