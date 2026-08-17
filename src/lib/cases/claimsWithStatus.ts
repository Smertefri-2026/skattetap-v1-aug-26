import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimStatus = "documented" | "undocumented" | "conflicting";

export interface ClaimWithStatus {
  id: string;
  case_id: string;
  statement: string;
  ai_original_statement: string | null;
  origin: "user" | "ai_suggested";
  source_document_id: string | null;
  confirmed_by_user: boolean;
  created_at: string;
  status: ClaimStatus;
  reasoning: string;
}

/** Claims don't store their own status -- it's derived from the latest
 * row in claim_assessments (append-only), per the Evidence Engine rule
 * that a re-assessment must never erase the previous one. */
export async function getClaimsWithStatus(
  supabase: SupabaseClient,
  caseId: string
): Promise<ClaimWithStatus[]> {
  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (!claims || claims.length === 0) return [];

  const { data: assessments } = await supabase
    .from("claim_assessments")
    .select("*")
    .in(
      "claim_id",
      claims.map((c) => c.id)
    )
    .order("created_at", { ascending: true });

  const latestByClaimId = new Map<string, { status: ClaimStatus; reasoning: string }>();
  for (const a of assessments ?? []) {
    latestByClaimId.set(a.claim_id, { status: a.status, reasoning: a.reasoning });
  }

  return claims.map((c) => {
    const latest = latestByClaimId.get(c.id);
    return {
      ...c,
      status: latest?.status ?? "undocumented",
      reasoning: latest?.reasoning ?? "Ingen vurdering ennå.",
    };
  });
}
