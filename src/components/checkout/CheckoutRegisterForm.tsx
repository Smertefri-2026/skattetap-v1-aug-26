"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, PasswordField } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "sent" | "error";

const inputClass =
  "mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary";
const labelClass = "text-[13px] font-medium text-ink";

/**
 * A deliberately shorter signup than RegisterForm -- name, email, password
 * only. Not a parallel auth system: same supabase.auth.signUp() call, same
 * emailRedirectTo/next double-encoding so the chosen product survives the
 * confirmation-email hop, same profiles trigger on the other end. Address/
 * postal code/city/phone are columns on `profiles` that stay nullable when
 * absent from raw_user_meta_data (confirmed against the handle_new_user
 * trigger before building this) -- they're meant to be filled in later on
 * Min konto, not required at checkout.
 */
export function CheckoutRegisterForm({ next }: { next?: string } = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passordene er ikke like.");
      setState("error");
      return;
    }
    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn.");
      setState("error");
      return;
    }

    setState("submitting");

    const confirmNext = next && next.startsWith("/") ? next : "/min-side";
    const postConfirmPath = `/konto-bekreftet?next=${encodeURIComponent(confirmNext)}`;

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(postConfirmPath)}`,
        data: {
          first_name: name,
          terms_accepted: termsAccepted,
        },
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        setError("Denne e-posten er allerede registrert. Prøv å logge inn i stedet.");
      } else {
        setError("Kunne ikke opprette konto. Prøv igjen.");
      }
      setState("error");
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Denne e-posten er allerede registrert. Prøv å logge inn i stedet.");
      setState("error");
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6 text-[14.5px] text-success-ink">
        Vi har sendt en bekreftelses-e-post til {email}. Klikk lenken der for å aktivere kontoen
        din -- du kommer rett tilbake hit med det valgte produktet.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="checkout-name" className={labelClass}>
          Navn
        </label>
        <input
          id="checkout-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="checkout-email" className={labelClass}>
          E-post
        </label>
        <input
          id="checkout-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PasswordField
          id="checkout-password"
          label="Passord"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordField
          id="checkout-confirm-password"
          label="Bekreft passord"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          required
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong"
        />
        <span>
          Jeg godtar{" "}
          <Link href="/vilkar" target="_blank" className="text-primary-ink hover:underline">
            vilkår
          </Link>{" "}
          og{" "}
          <Link href="/personvern" target="_blank" className="text-primary-ink hover:underline">
            personvernerklæring
          </Link>
        </span>
      </label>

      <p className="text-[12px] text-ink-faint">
        Adresse, postnummer, poststed og mobilnummer kan fylles inn senere på Min konto.
      </p>

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"} className="mt-1">
        {state === "submitting" ? "Oppretter konto..." : "Opprett konto og fortsett"}
      </Button>
    </form>
  );
}
