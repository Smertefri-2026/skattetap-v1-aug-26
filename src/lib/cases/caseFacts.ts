import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentExtraction } from "@/lib/ai/documentExtraction";

export interface TimelineEntry {
  date: string;
  label: string;
  documentId: string;
}

export interface AmountEntry {
  label: string;
  amount_kr: number;
  documentId: string;
}

export interface CaseFacts {
  timeline: TimelineEntry[];
  parties: string[];
  amounts: AmountEntry[];
}

/** Tidslinje, parter og beløp are never their own tables -- they're always
 * derived from what the documents' AI extraction already found, so there's
 * no second place for this data to drift out of sync. */
export async function getCaseFacts(
  supabase: SupabaseClient,
  caseId: string
): Promise<CaseFacts> {
  const { data: documents } = await supabase
    .from("documents")
    .select("id, original_filename, ai_extraction")
    .eq("case_id", caseId)
    .not("ai_extraction", "is", null);

  const timeline: TimelineEntry[] = [];
  const partiesSet = new Set<string>();
  const amounts: AmountEntry[] = [];

  for (const doc of documents ?? []) {
    const extraction = doc.ai_extraction as DocumentExtraction | null;
    if (!extraction) continue;

    if (extraction.document_date) {
      timeline.push({
        date: extraction.document_date,
        label: `${doc.original_filename} (${extraction.document_type})`,
        documentId: doc.id,
      });
    }
    for (const party of extraction.parties ?? []) partiesSet.add(party);
    for (const amount of extraction.amounts ?? []) {
      amounts.push({ ...amount, documentId: doc.id });
    }
  }

  timeline.sort((a, b) => a.date.localeCompare(b.date));

  return { timeline, parties: [...partiesSet], amounts };
}
