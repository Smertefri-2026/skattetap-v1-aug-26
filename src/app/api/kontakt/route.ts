import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
  turnstileToken: z.string().min(1),
});

export async function POST(req: Request) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Kontaktskjemaet er ikke konfigurert ennå." },
      { status: 503 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ugyldig utfylling av skjemaet." },
      { status: 400 }
    );
  }

  const { name, email, message, turnstileToken } = parsed.data;

  const humanVerified = await verifyTurnstileToken(turnstileToken);
  if (!humanVerified) {
    return NextResponse.json(
      { error: "Kunne ikke bekrefte at du er et menneske. Prøv igjen." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name, email, message });

  if (error) {
    return NextResponse.json(
      { error: "Kunne ikke lagre meldingen. Prøv igjen senere." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
