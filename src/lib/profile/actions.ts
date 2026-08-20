"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(200),
  postal_code: z.string().trim().regex(/^\d{4}$/),
  city: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
});

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    address: formData.get("address"),
    postal_code: formData.get("postal_code"),
    city: formData.get("city"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect("/min-side?tab=profil&feil=ugyldige-opplysninger");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    redirect("/min-side?tab=profil&feil=kunne-ikke-lagre");
  }

  redirect("/min-side?tab=profil&lagret=1");
}

export async function updateMarketingConsent(formData: FormData) {
  const user = await requireUser();
  const consent = formData.get("marketing_consent") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      marketing_consent: consent,
      marketing_consent_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect("/min-side?tab=profil&feil=kunne-ikke-lagre");
  }

  redirect("/min-side?tab=profil&lagret=1");
}
