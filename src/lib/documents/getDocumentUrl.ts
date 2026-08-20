"use server";

import { z } from "zod";
import { assertCaseOwnership } from "@/lib/cases/assertCaseOwnership";

/**
 * Short-lived signed URL into the private "documents" storage bucket, so
 * the conflict workspace (and anywhere else that needs to let the user
 * open a source document) doesn't need its own download route. Ownership
 * is checked the same way every other case mutation checks it.
 */
export async function getDocumentDownloadUrl(caseId: string, documentId: string): Promise<string> {
  const parsedDocumentId = z.string().uuid().parse(documentId);
  const supabase = await assertCaseOwnership(caseId);

  const { data: document, error } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", parsedDocumentId)
    .eq("case_id", caseId)
    .single();
  if (error || !document) throw new Error("Fant ikke dokumentet.");

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 60);
  if (signError || !signed) throw new Error("Kunne ikke åpne dokumentet.");

  return signed.signedUrl;
}
