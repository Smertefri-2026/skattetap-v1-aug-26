"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

const requestRefundSchema = z.object({
  purchaseId: z.string().uuid(),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Refund requests live in their own refund_requests table (RLS: a user
 * can select/insert only their own rows; only admin, through the
 * service-role client, can change status or add admin_note). No Stripe
 * refund is issued here -- this only records the request for staff to
 * act on. A unique constraint on purchase_id means a second request for
 * the same purchase raises a Postgres unique-violation (23505), which is
 * treated as success rather than an error -- the customer just lands in
 * the same "already requested" state either way.
 */
export async function requestRefund(formData: FormData) {
  const user = await requireUser();
  const parsed = requestRefundSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Ugyldig forespørsel.");
  }

  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, user_id, case_id, status")
    .eq("id", parsed.data.purchaseId)
    .single();

  if (!purchase || purchase.user_id !== user.id || purchase.status !== "completed") {
    throw new Error("Fant ikke kjøpet.");
  }

  const { error } = await supabase.from("refund_requests").insert({
    user_id: user.id,
    purchase_id: purchase.id,
    case_id: purchase.case_id,
    reason: parsed.data.note ?? null,
  });

  if (error && error.code !== "23505") {
    throw new Error("Kunne ikke sende forespørselen. Prøv igjen senere.");
  }

  revalidatePath("/min-side");
}
