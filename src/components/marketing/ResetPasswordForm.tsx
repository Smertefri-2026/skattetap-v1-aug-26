"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "done" | "error";

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

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      <div>
        <label
          htmlFor="new-password"
          className="text-[13px] font-medium text-ink"
        >
          Nytt passord
        </label>

        <div className="relative mt-1.5">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 pr-11 text-[14px] text-ink outline-none focus:border-primary"
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
        <label
          htmlFor="confirm-new-password"
          className="text-[13px] font-medium text-ink"
        >
          Bekreft nytt passord
        </label>

        <div className="relative mt-1.5">
          <input
            id="confirm-new-password"
            type={showConfirmPassword ? "text" : "password"}
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 pr-11 text-[14px] text-ink outline-none focus:border-primary"
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

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Oppdaterer..." : "Oppdater passord"}
      </Button>
    </form>
  );
}