import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getStripeClient } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: purchaseId } = await params;

  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, user_id, status, stripe_checkout_session_id, stripe_payment_intent_id")
    .eq("id", purchaseId)
    .single();

  if (!purchase || purchase.user_id !== user.id || purchase.status !== "completed") {
    return NextResponse.json({ error: "Fant ikke kvitteringen." }, { status: 404 });
  }

  const stripe = getStripeClient();
  let receiptUrl: string | null = null;

  if (purchase.stripe_payment_intent_id) {
    const intent = await stripe.paymentIntents.retrieve(purchase.stripe_payment_intent_id, {
      expand: ["latest_charge"],
    });
    const charge = intent.latest_charge;
    if (charge && typeof charge !== "string") receiptUrl = charge.receipt_url;
  } else if (purchase.stripe_checkout_session_id) {
    const session = await stripe.checkout.sessions.retrieve(purchase.stripe_checkout_session_id, {
      expand: ["payment_intent.latest_charge"],
    });
    const intent = session.payment_intent;
    if (intent && typeof intent !== "string") {
      const charge = intent.latest_charge;
      if (charge && typeof charge !== "string") receiptUrl = charge.receipt_url;
    }
  }

  if (!receiptUrl) {
    return NextResponse.json({ error: "Kvitteringen er ikke klar ennå. Prøv igjen om litt." }, { status: 404 });
  }

  return NextResponse.redirect(receiptUrl);
}
