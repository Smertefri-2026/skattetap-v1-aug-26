import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { runDocumentCaseAnalysis } from "@/lib/documents/runCaseAnalysis";
import { refreshNextAction } from "@/lib/cases/refreshNextAction";
import { getCaseAnalysisProfile } from "@/lib/products/analysisProfile";
import { createClient } from "@/lib/supabase/server";
import type { DocumentExtraction } from "@/lib/ai/documentExtraction";

/**
 * Deliberately NOT part of the Stripe webhook: the webhook must stay fast,
 * idempotent, and only ever touch case_access/case_capacity_purchases.
 * Instead, the client triggers this once when it notices (from data the
 * server already sent down) that the case has documents whose case-level
 * analysis is missing under the now-current tier -- see
 * CatchUpAnalysisTrigger.tsx. Runs the newly-unlocked analysis on already-
 * stored extracted_text/ai_extraction/claims -- never re-extracts, never
 * re-calls analyzeDocument.
 *
 * Simplest robust choice available today: this codebase has no background
 * job queue, so this is a plain synchronous request the client waits out,
 * not a queued task. Documents are processed one at a time (not
 * Promise.all) to stay gentle on the AI API rather than fire a burst of
 * concurrent calls. A case with many pending documents (e.g. upgrading
 * from a tier that already held close to its ceiling) could in principle
 * run long enough to hit a serverless function's time limit -- known,
 * accepted for this version; revisit with real batching/pagination only
 * if it actually happens, not preemptively.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: caseId } = await params;

  const supabase = await createClient();
  const { data: caseRow } = await supabase.from("cases").select("id, user_id").eq("id", caseId).single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  const profile = await getCaseAnalysisProfile(supabase, caseId);
  if (!profile.runsCaseAnalysis) {
    return NextResponse.json({ processed: 0 });
  }

  const { data: pendingDocuments } = await supabase
    .from("documents")
    .select("id, original_filename, ai_extraction")
    .eq("case_id", caseId)
    .eq("extraction_status", "done")
    .is("case_analysis", null);

  let processed = 0;
  for (const doc of pendingDocuments ?? []) {
    const extraction = doc.ai_extraction as DocumentExtraction | null;
    // A "done" document should always have ai_extraction -- skip rather
    // than crash the loop over one unexpected row.
    if (!extraction) continue;

    const result = await runDocumentCaseAnalysis(supabase, {
      caseId,
      documentId: doc.id as string,
      fileName: doc.original_filename as string,
      extraction,
      userId: user.id,
    });
    if (result) processed += 1;
  }

  if (processed > 0) {
    await refreshNextAction(supabase, caseId, user.id);
  }

  return NextResponse.json({ processed });
}
