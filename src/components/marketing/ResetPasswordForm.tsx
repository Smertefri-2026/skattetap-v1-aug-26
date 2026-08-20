"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, PasswordField } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "done" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(
        "Kunne ikke oppdatere passordet. Prøv å be om en ny lenke."
      );
      setState("error");
      return;
    }

    setState("done");

    setTimeout(() => {
      router.push("/min-side");
      router.refresh();
    }, 1500);
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6 text-[14.5px] text-success-ink">
        Passordet er oppdatert. Du blir straks sendt videre til Min side.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField
        id="new-password"
        label="Nytt passord"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
        autoComplete="new-password"
      />

      <PasswordField
        id="confirm-new-password"
        label="Bekreft nytt passord"
        value={confirmPassword}
        onChange={setConfirmPassword}
        required
        minLength={8}
        autoComplete="new-password"
      />

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Oppdaterer..." : "Oppdater passord"}
      </Button>
    </form>
  );
}
