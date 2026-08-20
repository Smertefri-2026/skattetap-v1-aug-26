"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { stageOrder } from "./labels";
import type { CaseStage } from "./types";
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
