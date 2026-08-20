import { getUpgradeQuote } from "@/lib/products/entitlement";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

const PENDING_REUSE_WINDOW_MS = 30 * 60 * 1000;
const REUSABLE_STATUSES = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

export interface CreatePaymentIntentInput {
  caseId: string;
  userId: string;
  productCode: string;
  /** Server-stamped, never a client-supplied timestamp -- see the API
   * route's zod schema. The column is only ever written here, mirroring
   * createCheckout.ts's identical convention for the hosted-checkout path. */
  angrerettAccepted?: boolean;
}

export interface PaymentIntentResult {
  clientSecret: string;
  amountKr: number;
}

/**
 * Embedded-payment sibling of createCheckoutSession() (createCheckout.ts) --
 * same pricing/upgrade rules (getUpgradeQuote is still the only source of
 * truth), same purchases-row-then-webhook-completes lifecycle, same
 * pending-reuse window, just a PaymentIntent instead of a hosted Checkout
 * Session, so the Payment Element can render inline on /utsjekk instead of
 * redirecting to Stripe. The older createCheckoutSession() is untouched and
 * still used by the case-page PurchasePrompt flow.
 *
 * Called twice per real payment, both idempotent against the same pending
 * purchase row: once early (to fetch a clientSecret and render the payment
 * fields) and once more right before stripe.confirmPayment() is called
 * client-side, this time with angrerettAccepted:true, so consent is
 * recorded server-side at the moment payment is actually attempted rather
 * than merely typed into a checkbox.
 */
export async function createPaymentIntentForCase(
  input: CreatePaymentIntentInput
): Promise<PaymentIntentResult> {
  const supabase = createAdminClient();
  const quote = await getUpgradeQuote(supabase, input.caseId, input.productCode);
  if (!quote) throw new Error("Ukjent produkt.");
  if (quote.alreadyHasAccess) {
    throw new Error("Du har allerede tilgang til dette nivået eller høyere.");
  }
  if (quote.product.price_type !== "one_time" || quote.product.scope !== "case") {
    throw new Error("Dette produktet støttes ikke i denne kjøpsflyten ennå.");
  }

  const stripe = getStripeClient();

  const { data: pending } = await supabase
    .from("purchases")
    .select("id, stripe_payment_intent_id")
    .eq("case_id", input.caseId)
    .eq("product_code", input.productCode)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - PENDING_REUSE_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending?.stripe_payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(pending.stripe_payment_intent_id);
    if (REUSABLE_STATUSES.has(existing.status) && existing.client_secret) {
      // The quote is always recalculated fresh -- keep Stripe's amount in
      // sync in case entitlement changed since the intent was first created.
      if (existing.amount !== quote.costKr * 100) {
        await stripe.paymentIntents.update(existing.id, { amount: quote.costKr * 100 });
      }
      if (input.angrerettAccepted) {
        await supabase
          .from("purchases")
          .update({ angrerett_accepted_at: new Date().toISOString() })
          .eq("id", pending.id);
      }
      return { clientSecret: existing.client_secret, amountKr: quote.costKr };
    }
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
      angrerett_accepted_at: input.angrerettAccepted ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !purchase) throw new Error("Kunne ikke opprette kjøpet.");

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: quote.costKr * 100,
      currency: "nok",
      // Never a hardcoded payment_method_types list -- Stripe decides which
      // methods to actually offer based on what's enabled on the account,
      // so the UI never shows a payment option that isn't really supported.
      automatic_payment_methods: { enabled: true },
      metadata: {
        case_id: input.caseId,
        product_code: input.productCode,
        purchase_id: purchase.id,
      },
      description: `${quote.product.name} -- SkatteTap`,
    },
    { idempotencyKey: purchase.id }
  );

  await supabase
    .from("purchases")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", purchase.id);

  if (!paymentIntent.client_secret) throw new Error("Stripe returnerte ingen client secret.");
  return { clientSecret: paymentIntent.client_secret, amountKr: quote.costKr };
}
