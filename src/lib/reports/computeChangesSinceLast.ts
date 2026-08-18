import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChangesSinceLast } from "./types";

/**
 * Entirely deterministic -- no AI call. "What's new" is a database
 * question (rows created/resolved after the previous report's
 * timestamp), not a judgment call, so it's computed in code the same way
 * the financial totals are.
 */
export async function computeChangesSinceLast(
  supabase: SupabaseClient,
  caseId: string
): Promise<ChangesSinceLast> {
  const { data: previousReport } = await supabase
    .from("reports")
    .select("id, created_at")
    .eq("case_id", caseId)
    .eq("type", "komplett-sak")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!previousReport) {
    return {
      has_previous: false,
      previous_generated_at: null,
      new_documents: [],
      new_gaps: [],
      resolved_gaps: [],
      new_conflicts: [],
      changed_assessments: [],
    };
  }

  const since = previousReport.created_at;

  const { data: caseClaims } = await supabase.from("claims").select("id").eq("case_id", caseId);
  const claimIds = (caseClaims ?? []).map((c) => c.id);

  const [{ data: newDocuments }, { data: newGaps }, { data: resolvedGaps }, { data: newAssessments }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("original_filename")
        .eq("case_id", caseId)
        .gt("uploaded_at", since),
      supabase
        .from("documentation_gaps")
        .select("description")
        .eq("case_id", caseId)
        .gt("created_at", since),
      supabase
        .from("documentation_gaps")
        .select("description")
        .eq("case_id", caseId)
        .not("resolved_at", "is", null)
        .gt("resolved_at", since),
      claimIds.length > 0
        ? supabase
            .from("claim_assessments")
            .select("status, claim_id, claims(statement)")
            .in("claim_id", claimIds)
            .gt("created_at", since)
        : Promise.resolve({ data: [] as { status: string; claim_id: string; claims: unknown }[] }),
    ]);

  const newConflicts = (newAssessments ?? [])
    .filter((a) => a.status === "conflicting")
    .map((a) => (a.claims as unknown as { statement: string } | null)?.statement)
    .filter((s): s is string => !!s);

  const changedAssessments = (newAssessments ?? [])
    .filter((a) => a.status !== "conflicting")
    .map((a) => {
      const statement = (a.claims as unknown as { statement: string } | null)?.statement;
      return statement ? `${statement}: nå ${a.status}` : null;
    })
    .filter((s): s is string => !!s);

  return {
    has_previous: true,
    previous_generated_at: previousReport.created_at,
    new_documents: (newDocuments ?? []).map((d) => d.original_filename),
    new_gaps: (newGaps ?? []).map((g) => g.description),
    resolved_gaps: (resolvedGaps ?? []).map((g) => g.description),
    new_conflicts: newConflicts,
    changed_assessments: changedAssessments,
  };
}
