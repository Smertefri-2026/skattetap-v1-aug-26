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

const updateRefundRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["open", "processing", "approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional(),
});

/**
 * Only sets status/admin_note -- never touches Stripe or issues a refund.
 * A real refund still has to be done manually in the Stripe dashboard;
 * this is purely the internal tracking record.
 */
export async function updateRefundRequest(formData: FormData) {
  await requireAdmin();
  const parsed = updateRefundRequestSchema.parse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    adminNote: formData.get("adminNote") || undefined,
  });

  const supabase = createAdminClient();
  await supabase
    .from("refund_requests")
    .update({ status: parsed.status, admin_note: parsed.adminNote ?? null })
    .eq("id", parsed.requestId);

  revalidatePath("/admin/refusjoner");
  revalidatePath("/min-side");
}
