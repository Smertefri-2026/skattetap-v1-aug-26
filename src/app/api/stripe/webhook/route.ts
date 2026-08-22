import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getProductByCode } from "@/lib/products/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

/**
 * A tier unlocks a workbench and is never re-granted (case_access,
 * unique per case+product, upsert-ignore-duplicates). A capacity add-on
 * grants no workbench and must stack across repeat purchases, so it goes
 * to a different table entirely (case_capacity_purchases, plain insert,
 * no uniqueness) instead of forcing case_access to serve two purposes.
 */
async function grantPurchasedProduct(
  supabase: SupabaseClient,
  params: { caseId: string; productCode: string; purchaseId: string }
): Promise<void> {
  const product = await getProductByCode(supabase, params.productCode);

  if (product?.product_type === "capacity_addon") {
    await supabase.from("case_capacity_purchases").insert({
      case_id: params.caseId,
      product_code: params.productCode,
      purchase_id: params.purchaseId,
    });
    return;
  }

  await supabase
    .from("case_access")
    .upsert(
      { case_id: params.caseId, product_code: params.productCode, purchase_id: params.purchaseId },
      { onConflict: "case_id,product_code", ignoreDuplicates: true }
    );
}

/**
 * Sole source of truth for case_access. The client never grants itself
 * access -- only a signature-verified event from Stripe does, via the
 * service-role client (case_access has no insert policy for regular users).
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook er ikke konfigurert." }, { status: 503 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Ugyldig signatur." }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const purchaseId = session.metadata?.purchase_id;
    const caseId = session.metadata?.case_id;
    const productCode = session.metadata?.product_code;

    if (purchaseId && caseId && productCode) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("status")
        .eq("id", purchaseId)
        .single();

      // Idempotent against webhook retries: only act once.
      if (purchase && purchase.status !== "completed") {
        await supabase
          .from("purchases")
          .update({
            status: "completed",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", purchaseId);

        await grantPurchasedProduct(supabase, { caseId, productCode, purchaseId });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const purchaseId = session.metadata?.purchase_id;
    if (purchaseId) {
      await supabase
        .from("purchases")
        .update({ status: "canceled" })
        .eq("id", purchaseId)
        .eq("status", "pending");
    }
  }

  // Embedded Payment Element path (/utsjekk, createPaymentIntent.ts) --
  // same purchases-row-then-case_access-upsert shape as
  // checkout.session.completed above, just keyed off a PaymentIntent
  // instead of a Checkout Session.
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const purchaseId = paymentIntent.metadata?.purchase_id;
    const caseId = paymentIntent.metadata?.case_id;
    const productCode = paymentIntent.metadata?.product_code;

    if (purchaseId && caseId && productCode) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("status")
        .eq("id", purchaseId)
        .single();

      // Idempotent against webhook retries: only act once.
      if (purchase && purchase.status !== "completed") {
        await supabase
          .from("purchases")
          .update({
            status: "completed",
            stripe_payment_intent_id: paymentIntent.id,
            completed_at: new Date().toISOString(),
          })
          .eq("id", purchaseId);

        await grantPurchasedProduct(supabase, { caseId, productCode, purchaseId });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const paymentIntent = event.data.object;
    const purchaseId = paymentIntent.metadata?.purchase_id;
    if (purchaseId) {
      await supabase
        .from("purchases")
        .update({ status: event.type === "payment_intent.canceled" ? "canceled" : "failed" })
        .eq("id", purchaseId)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ received: true });
}
