"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

async function assertCaseOwnership(caseId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    throw new Error("Fant ikke saken.");
  }
  return supabase;
}

export async function resolveDocumentationGap(caseId: string, formData: FormData) {
  const gapId = z.string().uuid().parse(formData.get("gapId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("documentation_gaps")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", gapId)
    .eq("case_id", caseId);
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
  revalidatePath(`/min-side/saker/${caseId}`);
}
