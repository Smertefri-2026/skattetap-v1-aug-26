import { getProductByCode } from "@/lib/products/catalog";
import { getUpgradeQuote } from "@/lib/products/entitlement";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

const PENDING_REUSE_WINDOW_MS = 30 * 60 * 1000;

export interface CreateCheckoutInput {
  caseId: string;
  userId: string;
  productCode: string;
  successUrl: string;
  cancelUrl: string;
  /** Server-stamped, never a client-supplied timestamp -- see the API
   * route's zod schema. Optional so the older case-page PurchasePrompt
   * flow (which doesn't collect this yet) keeps working unchanged. */
  angrerettAccepted?: boolean;
}

/**
 * Always charges the upgrade difference, never the full tier price, per the
 * "trinn-arv, kun mellomlegget" rule. Reuses a still-open Checkout Session
 * from the last 30 minutes instead of piling up abandoned Stripe sessions
 * every time a user reloads the purchase button (duplicate-payment
 * defense).
 *
 * Uses the service-role client throughout: the caller (the checkout API
 * route) has already verified the requesting user owns the case, and
 * `purchases` intentionally has no update policy for the authenticated role
 * (only the webhook may transition a purchase's status) -- so this
 * trusted, already-authorized server-side flow needs the admin client to do
 * its own bookkeeping writes, like stamping the Stripe session id.
 */
export async function createCheckoutSession(input: CreateCheckoutInput): Promise<string> {
  const supabase = createAdminClient();
  const product = await getProductByCode(supabase, input.productCode);
  if (!product) throw new Error("Ukjent produkt.");

  // Case-scoped, one-time checkout is all this flow implements today. A
  // future Skattetap+ subscription is account-scoped and recurring, which
  // needs its own checkout mode and its own (not yet built) entitlement
  // table -- this guard is the explicit point where that branches off,
  // instead of this flow silently mishandling a recurring/account product.
  if (product.price_type !== "one_time" || product.scope !== "case") {
    throw new Error("Dette produktet støttes ikke i denne kjøpsflyten ennå.");
  }

  let costKr: number;
  if (product.product_type === "capacity_addon") {
    // Add-ons are bought at full price and can be purchased more than once
    // on the same case -- "already has access" is a tier concept that
    // doesn't apply here (see case_capacity_purchases).
    costKr = product.price_kr;
  } else {
    const quote = await getUpgradeQuote(supabase, input.caseId, input.productCode);
    if (!quote) throw new Error("Ukjent produkt.");
    if (quote.alreadyHasAccess) {
      throw new Error("Du har allerede tilgang til dette nivået eller høyere.");
    }
    costKr = quote.costKr;
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
      amount_kr: costKr,
      idempotency_key: crypto.randomUUID(),
      status: "pending",
      angrerett_accepted_at: input.angrerettAccepted ? new Date().toISOString() : null,
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
            product_data: { name: product.name },
            unit_amount: costKr * 100,
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
