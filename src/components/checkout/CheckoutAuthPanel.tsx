"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { LoginPanel } from "@/components/marketing/LoginPanel";
import { CheckoutRegisterForm } from "./CheckoutRegisterForm";

type Tab = "registrer" | "logg-inn";

/** Same tab shell as AuthTabs, wired to the lean CheckoutRegisterForm and
 * the existing LoginPanel/PasswordLoginForm -- no parallel login logic. */
export function CheckoutAuthPanel({ next }: { next?: string }) {
  const [tab, setTab] = useState<Tab>("registrer");

  return (
    <div>
      <div className="mb-6 flex gap-6 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("registrer")}
          className={cn(
            "pb-3 text-[14px] font-semibold",
            tab === "registrer" ? "border-b-2 border-primary text-ink" : "text-ink-faint hover:text-ink-soft"
          )}
        >
          Opprett konto
        </button>
        <button
          type="button"
          onClick={() => setTab("logg-inn")}
          className={cn(
            "pb-3 text-[14px] font-semibold",
            tab === "logg-inn" ? "border-b-2 border-primary text-ink" : "text-ink-faint hover:text-ink-soft"
          )}
        >
          Logg inn
        </button>
      </div>

      {tab === "registrer" ? <CheckoutRegisterForm next={next} /> : <LoginPanel next={next} />}
    </div>
  );
}
