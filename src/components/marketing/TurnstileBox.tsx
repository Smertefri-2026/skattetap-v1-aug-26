"use client";

import Script from "next/script";
import { useEffect, useId } from "react";

type TurnstileBoxProps = {
  onVerify?: (token: string) => void;
  onExpire?: () => void;
};

declare global {
  interface Window {
    [key: `turnstileCallback_${string}`]: ((token: string) => void) | undefined;
    [key: `turnstileExpireCallback_${string}`]: (() => void) | undefined;
  }
}

export function TurnstileBox({ onVerify, onExpire }: TurnstileBoxProps = {}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const rawId = useId();
  const callbackId = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const verifyCallbackName = `turnstileCallback_${callbackId}` as const;
  const expireCallbackName = `turnstileExpireCallback_${callbackId}` as const;

  useEffect(() => {
    window[verifyCallbackName] = (token: string) => onVerify?.(token);
    window[expireCallbackName] = () => onExpire?.();

    return () => {
      delete window[verifyCallbackName];
      delete window[expireCallbackName];
    };
  }, [verifyCallbackName, expireCallbackName, onVerify, onExpire]);

  if (!siteKey) {
    return (
      <div className="rounded-md border border-warning bg-warning-subtle p-3 text-[13px] text-warning-ink">
        Turnstile er ikke konfigurert (NEXT_PUBLIC_TURNSTILE_SITE_KEY
        mangler).
      </div>
    );
  }

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-theme="light"
        data-size="flexible"
        data-callback={verifyCallbackName}
        data-expired-callback={expireCallbackName}
      />
    </div>
  );
}
