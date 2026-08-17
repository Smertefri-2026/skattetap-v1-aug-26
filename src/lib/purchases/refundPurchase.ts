import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

/**
 * Admin-initiated refund. Revokes the case_access it granted -- a refunded
 * purchase should not keep unlocking content. The purchase row itself is
 * kept (status changes to "refunded"), never deleted, so the history stays
 * intact for support/accounting.
 */
export async function refundPurchase(purchaseId: string): Promise<void> {
  const supabase = createAdminClient();
  const stripe = getStripeClient();

  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();
  if (error || !purchase) throw new Error("Fant ikke kjøpet.");
  if (purchase.status !== "completed") {
    throw new Error("Kun fullførte kjøp kan refunderes.");
  }
  if (!purchase.stripe_payment_intent_id) {
    throw new Error("Kjøpet mangler en Stripe-betaling å refundere.");
  }

  await stripe.refunds.create({ payment_intent: purchase.stripe_payment_intent_id });

  await supabase.from("purchases").update({ status: "refunded" }).eq("id", purchaseId);
  await supabase
    .from("case_access")
    .delete()
    .eq("case_id", purchase.case_id)
    .eq("product_code", purchase.product_code);
}
