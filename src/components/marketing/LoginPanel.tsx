"use client";

import { useState } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { PasswordLoginForm } from "./PasswordLoginForm";

type Mode = "password" | "forgot-password";

export function LoginPanel({ next }: { next?: string } = {}) {
  const [mode, setMode] = useState<Mode>("password");

  if (mode === "forgot-password") {
    return <ForgotPasswordForm onBack={() => setMode("password")} />;
  }

  return <PasswordLoginForm onForgotPassword={() => setMode("forgot-password")} next={next} />;
}
