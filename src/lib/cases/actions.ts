"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { assertCaseOwnership } from "./assertCaseOwnership";
import { stageOrder } from "./labels";
import type { CaseStage } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createCaseSchema = z.object({
  title: z.string().trim().min(3).max(200),
  // Optional: set when the case is created from a specific product's
  // purchase-intent flow (e.g. the homepage's product ladder), so the new
  // case lands straight on that product's PurchaseGate instead of always
  // on Enkel sjekk. Invalid/missing values fall back to enkel-sjekk --
  // never trusted blindly since it arrives as a plain hidden field.
  steg: z.enum(stageOrder as [CaseStage, ...CaseStage[]]).optional(),
  // Where to land after creation. "case" (default) is the original
  // behaviour -- straight to the case's own PurchaseGate. "utsjekk" is for
  // the one-page checkout, which needs to stay on /utsjekk with the new
  // case selected instead of jumping to the case page.
  returnTo: z.enum(["case", "utsjekk"]).optional(),
});

export async function createCase(formData: FormData) {
  const user = await requireUser();
  const parsed = createCaseSchema.safeParse({
    title: formData.get("title"),
    steg: formData.get("steg") || undefined,
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/min-side?tab=saker&feil=ugyldig-tittel");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({ title: parsed.data.title, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/min-side?tab=saker&feil=kunne-ikke-opprette");
  }

  const steg = parsed.data.steg ?? "enkel-sjekk";
  if (parsed.data.returnTo === "utsjekk") {
    redirect(`/utsjekk?produkt=${steg}&sak=${data.id}`);
  }
  redirect(`/min-side/saker/${data.id}?steg=${steg}`);
}

// Case-level "Papirkurv": reuses the existing, previously-unused
// "arkivert" status value on cases.status instead of a new soft-delete
// column, so this never touches the schema. Restoring always lands back
// on "apen" -- the prior status isn't tracked, and "reopen as active" is
// the only sensible default for a case someone pulled out of the trash.
export async function archiveCase(caseId: string) {
  const supabase = await assertCaseOwnership(caseId);
  await supabase.from("cases").update({ status: "arkivert" }).eq("id", caseId);
  revalidatePath("/min-side");
}

export async function restoreCase(caseId: string) {
  const supabase = await assertCaseOwnership(caseId);
  await supabase.from("cases").update({ status: "apen" }).eq("id", caseId);
  revalidatePath("/min-side");
}

const deleteCaseSchema = z.object({
  caseId: z.string().uuid(),
  confirmTitle: z.string(),
});

/**
 * Irreversible. assertCaseOwnership does the authorization check with the
 * caller's own session/RLS first; the actual delete then switches to the
 * admin client on purpose -- most case-child tables (claims, reports,
 * conversations, ...) have no "delete" RLS policy for the authenticated
 * role, only documents does, so a cascade delete triggered by a regular
 * user's session would be blocked partway through by RLS on the other
 * tables. purchases.case_id is "on delete set null" (see the migration
 * this round), so purchase/receipt history survives; everything else
 * cascades away with the case. Storage objects don't cascade with the DB
 * row, so they're removed explicitly first.
 */
export async function deleteCasePermanently(formData: FormData) {
  const parsed = deleteCaseSchema.safeParse({
    caseId: formData.get("caseId"),
    confirmTitle: formData.get("confirmTitle"),
  });
  if (!parsed.success) throw new Error("Ugyldig forespørsel.");

  const ownershipCheck = await assertCaseOwnership(parsed.data.caseId);
  const { data: caseRow } = await ownershipCheck
    .from("cases")
    .select("title")
    .eq("id", parsed.data.caseId)
    .single();
  if (!caseRow || caseRow.title !== parsed.data.confirmTitle) {
    throw new Error("Saksnavnet stemte ikke. Saken ble ikke slettet.");
  }

  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("documents").list(parsed.data.caseId);
  if (files && files.length > 0) {
    await admin.storage.from("documents").remove(files.map((f) => `${parsed.data.caseId}/${f.name}`));
  }

  const { error } = await admin.from("cases").delete().eq("id", parsed.data.caseId);
  if (error) throw new Error("Kunne ikke slette saken.");

  revalidatePath("/min-side");
}
