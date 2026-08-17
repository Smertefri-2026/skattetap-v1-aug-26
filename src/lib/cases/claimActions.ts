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

export async function confirmClaim(caseId: string, formData: FormData) {
  const claimId = z.string().uuid().parse(formData.get("claimId"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase.from("claims").update({ confirmed_by_user: true }).eq("id", claimId);
  revalidatePath(`/min-side/saker/${caseId}`);
}

export async function correctClaim(caseId: string, formData: FormData) {
  const claimId = z.string().uuid().parse(formData.get("claimId"));
  const statement = z.string().trim().min(1).max(300).parse(formData.get("statement"));
  const supabase = await assertCaseOwnership(caseId);

  await supabase
    .from("claims")
    .update({ statement, confirmed_by_user: true })
    .eq("id", claimId);
  revalidatePath(`/min-side/saker/${caseId}`);
}

export async function addManualClaim(caseId: string, formData: FormData) {
  const statement = z.string().trim().min(3).max(300).parse(formData.get("statement"));
  const supabase = await assertCaseOwnership(caseId);

  const { data: claim, error } = await supabase
    .from("claims")
    .insert({ case_id: caseId, statement, origin: "user", confirmed_by_user: true })
    .select("id")
    .single();
  if (error || !claim) throw new Error("Kunne ikke lagre notatet.");

  await supabase.from("claim_assessments").insert({
    claim_id: claim.id,
    status: "undocumented",
    reasoning: "Brukerens eget notat, ikke koblet til dokumentasjon.",
    assessed_by: "system",
  });
  revalidatePath(`/min-side/saker/${caseId}`);
}
