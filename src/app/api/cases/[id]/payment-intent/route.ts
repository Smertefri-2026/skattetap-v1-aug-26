import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createPaymentIntentForCase } from "@/lib/purchases/createPaymentIntent";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  productCode: z.string().min(1),
  angrerettAccepted: z.boolean().optional(),
});

/**
 * Sibling of /api/cases/[id]/checkout (hosted Stripe Checkout Session) --
 * same auth/ownership check, same zod shape, but returns a PaymentIntent
 * clientSecret for /utsjekk's embedded Payment Element instead of a
 * redirect URL. Same cookie-based session auth as the rest of the app
 * (requireUser() reads the session from cookies, which a same-origin
 * fetch() call already sends automatically -- no separate Bearer-token
 * auth transport needed here).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: caseId } = await params;

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }

  try {
    const result = await createPaymentIntentForCase({
      caseId,
      userId: user.id,
      productCode: parsed.data.productCode,
      angrerettAccepted: parsed.data.angrerettAccepted,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke klargjøre betaling.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
