"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveSupportEscalation(formData: FormData) {
  await requireAdmin();
  const escalationId = z.string().uuid().parse(formData.get("escalationId"));

  const supabase = createAdminClient();
  await supabase
    .from("support_escalations")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", escalationId);

  revalidatePath("/admin/support");
}

export async function reopenSupportEscalation(formData: FormData) {
  await requireAdmin();
  const escalationId = z.string().uuid().parse(formData.get("escalationId"));

  const supabase = createAdminClient();
  await supabase
    .from("support_escalations")
    .update({ status: "open", resolved_at: null })
    .eq("id", escalationId);

  revalidatePath("/admin/support");
}
