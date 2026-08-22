import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductByCode } from "./catalog";
import { getCaseEntitlement } from "./entitlement";
import type { AnalysisProfile } from "./types";

export interface CaseAnalysisProfile {
  profile: AnalysisProfile;
  /** Whether runDocumentCaseAnalysis (cross-document conflicts, gaps,
   * credibility) should run for this case. Per-document fact extraction
   * and legal question/source analysis are unaffected by this -- they run
   * at every profile, including "basic". */
  runsCaseAnalysis: boolean;
}

/**
 * One central lookup, mirroring getCaseCapacity's shape -- the AI engines
 * themselves never know about products or tiers; only this function (and
 * its callers in the orchestration layer) do.
 */
export async function getCaseAnalysisProfile(
  supabase: SupabaseClient,
  caseId: string
): Promise<CaseAnalysisProfile> {
  const entitlement = await getCaseEntitlement(supabase, caseId);
  const tier = entitlement ?? (await getProductByCode(supabase, "enkel-sjekk"));
  const profile: AnalysisProfile = tier?.analysis_profile ?? "standard";
  return { profile, runsCaseAnalysis: profile !== "basic" };
}
