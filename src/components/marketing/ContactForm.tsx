"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";
import { TurnstileBox } from "./TurnstileBox";

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Bekreft at du er et menneske før du sender.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    setState("submitting");
    setError(null);

    const res = await fetch("/api/kontakt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        message: formData.get("message"),
        turnstileToken,
      }),
    });

    if (res.ok) {
      setState("success");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Noe gikk galt. Prøv igjen.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6 text-[14.5px] text-success-ink">
        Meldingen er sendt. Vi svarer så snart vi kan.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="text-[13px] font-medium text-ink">
          Navn
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-[13px] font-medium text-ink">
          E-post
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="message" className="text-[13px] font-medium text-ink">
          Melding
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>

      <TurnstileBox
        onVerify={setTurnstileToken}
        onExpire={() => setTurnstileToken(null)}
      />

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sender..." : "Send melding"}
      </Button>
    </form>
  );
}
