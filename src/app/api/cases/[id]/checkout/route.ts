import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createCheckoutSession } from "@/lib/purchases/createCheckout";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ productCode: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const returnPath = `/min-side/saker/${caseId}`;

  try {
    const url = await createCheckoutSession(supabase, {
      caseId,
      userId: user.id,
      productCode: parsed.data.productCode,
      successUrl: `${siteUrl}${returnPath}?checkout=success`,
      cancelUrl: `${siteUrl}${returnPath}?checkout=canceled`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunne ikke starte betaling.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
