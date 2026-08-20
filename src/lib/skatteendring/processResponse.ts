import type { SupabaseClient } from "@supabase/supabase-js";
import { interpretSkatteetatenResponse } from "@/lib/ai/skatteetatenResponseInterpretation";
import { processDocumentUpload } from "@/lib/documents/processUpload";
import { refreshNextAction } from "@/lib/cases/refreshNextAction";

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

  // Skatteetatens egne dokumentasjonskrav går inn i den samme
  // documentation_gaps-arbeidslisten som resten av saken bruker -- ikke en
  // separat liste bare synlig inne i dette svaret -- slik at de dukker opp
  // i Levende saksbilde, Min saksbehandler og next_action som alt annet.
  for (const need of interpretation.new_documentation_needs) {
    await supabase.from("documentation_gaps").insert({
      case_id: input.caseId,
      description: need,
      suggested_action: need,
      importance: "Etterspurt av Skatteetaten i svar på henvendelsen.",
      source_document_id: uploadResult.documentId,
    });
  }

  await refreshNextAction(supabase, input.caseId);

  return { documentId: uploadResult.documentId, interpreted: true, rejectionReason: null };
}
