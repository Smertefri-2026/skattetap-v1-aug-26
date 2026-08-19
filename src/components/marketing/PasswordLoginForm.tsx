"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "error";

export function PasswordLoginForm({
  onForgotPassword,
  onUseMagicLink,
}: {
  onForgotPassword: () => void;
  onUseMagicLink: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("email not confirmed")) {
        setError(
          "Du må bekrefte e-posten din før du kan logge inn. Sjekk innboksen din."
        );
      } else {
        setError("Feil e-post eller passord.");
      }
      setState("error");
      return;
    }

    router.push("/min-side");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="login-email" className="text-[13px] font-medium text-ink">
          E-post
        </label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-[13px] font-medium text-ink">
            Passord
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[12.5px] font-medium text-primary-ink hover:underline"
          >
            Glemt passord?
          </button>
        </div>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Logger inn..." : "Logg inn"}
      </Button>

      <button
        type="button"
        onClick={onUseMagicLink}
        className="text-center text-[12.5px] font-medium text-ink-soft hover:text-ink"
      >
        Bruk innloggingslenke på e-post i stedet
      </button>
    </form>
  );
}
