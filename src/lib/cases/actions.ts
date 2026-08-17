"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

const createCaseSchema = z.object({
  title: z.string().trim().min(3).max(200),
});

export async function createCase(formData: FormData) {
  const user = await requireUser();
  const parsed = createCaseSchema.safeParse({ title: formData.get("title") });

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

  redirect(`/min-side/saker/${data.id}?steg=enkel-sjekk`);
}
