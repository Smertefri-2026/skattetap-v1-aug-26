"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "submitting" | "error";

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

export function PasswordLoginForm({
  onForgotPassword,
  next,
}: {
  onForgotPassword: () => void;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    router.push(next && next.startsWith("/") ? next : "/min-side");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="login-email"
          className="text-[13px] font-medium text-ink"
        >
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
          <label
            htmlFor="login-password"
            className="text-[13px] font-medium text-ink"
          >
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

        <div className="relative mt-1.5">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
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

      {error && <p className="text-[13px] text-danger-ink">{error}</p>}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Logger inn..." : "Logg inn"}
      </Button>
    </form>
  );
}