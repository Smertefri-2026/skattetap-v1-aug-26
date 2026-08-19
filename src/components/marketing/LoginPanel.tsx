"use client";

import { useState } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { MagicLinkForm } from "./MagicLinkForm";
import { PasswordLoginForm } from "./PasswordLoginForm";

type Mode = "password" | "magic-link" | "forgot-password";

export function LoginPanel() {
  const [mode, setMode] = useState<Mode>("password");

  if (mode === "forgot-password") {
    return <ForgotPasswordForm onBack={() => setMode("password")} />;
  }

  if (mode === "magic-link") {
    return (
      <div className="flex flex-col gap-4">
        <MagicLinkForm />
        <button
          type="button"
          onClick={() => setMode("password")}
          className="text-center text-[12.5px] font-medium text-ink-soft hover:text-ink"
        >
          Logg inn med passord i stedet
        </button>
      </div>
    );
  }

  return (
    <PasswordLoginForm
      onForgotPassword={() => setMode("forgot-password")}
      onUseMagicLink={() => setMode("magic-link")}
    />
  );
}
