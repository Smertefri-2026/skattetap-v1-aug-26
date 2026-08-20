"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCaseOwnership } from "./assertCaseOwnership";
import { refreshNextAction } from "./refreshNextAction";

/**
 * Confirming one side of a conflict never rewrites claim_assessments
 * history -- it appends a new assessment for each claim (documented for
 * the confirmed one, undocumented for the rejected one), same as every
 * other re-assessment in the Evidence Engine. The case_conflicts row is
 * what actually tracks "resolved", so refreshNextAction stops treating it
 * as an open issue.
 */
export async function resolveConflict(caseId: string, formData: FormData) {
  const conflictId = z.string().uuid().parse(formData.get("conflictId"));
  const chosenClaimId = z.string().uuid().parse(formData.get("chosenClaimId"));
  const rejectedClaimId = z.string().uuid().parse(formData.get("rejectedClaimId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase.from("claims").update({ confirmed_by_user: true }).eq("id", chosenClaimId);
  await supabase.from("claim_assessments").insert({
    claim_id: chosenClaimId,
    status: "documented",
    reasoning: "Bekreftet av brukeren som riktig i konfliktavklaring.",
    assessed_by: "system",
  });
  await supabase.from("claim_assessments").insert({
    claim_id: rejectedClaimId,
    status: "undocumented",
    reasoning: "Brukeren bekreftet i konfliktavklaring at den andre opplysningen er riktig i stedet.",
    assessed_by: "system",
  });

  await supabase
    .from("case_conflicts")
    .update({ status: "resolved", resolved_claim_id: chosenClaimId, resolved_at: new Date().toISOString() })
    .eq("id", conflictId)
    .eq("case_id", caseId);

  await refreshNextAction(supabase, caseId);
  revalidatePath(`/min-side/saker/${caseId}`);
}

export async function markConflictUnclear(caseId: string, formData: FormData) {
  const conflictId = z.string().uuid().parse(formData.get("conflictId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("case_conflicts")
    .update({ status: "marked_unclear" })
    .eq("id", conflictId)
    .eq("case_id", caseId);

  await refreshNextAction(supabase, caseId);
  revalidatePath(`/min-side/saker/${caseId}`);
}

export async function reopenConflict(caseId: string, formData: FormData) {
  const conflictId = z.string().uuid().parse(formData.get("conflictId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("case_conflicts")
    .update({ status: "open", resolved_claim_id: null, resolved_at: null })
    .eq("id", conflictId)
    .eq("case_id", caseId);

  await refreshNextAction(supabase, caseId);
  revalidatePath(`/min-side/saker/${caseId}`);
}
