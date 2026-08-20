import type { SupabaseClient } from "@supabase/supabase-js";

export type ConflictStatus = "open" | "resolved" | "marked_unclear";

export interface ConflictClaimSide {
  claimId: string;
  statement: string;
  sourceDocumentId: string | null;
  sourceDocumentFileName: string | null;
}

export interface ConflictPair {
  id: string;
  claimA: ConflictClaimSide;
  claimB: ConflictClaimSide;
  reasoning: string;
  clarifyingQuestion: string;
  recommendedDocument: string | null;
  status: ConflictStatus;
  resolvedClaimId: string | null;
  createdAt: string;
}

/**
 * Every conflict the Evidence Engine has ever detected for this case, each
 * pairing the exact two claims that disagree -- recorded precisely at
 * detection time (case_conflicts, written by runDocumentCaseAnalysis), not
 * approximated afterwards. Returns all statuses; callers that only care
 * about unresolved conflicts (e.g. refreshNextAction) filter for "open"
 * themselves, since the conflict workspace needs the full history too.
 */
export async function getCaseConflicts(supabase: SupabaseClient, caseId: string): Promise<ConflictPair[]> {
  const { data: conflicts } = await supabase
    .from("case_conflicts")
    .select("id, claim_a_id, claim_b_id, reasoning, clarifying_question, recommended_document, status, resolved_claim_id, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (!conflicts || conflicts.length === 0) return [];

  const claimIds = [...new Set(conflicts.flatMap((c) => [c.claim_a_id as string, c.claim_b_id as string]))];
  const { data: claims } = await supabase
    .from("claims")
    .select("id, statement, source_document_id")
    .in("id", claimIds);
  const claimById = new Map((claims ?? []).map((c) => [c.id as string, c]));

  const documentIds = [
    ...new Set((claims ?? []).map((c) => c.source_document_id as string | null).filter((id): id is string => !!id)),
  ];
  const { data: documents } = await supabase.from("documents").select("id, original_filename").in("id", documentIds);
  const documentById = new Map((documents ?? []).map((d) => [d.id as string, d.original_filename as string]));

  function toSide(claimId: string): ConflictClaimSide | null {
    const claim = claimById.get(claimId);
    if (!claim) return null;
    const sourceDocumentId = claim.source_document_id as string | null;
    return {
      claimId: claim.id as string,
      statement: claim.statement as string,
      sourceDocumentId,
      sourceDocumentFileName: sourceDocumentId ? (documentById.get(sourceDocumentId) ?? null) : null,
    };
  }

  const pairs: ConflictPair[] = [];
  for (const c of conflicts) {
    const claimA = toSide(c.claim_a_id as string);
    const claimB = toSide(c.claim_b_id as string);
    if (!claimA || !claimB) continue;

    pairs.push({
      id: c.id as string,
      claimA,
      claimB,
      reasoning: c.reasoning as string,
      clarifyingQuestion: c.clarifying_question as string,
      recommendedDocument: c.recommended_document as string | null,
      status: c.status as ConflictStatus,
      resolvedClaimId: c.resolved_claim_id as string | null,
      createdAt: c.created_at as string,
    });
  }

  return pairs;
}
