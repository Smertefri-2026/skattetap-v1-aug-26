import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";

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

        await supabase
          .from("case_access")
          .upsert(
            { case_id: caseId, product_code: productCode, purchase_id: purchaseId },
            { onConflict: "case_id,product_code", ignoreDuplicates: true }
          );
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

  return NextResponse.json({ received: true });
}
