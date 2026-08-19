"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "sent" | "error";

const inputClass =
  "mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary";
const passwordInputClass =
  "w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 pr-11 text-[14px] text-ink outline-none focus:border-primary";
const labelClass = "text-[13px] font-medium text-ink";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3 3.6" />
      <path d="M6.1 6.1C3.8 7.7 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3.1-.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

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

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/konto-bekreftet`,
        data: {
          first_name: firstName,
          last_name: lastName,
          address,
          postal_code: postalCode,
          city,
          phone,
          terms_accepted: termsAccepted,
          marketing_consent: marketingConsent,
        },
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        setError(
          "Denne e-posten er allerede registrert. Prøv å logge inn i stedet."
        );
      } else {
        setError("Kunne ikke opprette konto. Prøv igjen.");
      }
      setState("error");
      return;
    }

    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setError(
        "Denne e-posten er allerede registrert. Prøv å logge inn i stedet."
      );
      setState("error");
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6 text-[14.5px] text-success-ink">
        Vi har sendt en bekreftelses-e-post til {email}. Klikk lenken der for
        å aktivere kontoen din.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first-name" className={labelClass}>
            Fornavn
          </label>
          <input
            id="first-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="last-name" className={labelClass}>
            Etternavn
          </label>
          <input
            id="last-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          Adresse
        </label>
        <input
          id="address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-4">
        <div>
          <label htmlFor="postal-code" className={labelClass}>
            Postnummer
          </label>
          <input
            id="postal-code"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="city" className={labelClass}>
            Poststed
          </label>
          <input
            id="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Mobilnummer
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="register-email" className={labelClass}>
          E-post
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className={labelClass}>
            Passord
          </label>

          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={passwordInputClass}
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Skjul passord" : "Vis passord"}
              title={showPassword ? "Skjul passord" : "Vis passord"}
              className="absolute inset-y-0 right-3 flex items-center text-ink-soft transition-colors hover:text-ink"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            Bekreft passord
          </label>

          <div className="relative mt-1.5">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={passwordInputClass}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={
                showConfirmPassword ? "Skjul passord" : "Vis passord"
              }
              title={showConfirmPassword ? "Skjul passord" : "Vis passord"}
              className="absolute inset-y-0 right-3 flex items-center text-ink-soft transition-colors hover:text-ink"
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-3">
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
            <Link
              href="/vilkar"
              target="_blank"
              className="text-primary-ink hover:underline"
            >
              vilkår
            </Link>{" "}
            og{" "}
            <Link
              href="/personvern"
              target="_blank"
              className="text-primary-ink hover:underline"
            >
              personvernerklæring
            </Link>
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong"
          />
          <span>
            Jeg ønsker å motta nyheter, produktoppdateringer og tilbud fra
            Skattetap
          </span>
        </label>
      </div>

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button
        type="submit"
        disabled={state === "submitting"}
        className="mt-2"
      >
        {state === "submitting" ? "Oppretter konto..." : "Opprett konto"}
      </Button>
    </form>
  );
}