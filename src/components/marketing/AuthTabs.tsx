"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { LoginPanel } from "./LoginPanel";
import { RegisterForm } from "./RegisterForm";

type Tab = "logg-inn" | "registrer";

export function AuthTabs({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      <div className="mb-8 flex gap-6 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("logg-inn")}
          className={cn(
            "pb-3 text-[14px] font-semibold",
            tab === "logg-inn"
              ? "border-b-2 border-primary text-ink"
              : "text-ink-faint hover:text-ink-soft"
          )}
        >
          Logg inn
        </button>
        <button
          type="button"
          onClick={() => setTab("registrer")}
          className={cn(
            "pb-3 text-[14px] font-semibold",
            tab === "registrer"
              ? "border-b-2 border-primary text-ink"
              : "text-ink-faint hover:text-ink-soft"
          )}
        >
          Registrer deg
        </button>
      </div>

      {tab === "logg-inn" ? <LoginPanel /> : <RegisterForm />}
    </div>
  );
}
