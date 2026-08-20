"use client";

import { useState } from "react";
import { Button, PasswordField } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "done" | "error";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("De nye passordene er ikke like.");
      setState("error");
      return;
    }

    if (password.length < 8) {
      setError("Det nye passordet må være minst 8 tegn.");
      setState("error");
      return;
    }

    setState("submitting");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Fant ikke innlogget bruker. Prøv å logge inn på nytt.");
      setState("error");
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setError("Nåværende passord er feil.");
      setState("error");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Kunne ikke oppdatere passordet. Prøv igjen.");
      setState("error");
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setState("done");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField
        id="current-password"
        label="Nåværende passord"
        value={currentPassword}
        onChange={setCurrentPassword}
        required
        autoComplete="current-password"
      />

      <PasswordField
        id="account-new-password"
        label="Nytt passord"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
        autoComplete="new-password"
      />

      <PasswordField
        id="account-confirm-password"
        label="Bekreft nytt passord"
        value={confirmPassword}
        onChange={setConfirmPassword}
        required
        minLength={8}
        autoComplete="new-password"
      />

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}
      {state === "done" && (
        <p className="text-[13px] text-success-ink">Passordet er oppdatert.</p>
      )}

      <Button type="submit" disabled={state === "submitting"} className="self-start">
        {state === "submitting" ? "Oppdaterer..." : "Bytt passord"}
      </Button>
    </form>
  );
}
