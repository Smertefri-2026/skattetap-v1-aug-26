import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseEntitlement } from "@/lib/products/entitlement";
import { getCaseConflicts } from "./conflicts";
import { getClaimsWithStatus } from "./claimsWithStatus";
import { nextActionEngine } from "./nextActionEngine";

/**
 * Recomputes "neste anbefalte handling" and stores it directly on the
 * case row -- current state, not history, same as documents.case_analysis.
 * Called at the points the case actually changes (document analyzed, gap
 * resolved/reopened, claim confirmed/corrected/added) rather than on every
 * page view, so viewing a case stays fast and cheap. Best-effort: a
 * failure here must never break the caller's own action.
 */
export async function refreshNextAction(
  supabase: SupabaseClient,
  caseId: string,
  userId?: string
): Promise<void> {
  try {
    // allSettled, each entry wrapped in its own async IIFE: with five
    // independently-fallible queries, Promise.all only attaches a handler
    // to whichever rejects first, and a synchronous throw while building
    // one query's chain can orphan an already-invoked sibling before
    // Promise.all/allSettled ever sees the array. Both gotchas already
    // bit runDocumentCaseAnalysis once; applying the same fix here
    // preemptively rather than waiting to hit it again.
    const results = await Promise.allSettled([
      (async () => supabase.from("cases").select("title").eq("id", caseId).single())(),
      (async () => getClaimsWithStatus(supabase, caseId))(),
      (async () => getCaseConflicts(supabase, caseId))(),
      (async () => getCaseEntitlement(supabase, caseId))(),
      (async () =>
        supabase
          .from("documentation_gaps")
          .select("description, importance")
          .eq("case_id", caseId)
          .eq("status", "open"))(),
    ]);

    if (results.some((r) => r.status === "rejected")) return;

    const [caseResult, claimsResult, conflictsResult, entitlementResult, gapsResult] = results as [
      PromiseFulfilledResult<{ data: { title: string } | null }>,
      PromiseFulfilledResult<Awaited<ReturnType<typeof getClaimsWithStatus>>>,
      PromiseFulfilledResult<Awaited<ReturnType<typeof getCaseConflicts>>>,
      PromiseFulfilledResult<Awaited<ReturnType<typeof getCaseEntitlement>>>,
      PromiseFulfilledResult<{ data: { description: string; importance: string | null }[] | null }>,
    ];

    const caseRow = caseResult.value.data;
    const claims = claimsResult.value;
    const conflicts = conflictsResult.value;
    const entitlement = entitlementResult.value;
    const gaps = gapsResult.value.data;

    if (!caseRow) return;

    const currentTier = entitlement?.name ?? "Enkel sjekk";
    let hasReportForCurrentTier = false;
    if (entitlement) {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("type", entitlement.product_code);
      hasReportForCurrentTier = (count ?? 0) > 0;
    } else {
      const { count } = await supabase
        .from("case_assessments")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId)
        .eq("kind", "enkel-sjekk");
      hasReportForCurrentTier = (count ?? 0) > 0;
    }

    const result = await nextActionEngine(
      {
        caseTitle: caseRow.title,
        documentedFacts: claims.filter((c) => c.status === "documented").map((c) => c.statement),
        undocumentedFacts: claims.filter((c) => c.status === "undocumented").map((c) => c.statement),
        conflicts: conflicts.map((c) => ({ statementA: c.claimA.statement, statementB: c.claimB.statement })),
        openGaps: (gaps ?? []).map((g) => ({
          description: g.description,
          importance: g.importance ?? "Ikke spesifisert.",
        })),
        currentTier,
        hasReportForCurrentTier,
      },
      { supabase, caseId, userId }
    );

    await supabase
      .from("cases")
      .update({
        next_action: result.action,
        next_action_reasoning: result.reasoning,
        next_action_type: result.actionType,
        next_action_computed_at: new Date().toISOString(),
      })
      .eq("id", caseId);
  } catch {
    // Best-effort -- the caller's own action (upload, gap resolve, claim
    // confirm) has already succeeded regardless of whether this refresh
    // does.
  }
}
