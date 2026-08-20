"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCaseOwnership } from "@/lib/cases/assertCaseOwnership";
import { refreshNextAction } from "@/lib/cases/refreshNextAction";

export async function resolveDocumentationGap(caseId: string, formData: FormData) {
  const gapId = z.string().uuid().parse(formData.get("gapId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("documentation_gaps")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", gapId)
    .eq("case_id", caseId);
  await refreshNextAction(supabase, caseId);
  revalidatePath(`/min-side/saker/${caseId}`);
}

export async function reopenDocumentationGap(caseId: string, formData: FormData) {
  const gapId = z.string().uuid().parse(formData.get("gapId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("documentation_gaps")
    .update({ status: "open", resolved_at: null })
    .eq("id", gapId)
    .eq("case_id", caseId);
  await refreshNextAction(supabase, caseId);
  revalidatePath(`/min-side/saker/${caseId}`);
}
