import type { SupabaseClient } from "@supabase/supabase-js";
import { getClaimsWithStatus } from "./claimsWithStatus";

export interface ConflictClaimSide {
  claimId: string;
  statement: string;
  sourceDocumentId: string | null;
  sourceDocumentFileName: string | null;
}

export interface ConflictPair {
  claimA: ConflictClaimSide;
  claimB: ConflictClaimSide;
  reasoning: string;
}

/**
 * Pairs each conflicting claim with the specific claim from the
 * contradicting document that actually disagrees with it -- not just "this
 * claim is conflicting" but "A vs. B, and here is why". Best-effort: picks
 * the contradicting document's first own claim as the opposing statement,
 * since evidence_links records document-vs-claim contradiction, not
 * claim-vs-claim directly. Good enough to point the user at the right
 * documents; a dedicated conflict engine can refine the pairing later
 * without changing this function's shape.
 */
export async function getCaseConflicts(
  supabase: SupabaseClient,
  caseId: string
): Promise<ConflictPair[]> {
  const claims = await getClaimsWithStatus(supabase, caseId);
  const conflicting = claims.filter((c) => c.status === "conflicting");
  if (conflicting.length === 0) return [];

  const { data: contradictLinks } = await supabase
    .from("evidence_links")
    .select("claim_id, document_id")
    .eq("relationship", "contradicts")
    .in(
      "claim_id",
      conflicting.map((c) => c.id)
    );

  const documentIds = [...new Set((contradictLinks ?? []).map((l) => l.document_id as string))];
  if (documentIds.length === 0) return [];

  const { data: documents } = await supabase
    .from("documents")
    .select("id, original_filename")
    .in("id", documentIds);
  const documentById = new Map((documents ?? []).map((d) => [d.id as string, d.original_filename as string]));

  const claimsBySourceDocument = new Map<string, (typeof claims)[number]>();
  for (const c of claims) {
    if (c.source_document_id && !claimsBySourceDocument.has(c.source_document_id)) {
      claimsBySourceDocument.set(c.source_document_id, c);
    }
  }

  const pairs: ConflictPair[] = [];
  for (const link of contradictLinks ?? []) {
    const claimA = conflicting.find((c) => c.id === link.claim_id);
    const counterClaim = claimsBySourceDocument.get(link.document_id);
    if (!claimA || !counterClaim) continue;

    pairs.push({
      claimA: {
        claimId: claimA.id,
        statement: claimA.statement,
        sourceDocumentId: claimA.source_document_id,
        sourceDocumentFileName: claimA.source_document_id
          ? (documentById.get(claimA.source_document_id) ?? null)
          : null,
      },
      claimB: {
        claimId: counterClaim.id,
        statement: counterClaim.statement,
        sourceDocumentId: link.document_id,
        sourceDocumentFileName: documentById.get(link.document_id) ?? null,
      },
      reasoning: claimA.reasoning,
    });
  }

  return pairs;
}
