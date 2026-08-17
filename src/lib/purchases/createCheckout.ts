import type { SupabaseClient } from "@supabase/supabase-js";
import { getUpgradeQuote } from "@/lib/products/entitlement";
import { getStripeClient } from "@/lib/stripe/client";

const PENDING_REUSE_WINDOW_MS = 30 * 60 * 1000;

export interface CreateCheckoutInput {
  caseId: string;
  userId: string;
  productCode: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Always charges the upgrade difference, never the full tier price, per the
 * "trinn-arv, kun mellomlegget" rule. Reuses a still-open Checkout Session
 * from the last 30 minutes instead of piling up abandoned Stripe sessions
 * every time a user reloads the purchase button (duplicate-payment
 * defense).
 */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  input: CreateCheckoutInput
): Promise<string> {
  const quote = await getUpgradeQuote(supabase, input.caseId, input.productCode);
  if (!quote) throw new Error("Ukjent produkt.");
  if (quote.alreadyHasAccess) {
    throw new Error("Du har allerede tilgang til dette nivået eller høyere.");
  }

  const stripe = getStripeClient();

  const { data: pending } = await supabase
    .from("purchases")
    .select("stripe_checkout_session_id")
    .eq("case_id", input.caseId)
    .eq("product_code", input.productCode)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - PENDING_REUSE_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending?.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(pending.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) return existing.url;
  }

  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      case_id: input.caseId,
      user_id: input.userId,
      product_code: input.productCode,
      amount_kr: quote.costKr,
      idempotency_key: crypto.randomUUID(),
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !purchase) throw new Error("Kunne ikke opprette kjøpet.");

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: { name: quote.product.name },
            unit_amount: quote.costKr * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        case_id: input.caseId,
        product_code: input.productCode,
        purchase_id: purchase.id,
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    { idempotencyKey: purchase.id }
  );

  await supabase
    .from("purchases")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", purchase.id);

  if (!session.url) throw new Error("Stripe returnerte ingen betalings-URL.");
  return session.url;
}
