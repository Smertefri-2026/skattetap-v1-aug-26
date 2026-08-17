import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
  turnstileToken: z.string().min(1),
});

export async function POST(req: Request) {
  const contactTo = process.env.CONTACT_EMAIL_TO;
  if (!contactTo || !process.env.TURNSTILE_SECRET_KEY) {
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

  const delivered = await sendEmail({
    to: contactTo,
    subject: `Ny henvendelse fra ${name}`,
    text: `Navn: ${name}\nE-post: ${email}\n\n${message}`,
    replyTo: email,
  });

  if (!delivered) {
    return NextResponse.json(
      { error: "Kunne ikke sende meldingen. Prøv igjen senere." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
