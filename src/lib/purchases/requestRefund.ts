"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { hasExistingRefundRequest, REFUND_REQUEST_MARKER } from "./refundRequests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestRefundSchema = z.object({
  purchaseId: z.string().uuid(),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Refund requests reuse the existing contact_messages table (the same one
 * the public contact form writes to) instead of a new refund_requests
 * table -- there is no dedicated support inbox for these yet, so this is
 * a request that lands with staff for manual handling, never an
 * automatic refund. Uses the admin client because contact_messages has no
 * RLS policies for the authenticated role (by design, see its migration);
 * Turnstile is skipped since the caller is already an authenticated user,
 * not an anonymous form submission.
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
    .select("id, user_id, amount_kr, created_at, status, products(name), cases(title)")
    .eq("id", parsed.data.purchaseId)
    .single();

  if (!purchase || purchase.user_id !== user.id || purchase.status !== "completed") {
    throw new Error("Fant ikke kjøpet.");
  }

  const admin = createAdminClient();
  if (await hasExistingRefundRequest(admin, purchase.id)) {
    // Already requested -- treat as success so the UI just settles into
    // the same "requested" state instead of surfacing an error for what
    // isn't really a failure.
    return;
  }

  const productName = (purchase.products as unknown as { name: string } | null)?.name ?? "Produkt";
  const caseTitle = (purchase.cases as unknown as { title: string } | null)?.title ?? "Sak";
  const kjopsdato = new Date(purchase.created_at).toLocaleDateString("nb-NO");

  const lines = [
    REFUND_REQUEST_MARKER,
    `Kjøps-ID: ${purchase.id}`,
    `Produkt: ${productName}`,
    `Sak: ${caseTitle}`,
    `Kjøpt: ${kjopsdato}`,
    `Beløp: ${purchase.amount_kr} kr`,
  ];
  if (parsed.data.note) {
    lines.push("", "Melding fra kunde:", parsed.data.note);
  }

  const { error } = await admin.from("contact_messages").insert({
    name: user.email ?? "Ukjent bruker",
    email: user.email ?? "",
    message: lines.join("\n"),
  });

  if (error) {
    throw new Error("Kunne ikke sende forespørselen. Prøv igjen senere.");
  }

  revalidatePath("/min-side");
}
