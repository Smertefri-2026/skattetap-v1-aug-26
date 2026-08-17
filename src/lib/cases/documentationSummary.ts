import type { SupabaseClient } from "@supabase/supabase-js";

export interface DocumentationSummary {
  documentCount: number;
  extractingCount: number;
  failedCount: number;
  claimCount: number;
}

export async function getDocumentationSummary(
  supabase: SupabaseClient,
  caseId: string
): Promise<DocumentationSummary> {
  const [documents, extracting, failed, claims] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("case_id", caseId),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .eq("extraction_status", "extracting"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .eq("extraction_status", "failed"),
    supabase.from("claims").select("id", { count: "exact", head: true }).eq("case_id", caseId),
  ]);

  return {
    documentCount: documents.count ?? 0,
    extractingCount: extracting.count ?? 0,
    failedCount: failed.count ?? 0,
    claimCount: claims.count ?? 0,
  };
}
