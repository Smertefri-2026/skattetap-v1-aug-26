import type { SupabaseClient } from "@supabase/supabase-js";

export interface TimelineEvent {
  documentId: string;
  fileName: string;
  date: string;
  documentType: string;
  keyPoints: string[];
  credibility: "high" | "medium" | "low" | null;
  hasConflict: boolean;
}

export interface CaseTimeline {
  events: TimelineEvent[];
  undatedDocumentCount: number;
  missingPeriodWarning: string | null;
}

interface DocumentRow {
  id: string;
  original_filename: string;
  ai_extraction: { document_type?: string; document_date?: string | null } | null;
  case_analysis: { key_points?: string[]; credibility?: "high" | "medium" | "low" } | null;
}

/**
 * Deterministic, no AI call -- dates and key points are already extracted
 * per document (ai_extraction / case_analysis), so building a timeline is
 * pure assembly: sort by date, flag which documents are tangled up in a
 * contradiction, flag whether the case's own stated tax year has no
 * documentation at all. Judgment (what the facts mean) stays with the AI
 * engines; this only orders and flags what's already known.
 */
export async function buildCaseTimeline(
  supabase: SupabaseClient,
  caseId: string,
  taxPeriod: string | null
): Promise<CaseTimeline> {
  const [{ data: documents }, { data: caseClaims }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, original_filename, ai_extraction, case_analysis")
      .eq("case_id", caseId)
      .eq("extraction_status", "done"),
    supabase.from("claims").select("id").eq("case_id", caseId),
  ]);

  const claimIds = (caseClaims ?? []).map((c) => c.id as string);
  const { data: conflictLinks } =
    claimIds.length > 0
      ? await supabase
          .from("evidence_links")
          .select("document_id")
          .eq("relationship", "contradicts")
          .in("claim_id", claimIds)
      : { data: [] };

  const conflictedDocumentIds = new Set(
    ((conflictLinks ?? []) as { document_id: string }[]).map((l) => l.document_id)
  );

  const rows = (documents ?? []) as DocumentRow[];
  const dated = rows.filter((d) => d.ai_extraction?.document_date);
  const undatedCount = rows.length - dated.length;

  const events: TimelineEvent[] = dated
    .map((d) => ({
      documentId: d.id,
      fileName: d.original_filename,
      date: d.ai_extraction!.document_date!,
      documentType: d.ai_extraction?.document_type ?? "annet",
      keyPoints: d.case_analysis?.key_points ?? [],
      credibility: d.case_analysis?.credibility ?? null,
      hasConflict: conflictedDocumentIds.has(d.id),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let missingPeriodWarning: string | null = null;
  const year = taxPeriod?.match(/\d{4}/)?.[0];
  if (year && rows.length > 0) {
    const hasDocumentInYear = events.some((e) => e.date.startsWith(year));
    if (!hasDocumentInYear) {
      missingPeriodWarning = `Ingen dokumenter er datert til skatteåret ${year} ennå.`;
    }
  }

  return { events, undatedDocumentCount: undatedCount, missingPeriodWarning };
}
